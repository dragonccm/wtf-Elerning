import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import Link from "next/link";

export default async function TeacherHomePage() {
  const user = await requireRole("TEACHER");
  const [classrooms, members, drafts, reviews] = await Promise.all([
    prisma.classroom.count({ where: { teacherId: user.id, status: { in: ["OPEN", "ACTIVE"] } } }),
    prisma.classroomMember.count({ where: { classroom: { teacherId: user.id } } }),
    prisma.course.count({ where: { teacherId: user.id, status: "DRAFT" } }),
    prisma.course.count({ where: { teacherId: user.id, status: "PENDING_REVIEW" } }),
  ]);
  const pending = await prisma.submission.count({
    where: {
      status: "SUBMITTED",
      autoGraded: false,
      ...(user.role === "ADMIN"
        ? {}
        : { user: { enrollments: { some: { course: { teacherId: user.id } } } } }),
    },
  });

  return (
    <div className="space-y-7">
      <header><p className="text-sm font-bold text-[var(--md-primary)]">KHÔNG GIAN BIÊN SOẠN</p><h1 className="mt-1 text-3xl font-extrabold">Tổng quan giáo viên</h1><p className="mt-2 text-[var(--md-on-surface-variant)]">Quản lý nội dung và lớp học đang sử dụng.</p></header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Lớp hoạt động" value={String(classrooms)} />
        <Stat label="Học viên" value={String(members)} />
        <Stat label="Bài chờ chấm" value={String(pending)} />
        <Stat label="Nháp / Chờ duyệt" value={`${drafts} / ${reviews}`} />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <QuickLink href="/teacher/content" title="Tạo nội dung" desc="Video, flashcard, bài kiểm tra" />
        <QuickLink href="/teacher/grading" title="Chấm tự luận" desc="Nhận xét & đánh dấu lỗi" />
        <QuickLink href="/teacher/grades" title="Bảng điểm" desc="Điểm kiểm tra theo học viên" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="md-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--md-on-surface-variant)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="md-card p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
    </Link>
  );
}
