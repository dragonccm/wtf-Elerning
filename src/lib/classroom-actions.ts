"use server";

import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/session";
import { sendClassInvitationEmail } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type ActionState = { ok?: boolean; message?: string; code?: string; password?: string };

function classCode() {
  return `WTF-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function classPassword() {
  return randomBytes(5).toString("base64url");
}

export async function createClassroomAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const parsed = z.object({
    courseId: z.string().min(1),
    name: z.string().min(3).max(100),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) return { message: "Thông tin hoặc thời hạn lớp không hợp lệ." };

  // Any published course can back a classroom — courses may be created by any
  // teacher/admin; the classroom's teacher is the person creating the class.
  const course = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, status: "PUBLISHED" },
  });
  if (!course) return { message: "Khóa học chưa được xuất bản." };

  const code = classCode();
  const password = classPassword();
  const classroom = await prisma.classroom.create({
    data: {
      courseId: course.id,
      teacherId: teacher.id,
      name: parsed.data.name,
      code,
      passwordHash: await bcrypt.hash(password, 10),
      status: "OPEN",
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    },
  });
  await writeAudit(teacher.id, "CLASSROOM_CREATED", "Classroom", classroom.id, { courseId: course.id });
  revalidatePath("/teacher/classes");
  return { ok: true, message: "Đã tạo lớp. Hãy lưu mật khẩu vì hệ thống chỉ hiển thị một lần.", code, password };
}

export async function joinClassroomAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "STUDENT") return { message: "Chỉ học viên được tham gia lớp." };
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const password = String(formData.get("password") || "");
  const classroom = await prisma.classroom.findUnique({ where: { code }, include: { course: true } });
  const now = new Date();
  if (!classroom || !["OPEN", "ACTIVE"].includes(classroom.status) || (classroom.endsAt && classroom.endsAt < now)) {
    return { message: "Mã lớp không tồn tại hoặc lớp đã đóng." };
  }
  if (classroom.lockedUntil && classroom.lockedUntil > now) return { message: "Lớp đang tạm khóa do nhập sai nhiều lần. Hãy thử lại sau." };
  if (!(await bcrypt.compare(password, classroom.passwordHash))) {
    const attempts = classroom.failedAttempts + 1;
    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { failedAttempts: attempts >= 5 ? 0 : attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null },
    });
    return { message: "Mã lớp hoặc mật khẩu không đúng." };
  }

  await prisma.$transaction([
    prisma.classroomMember.upsert({
      where: { classroomId_userId: { classroomId: classroom.id, userId: user.id } },
      create: { classroomId: classroom.id, userId: user.id }, update: {},
    }),
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: classroom.courseId } },
      create: { userId: user.id, courseId: classroom.courseId }, update: {},
    }),
    prisma.classroom.update({ where: { id: classroom.id }, data: { failedAttempts: 0, lockedUntil: null } }),
    prisma.classInvitation.updateMany({ where: { classroomId: classroom.id, email: user.email }, data: { status: "ACCEPTED", acceptedAt: now } }),
  ]);
  await writeAudit(user.id, "CLASSROOM_JOINED", "Classroom", classroom.id);
  revalidatePath("/courses");
  return { ok: true, message: `Đã tham gia ${classroom.name}.` };
}

export async function inviteStudentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!z.string().email().safeParse(email).success || !password) return { message: "Email hoặc mật khẩu lớp không hợp lệ." };
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) }, include: { course: true },
  });
  if (!classroom || !(await bcrypt.compare(password, classroom.passwordHash))) return { message: "Không tìm thấy lớp hoặc mật khẩu lớp không đúng." };
  const recipient = await prisma.user.findUnique({ where: { email } });
  const invitation = await prisma.classInvitation.create({
    data: { classroomId, senderId: teacher.id, recipientId: recipient?.id, email, expiresAt: classroom.endsAt },
  });
  if (recipient) await prisma.notification.create({
    data: { userId: recipient.id, type: "CLASS_INVITE", title: `Lời mời vào ${classroom.name}`, message: `${teacher.name} đã mời bạn tham gia lớp.`, href: "/courses/join" },
  });
  const result = await sendClassInvitationEmail({ to: email, teacherName: teacher.name, classroomName: classroom.name, code: classroom.code, password });
  await prisma.classInvitation.update({
    where: { id: invitation.id }, data: { status: result.status, error: result.error, sentAt: result.status === "SENT" ? new Date() : null },
  });
  revalidatePath("/teacher/classes");
  return { ok: result.status !== "FAILED", message: result.status === "SENT" ? "Đã gửi lời mời." : result.status === "SKIPPED_DEV" ? "Đã tạo lời mời; email đang ở chế độ dev." : `Không gửi được email: ${result.error}` };
}

export async function rotateClassroomPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) } });
  if (!classroom) return { message: "Không tìm thấy lớp học." };
  const password = classPassword();
  await prisma.classroom.update({ where: { id: classroom.id }, data: { passwordHash: await bcrypt.hash(password, 10), passwordVersion: { increment: 1 }, failedAttempts: 0, lockedUntil: null } });
  await writeAudit(teacher.id, "CLASSROOM_PASSWORD_ROTATED", "Classroom", classroom.id, { version: classroom.passwordVersion + 1 });
  return { ok: true, message: "Mật khẩu cũ đã bị vô hiệu hóa. Hãy lưu mật khẩu mới.", code: classroom.code, password };
}

export async function setClassroomPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) } });
  if (!classroom) return { message: "Không tìm thấy lớp học." };
  if (newPassword.length < 6 || newPassword.length > 40) return { message: "Mật khẩu cần từ 6 đến 40 ký tự." };
  await prisma.classroom.update({
    where: { id: classroom.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), passwordVersion: { increment: 1 }, failedAttempts: 0, lockedUntil: null },
  });
  await writeAudit(teacher.id, "CLASSROOM_PASSWORD_SET", "Classroom", classroom.id, { version: classroom.passwordVersion + 1 });
  return { ok: true, message: `Đã đặt mật khẩu mới cho lớp ${classroom.name}. Chia sẻ cho học viên để tham gia.` };
}

export async function addClassMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  const userId = String(formData.get("userId") || "");
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) },
    include: { course: { select: { id: true, title: true } } },
  });
  if (!classroom) return { message: "Không tìm thấy lớp học." };
  const student = await prisma.user.findFirst({ where: { id: userId, role: "STUDENT", isActive: true } });
  if (!student) return { message: "Học viên không tồn tại hoặc không còn hoạt động." };
  await prisma.$transaction([
    prisma.classroomMember.upsert({
      where: { classroomId_userId: { classroomId: classroom.id, userId: student.id } },
      create: { classroomId: classroom.id, userId: student.id },
      update: {},
    }),
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId: student.id, courseId: classroom.courseId } },
      create: { userId: student.id, courseId: classroom.courseId },
      update: {},
    }),
    prisma.classInvitation.updateMany({ where: { classroomId: classroom.id, email: student.email }, data: { status: "ACCEPTED", acceptedAt: new Date() } }),
  ]);
  await writeAudit(teacher.id, "CLASSROOM_MEMBER_ADDED", "Classroom", classroom.id, { userId: student.id });
  revalidatePath(`/teacher/classes/${classroom.id}`);
  return { ok: true, message: `Đã thêm ${student.name} vào lớp ${classroom.name}.` };
}

export async function closeClassroomAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const classroomId = String(formData.get("classroomId") || "");
  const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, ...(teacher.role === "ADMIN" ? {} : { teacherId: teacher.id }) } });
  if (!classroom) return;
  await prisma.classroom.update({ where: { id: classroom.id }, data: { status: "ENDED", endsAt: new Date() } });
  await writeAudit(teacher.id, "CLASSROOM_CLOSED", "Classroom", classroom.id);
  revalidatePath("/teacher/classes");
}

export async function submitCourseForReviewAction(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const courseId = String(formData.get("courseId") || "");
  const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: teacher.id, status: "DRAFT" }, include: { units: { include: { nodes: true } } } });
  if (!course || !course.units.some((unit) => unit.nodes.length > 0)) redirect("/teacher/content?error=incomplete");
  await prisma.course.update({ where: { id: courseId }, data: { status: "PENDING_REVIEW" } });
  await writeAudit(teacher.id, "COURSE_SUBMITTED", "Course", courseId);
  revalidatePath("/teacher/content");
  redirect("/teacher/content?ok=review");
}

export async function reviewCourseAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const courseId = String(formData.get("courseId") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim();
  if (!['approve', 'reject'].includes(decision)) return;
  await prisma.course.update({
    where: { id: courseId },
    data: decision === "approve"
      ? { status: "PUBLISHED", published: true, reviewerId: admin.id, reviewNote: note || null, publishedAt: new Date(), units: { updateMany: { where: {}, data: { status: "PUBLISHED" } } } }
      : { status: "DRAFT", published: false, reviewerId: admin.id, reviewNote: note || "Cần chỉnh sửa" },
  });
  if (decision === "approve") await prisma.lessonNode.updateMany({ where: { unit: { courseId } }, data: { status: "PUBLISHED" } });
  await writeAudit(admin.id, decision === "approve" ? "COURSE_APPROVED" : "COURSE_REJECTED", "Course", courseId, { note });
  revalidatePath("/admin/courses");
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: new Date() } });
  revalidatePath("/notifications");
}

export async function toggleUserActiveAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const userId = String(formData.get("userId") || "");
  if (userId === admin.id) return;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  await prisma.user.update({ where: { id: userId }, data: { isActive: !target.isActive, disabledAt: target.isActive ? new Date() : null } });
  await writeAudit(admin.id, target.isActive ? "USER_DISABLED" : "USER_ENABLED", "User", userId);
  revalidatePath("/admin/students"); revalidatePath("/admin/teachers");
}
