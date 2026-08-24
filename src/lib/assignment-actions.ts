"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ActionState = { ok?: boolean; message?: string };

type StaffUser = { id: string; name: string; role: "ADMIN" | "TEACHER" | "STUDENT" };

function classHref(classroomId: string) {
  return `/classes/${classroomId}`;
}

async function ownedClassroom(teacher: StaffUser, classroomId: string) {
  return prisma.classroom.findFirst({
    where: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) },
    include: { course: true, members: true },
  });
}

async function notifyMembers(
  classroom: { id: string; members: { userId: string }[] },
  type: string,
  title: string,
  message: string,
  href: string,
) {
  if (classroom.members.length === 0) return;
  await prisma.notification.createMany({
    data: classroom.members.map((m) => ({ userId: m.userId, type, title, message, href })),
  });
}

export async function postAnnouncementAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const parsed = z
    .object({
      classroomId: z.string().min(1),
      title: z.string().min(3).max(200),
      body: z.string().min(1).max(4000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Tiêu đề hoặc nội dung thông báo không hợp lệ." };
  const classroom = await ownedClassroom(teacher, parsed.data.classroomId);
  if (!classroom) return { message: "Không tìm thấy lớp học." };

  const announcement = await prisma.announcement.create({
    data: { classroomId: classroom.id, authorId: teacher.id, title: parsed.data.title, body: parsed.data.body },
  });
  await writeAudit(teacher.id, "ANNOUNCEMENT_POSTED", "Announcement", announcement.id, { classroomId: classroom.id });
  await notifyMembers(classroom, "ANNOUNCEMENT", announcement.title, `${teacher.name}: ${announcement.body}`, classHref(classroom.id));
  revalidatePath("/teacher/classes");
  revalidatePath(classHref(classroom.id));
  return { ok: true, message: "Đã đăng thông báo." };
}

export async function createAssignmentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const base = z
    .object({
      classroomId: z.string().min(1),
      title: z.string().min(3).max(200),
      description: z.string().max(4000).optional().or(z.literal("")),
      dueAt: z.coerce.date(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!base.success) return { message: "Thông tin bài tập không hợp lệ (tiêu đề, hạn chót)." };
  const nodeIds = [
    ...new Set(
      formData
        .getAll("nodeId")
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ];
  if (nodeIds.length === 0) return { message: "Chọn ít nhất một bài học cho bài tập." };
  const classroom = await ownedClassroom(teacher, base.data.classroomId);
  if (!classroom) return { message: "Không tìm thấy lớp học." };

  const nodes = await prisma.lessonNode.findMany({
    where: {
      id: { in: nodeIds },
      status: "PUBLISHED",
      unit: { courseId: classroom.courseId, status: "PUBLISHED" },
    },
    orderBy: { orderIndex: "asc" },
  });
  if (nodes.length !== nodeIds.length) return { message: "Một số bài học không tồn tại hoặc chưa xuất bản." };

  const assignment = await prisma.assignment.create({
    data: {
      classroomId: classroom.id,
      createdBy: teacher.id,
      title: base.data.title,
      description: base.data.description || null,
      dueAt: base.data.dueAt,
      publishedAt: new Date(),
      nodes: { create: nodes.map((n, i) => ({ nodeId: n.id, orderIndex: i + 1 })) },
    },
  });
  await writeAudit(teacher.id, "ASSIGNMENT_CREATED", "Assignment", assignment.id, {
    classroomId: classroom.id,
    nodeIds,
    dueAt: base.data.dueAt.toISOString(),
  });
  await notifyMembers(
    classroom,
    "ASSIGNMENT",
    `Bài tập mới: ${assignment.title}`,
    `${teacher.name} vừa giao bài tập mới. Hãy hoàn thành trước hạn chót.`,
    classHref(classroom.id),
  );
  revalidatePath("/teacher/classes");
  revalidatePath(classHref(classroom.id));
  return { ok: true, message: "Đã giao bài tập." };
}

export async function closeAssignmentAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  const assignmentId = String(formData.get("assignmentId") || "");
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classroom: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) } },
  });
  if (!assignment) return;
  await prisma.assignment.update({ where: { id: assignment.id }, data: { status: "CLOSED", closedAt: new Date() } });
  await writeAudit(teacher.id, "ASSIGNMENT_CLOSED", "Assignment", assignment.id, { classroomId });
  revalidatePath("/teacher/classes");
  revalidatePath(classHref(classroomId));
}

export async function deleteAssignmentAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  const assignmentId = String(formData.get("assignmentId") || "");
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classroom: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) } },
  });
  if (!assignment) return;
  await prisma.assignment.delete({ where: { id: assignment.id } });
  await writeAudit(teacher.id, "ASSIGNMENT_DELETED", "Assignment", assignment.id, { classroomId, title: assignment.title });
  revalidatePath("/teacher/classes");
  revalidatePath(classHref(classroomId));
}

export async function scheduleSessionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const parsed = z
    .object({
      classroomId: z.string().min(1),
      title: z.string().min(3).max(200),
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) {
    return { message: "Thời gian lớp trực tiếp không hợp lệ (kết thúc phải sau bắt đầu)." };
  }
  if (parsed.data.startsAt <= new Date()) return { message: "Lớp trực tiếp phải được lên lịch cho tương lai." };
  const classroom = await ownedClassroom(teacher, parsed.data.classroomId);
  if (!classroom) return { message: "Không tìm thấy lớp học." };

  const session = await prisma.classSession.create({
    data: {
      classroomId: classroom.id,
      title: parsed.data.title,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      status: "SCHEDULED",
    },
  });
  await writeAudit(teacher.id, "SESSION_SCHEDULED", "ClassSession", session.id, { classroomId: classroom.id });
  await notifyMembers(
    classroom,
    "LIVE_SESSION",
    `Lớp trực tiếp: ${session.title}`,
    `${teacher.name} đã lên lịch lớp học trực tiếp. Link vào lớp sẽ hiển thị ở trang lớp.`,
    classHref(classroom.id),
  );
  revalidatePath("/teacher/classes");
  revalidatePath(classHref(classroom.id));
  return { ok: true, message: "Đã lên lịch lớp trực tiếp." };
}

export async function attachMaterialAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const parsed = z
    .object({
      classroomId: z.string().min(1),
      mediaAssetId: z.string().min(1),
      title: z.string().min(1).max(200),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Tên tài liệu không hợp lệ." };
  const classroom = await ownedClassroom(teacher, parsed.data.classroomId);
  if (!classroom) return { message: "Không tìm thấy lớp học." };
  const asset = await prisma.mediaAsset.findFirst({ where: { id: parsed.data.mediaAssetId, ownerId: teacher.id } });
  if (!asset) return { message: "Tệp không tồn tại hoặc không thuộc về bạn." };

  await prisma.classMaterial.create({
    data: { classroomId: classroom.id, mediaAssetId: asset.id, title: parsed.data.title, addedById: teacher.id },
  });
  await writeAudit(teacher.id, "MATERIAL_ATTACHED", "ClassMaterial", asset.id, { classroomId: classroom.id, title: parsed.data.title });
  revalidatePath("/teacher/classes");
  revalidatePath(classHref(classroom.id));
  return { ok: true, message: "Đã thêm tài liệu vào lớp." };
}
