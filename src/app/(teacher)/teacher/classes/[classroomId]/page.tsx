import { closeAssignmentAction, deleteAssignmentAction } from "@/lib/assignment-actions";
import { getTeacherAssignmentBoard, type AssignmentStudentStatus } from "@/lib/classroom";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { deadlineLabel, formatDateTime } from "@/lib/utils";
import { AttachMaterialForm, CreateAssignmentForm, PostAnnouncementForm, ScheduleSessionForm } from "@/components/staff/ClassroomDetailForms";
import { AddMemberForm, SetClassPasswordForm, ShareClassCard } from "@/components/staff/ClassroomForms";
import { ClassSideTabs } from "@/components/staff/ClassSideTabs";
import { LiveRoom } from "@/components/live/LiveRoom";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CalendarClock } from "lucide-react";

type BoardRow = Awaited<ReturnType<typeof getTeacherAssignmentBoard>>[number];

const NODE_TYPE_LABELS: Record<string, string> = {
  VIDEO: "Video",
  FLASHCARD: "Flashcard",
  QUIZ: "Quiz",
  ESSAY: "Tự luận",
  MILESTONE: "Cột mốc",
};

const CLASSROOM_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  OPEN: "Đang mở",
  ACTIVE: "Đang hoạt động",
  ENDED: "Đã kết thúc",
  ARCHIVED: "Đã lưu trữ",
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Sắp diễn ra",
  LIVE: "Đang diễn ra",
  ENDED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

const STUDENT_STATUS_LABELS: Record<AssignmentStudentStatus, string> = {
  TO_DO: "Chưa nộp",
  TURNED_IN: "Đã nộp",
  LATE: "Chậm hạn",
};

const STUDENT_STATUS_CLASSES: Record<AssignmentStudentStatus, string> = {
  TO_DO: "bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]",
  TURNED_IN: "bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]",
  LATE: "bg-[color-mix(in_srgb,var(--md-error)_18%,white)] text-[var(--md-error)]",
};

const SESSION_STATUS_CLASSES: Record<string, string> = {
  SCHEDULED: "bg-[var(--md-secondary-container)] text-[var(--md-on-primary-container)]",
  LIVE: "bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]",
  ENDED: "bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]",
  CANCELLED: "bg-[color-mix(in_srgb,var(--md-error)_18%,white)] text-[var(--md-error)]",
};

export default async function TeacherClassroomDetailPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const user = await requireRole("TEACHER");
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, ...(user.role === "ADMIN" ? {} : { teacherId: user.id }) },
    include: { course: true, teacher: { select: { name: true } } },
  });
  if (!classroom) notFound();

  const [board, units, members, announcements, sessions, materials, assets] = await Promise.all([
    getTeacherAssignmentBoard(classroom.id),
    prisma.unit.findMany({
      where: { courseId: classroom.courseId, status: "PUBLISHED" },
      include: { nodes: { where: { status: "PUBLISHED" }, orderBy: { orderIndex: "asc" } } },
      orderBy: { orderIndex: "asc" },
    }),
    prisma.classroomMember.findMany({
      where: { classroomId: classroom.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.announcement.findMany({
      where: { classroomId: classroom.id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.classSession.findMany({
      where: { classroomId: classroom.id },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
    }),
    prisma.classMaterial.findMany({
      where: { classroomId: classroom.id },
      include: { mediaAsset: { select: { originalName: true } }, addedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mediaAsset.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const unitsWithNodes = units.filter((u) => u.nodes.length > 0);
  const nodeLabels = new Map(
    units.flatMap((u) => u.nodes.map((n) => [n.id, `${n.title} — ${NODE_TYPE_LABELS[n.type] ?? n.type}`] as const)),
  );

  // registered accounts the teacher can add directly (no password needed)
  const studentCandidates = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, id: { notIn: members.map((m) => m.userId) } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  const now = new Date();
  const nextSession = sessions.find((s) => s.status === "SCHEDULED" && s.startsAt >= now);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const shareUrl = `${h.get("x-forwarded-proto") === "https" ? "https" : "http"}://${host}/courses/join?code=${classroom.code}`;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/teacher/classes" className="text-sm font-bold text-[var(--md-primary)]">
          ← Quay về danh sách lớp
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--md-primary)]">TRANG QUẢN LÝ LỚP</p>
            <h1 className="mt-1 text-3xl font-extrabold">{classroom.name}</h1>
            <p className="mt-2 text-[var(--md-on-surface-variant)]">
              {classroom.course.title} · Mã <strong className="font-mono">{classroom.code}</strong> · {members.length} học viên · Giáo viên: {classroom.teacher.name}
            </p>
            {nextSession && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--md-secondary-container)] px-4 py-2 text-sm font-extrabold text-[var(--md-on-surface)]">
                <CalendarClock className="size-4" />
                Buổi học sắp tới: {nextSession.title} — {formatDateTime(nextSession.startsAt)}
              </p>
            )}
          </div>
          <span className="md-chip">{CLASSROOM_STATUS_LABELS[classroom.status] ?? classroom.status}</span>
        </div>
      </header>

      <ShareClassCard name={classroom.name} code={classroom.code} shareUrl={shareUrl} ended={classroom.status === "ENDED"} />

      <section className="md-card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">MẬT KHẨU LỚP</p>
        <h2 className="mt-1 text-xl font-extrabold">Đặt mật khẩu tham gia lớp</h2>
        <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
          Đặt mã dễ nhớ cho học viên (thay cho mật khẩu ngẫu nhiên khi tạo lớp). Học viên nhập mã lớp + mật khẩu này để vào lớp.
        </p>
        <div className="mt-4">
          <SetClassPasswordForm classroomId={classroom.id} ended={classroom.status === "ENDED"} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <section className="md-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">BÀI TẬP</p>
                <h2 className="mt-1 text-xl font-extrabold">Theo dõi nộp bài</h2>
              </div>
              <span className="text-sm text-[var(--md-on-surface-variant)]">{board.length} bài tập</span>
            </div>
            <div className="mt-4 space-y-4">
              {board.map((a) => (
                <AssignmentBoardRow key={a.id} assignment={a} classroomId={classroom.id} nodeLabel={(id) => nodeLabels.get(id) ?? "Bài học"} />
              ))}
              {board.length === 0 && (
                <p className="rounded-2xl bg-[var(--md-surface-container)] p-6 text-center text-sm text-[var(--md-on-surface-variant)]">
                  Chưa có bài tập nào. Giao bài tập đầu tiên ở cột bên phải.
                </p>
              )}
            </div>
          </section>

          <section className="md-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">HỌC VIÊN</p>
                <h2 className="mt-1 text-xl font-extrabold">Danh sách thành viên</h2>
              </div>
              <span className="text-sm text-[var(--md-on-surface-variant)]">{members.length} học viên</span>
            </div>
            {members.length > 0 ? (
              <ul className="mt-4 divide-y divide-[var(--md-outline-variant)]">
                {members.map((m) => (
                  <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-bold">{m.user.name}</p>
                      <p className="text-sm text-[var(--md-on-surface-variant)]">{m.user.email}</p>
                    </div>
                    <p className="text-xs text-[var(--md-on-surface-variant)]">Vào lớp {formatDateTime(m.joinedAt, false)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl bg-[var(--md-surface-container)] p-6 text-center text-sm text-[var(--md-on-surface-variant)]">
                Chưa có học viên nào — thêm trực tiếp từ tài khoản đã đăng ký ở bên dưới, hoặc chia sẻ link/mã lớp cho học viên tự tham gia.
              </p>
            )}
            <AddMemberForm classroomId={classroom.id} candidates={studentCandidates} />
          </section>
        </div>

        <ClassSideTabs
          tabs={[
            {
              key: "announcements",
              label: "Thông báo",
              badge: announcements.length,
              content: (
                <>
                  <h2 className="text-lg font-extrabold">Gửi thông báo cho cả lớp</h2>
                  <div className="mt-3">
                    <PostAnnouncementForm classroomId={classroom.id} />
                  </div>
                  <div className="mt-4 space-y-3 border-t border-[var(--md-outline-variant)] pt-4">
                    {announcements.map((an) => (
                      <article key={an.id} className="rounded-2xl bg-[var(--md-surface-container)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-extrabold">{an.title}</h3>
                          <p className="text-xs text-[var(--md-on-surface-variant)]">{formatDateTime(an.createdAt)}</p>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--md-on-surface-variant)]">{an.body}</p>
                        <p className="mt-2 text-xs font-bold text-[var(--md-primary)]">{an.author.name}</p>
                      </article>
                    ))}
                    {announcements.length === 0 && (
                      <p className="text-sm text-[var(--md-on-surface-variant)]">Chưa có thông báo nào.</p>
                    )}
                  </div>
                </>
              ),
            },
            {
              key: "assignment",
              label: "Bài tập mới",
              content: (
                <>
                  <h2 className="text-lg font-extrabold">Giao bài tập có hạn chót</h2>
                  <div className="mt-3">
                    {unitsWithNodes.length > 0 ? (
                      <CreateAssignmentForm classroomId={classroom.id} units={unitsWithNodes} />
                    ) : (
                      <p className="rounded-2xl bg-[var(--md-surface-container)] p-4 text-sm text-[var(--md-on-surface-variant)]">
                        Chưa có bài học nào được xuất bản trong khóa này.
                      </p>
                    )}
                  </div>
                </>
              ),
            },
            {
              key: "schedule",
              label: "Lịch học",
              badge: sessions.filter((s) => s.status === "SCHEDULED").length,
              content: (
                <>
                  <h2 className="text-lg font-extrabold">Lịch học của lớp</h2>
                  <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
                    Lên lịch buổi học trực tiếp — học viên thấy lịch ở trang Lớp của họ.
                  </p>
                  <div className="mt-3">
                    <ScheduleSessionForm classroomId={classroom.id} />
                  </div>
                  <div className="mt-4 space-y-3 border-t border-[var(--md-outline-variant)] pt-4">
                    {sessions.map((s) => (
                      <article key={s.id} className="rounded-2xl bg-[var(--md-surface-container)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-extrabold">{s.title}</h3>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${SESSION_STATUS_CLASSES[s.status] ?? SESSION_STATUS_CLASSES.SCHEDULED}`}>
                            {SESSION_STATUS_LABELS[s.status] ?? s.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
                          {formatDateTime(s.startsAt)} — {formatDateTime(s.endsAt)}
                        </p>
                      </article>
                    ))}
                    {sessions.length === 0 && (
                      <p className="text-sm text-[var(--md-on-surface-variant)]">Chưa có lịch lớp học nào — tạo buổi đầu tiên ở form trên.</p>
                    )}
                  </div>
                </>
              ),
            },
            {
              key: "live",
              label: "Hỏi nhanh",
              content: (
                <>
                  <h2 className="text-lg font-extrabold">Hỏi nhanh với cả lớp</h2>
                  <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
                    Đưa câu hỏi lên lớp và xem câu trả lời về đích ngay — trang cập nhật tự động.
                  </p>
                  <div className="mt-3">
                    <LiveRoom classroomId={classroom.id} role="teacher" />
                  </div>
                </>
              ),
            },
            {
              key: "materials",
              label: "Tài liệu",
              badge: materials.length,
              content: (
                <>
                  <h2 className="text-lg font-extrabold">Gắn tài liệu vào lớp</h2>
                  <div className="mt-3">
                    <AttachMaterialForm classroomId={classroom.id} assets={assets.map((a) => ({ id: a.id, originalName: a.originalName }))} />
                  </div>
                  <div className="mt-4 space-y-2 border-t border-[var(--md-outline-variant)] pt-4">
                    {materials.map((m) => (
                      <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--md-surface-container)] px-4 py-3">
                        <div>
                          <p className="font-bold">{m.title}</p>
                          <p className="text-xs text-[var(--md-on-surface-variant)]">
                            {m.mediaAsset.originalName} · {m.addedBy.name}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--md-on-surface-variant)]">{formatDateTime(m.createdAt, false)}</p>
                      </div>
                    ))}
                    {materials.length === 0 && (
                      <p className="text-sm text-[var(--md-on-surface-variant)]">Chưa có tài liệu nào được gắn vào lớp.</p>
                    )}
                  </div>
                </>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function AssignmentBoardRow({
  assignment,
  classroomId,
  nodeLabel,
}: {
  assignment: BoardRow;
  classroomId: string;
  nodeLabel: (nodeId: string) => string;
}) {
  const open = assignment.status === "PUBLISHED";
  return (
    <article className="rounded-2xl border border-[var(--md-outline-variant)] bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-extrabold">{assignment.title}</h3>
          <p className="text-xs text-[var(--md-on-surface-variant)]">Do {assignment.creator.name} giao</p>
        </div>
        <span className="md-chip">{open ? "Đang mở" : "Đã đóng"}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
        Hạn chót: <strong className="text-[var(--md-on-surface)]">{formatDateTime(assignment.dueAt)}</strong> · {deadlineLabel(assignment.dueAt)}
      </p>
      {assignment.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--md-on-surface-variant)]">{assignment.description}</p>
      )}
      <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
        Gồm {assignment.nodes.length} phần: {assignment.nodes.map((n) => nodeLabel(n.nodeId)).join(" · ")}
      </p>
      {assignment.members.length > 0 ? (
        <div className="md-table-wrap mt-3">
          <table className="md-table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Hoàn thành</th>
                <th>Trạng thái</th>
                <th>Nộp lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {assignment.members.map((m) => (
                <tr key={m.userId}>
                  <td>
                    <strong>{m.name}</strong>
                    <p className="text-xs font-normal text-[var(--md-on-surface-variant)]">{m.email}</p>
                  </td>
                  <td>{m.doneCount}/{m.total}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${STUDENT_STATUS_CLASSES[m.studentStatus]}`}>
                      {STUDENT_STATUS_LABELS[m.studentStatus]}
                    </span>
                  </td>
                  <td className="text-sm text-[var(--md-on-surface-variant)]">
                    {m.lastCompletedAt ? formatDateTime(m.lastCompletedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-[var(--md-surface-container)] p-3 text-sm text-[var(--md-on-surface-variant)]">
          Chưa có học viên trong lớp.
        </p>
      )}
      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={closeAssignmentAction}>
            <input type="hidden" name="classroomId" value={classroomId} />
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <button className="md-button outlined">Đóng bài</button>
          </form>
          <form action={deleteAssignmentAction}>
            <input type="hidden" name="classroomId" value={classroomId} />
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <button className="md-button outlined" style={{ color: "var(--md-error)" }}>
              Xóa bài
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
