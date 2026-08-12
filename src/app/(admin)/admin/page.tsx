import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminHomePage() {
  await requireRole("ADMIN");
  const [courses, teachers, students, submissions, activeClasses, pendingReview] = await Promise.all([
    prisma.course.count(),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.submission.count(),
    prisma.classroom.count({ where: { status: { in: ["OPEN", "ACTIVE"] } } }),
    prisma.course.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  return (
    <div className="space-y-7">
      <header><p className="text-sm font-bold text-[var(--md-primary)]">系统概览 · QUẢN TRỊ</p><h1 className="mt-1 text-3xl font-extrabold">Tổng quan hệ thống</h1><p className="mt-2 text-[var(--md-on-surface-variant)]">Theo dõi quy mô và các công việc cần xử lý.</p></header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Khóa học" value={courses} />
        <Card label="Giáo viên" value={teachers} />
        <Card label="Học viên" value={students} />
        <Card label="Bài nộp" value={submissions} />
      </div>
      <section className="grid gap-4 md:grid-cols-2"><div className="md-card p-6"><p className="text-sm font-bold text-[var(--md-on-surface-variant)]">Lớp đang hoạt động</p><p className="mt-3 text-5xl font-extrabold text-[var(--md-primary)]">{activeClasses}</p></div><div className="md-card p-6"><p className="text-sm font-bold text-[var(--md-on-surface-variant)]">Khóa chờ duyệt</p><p className="mt-3 text-5xl font-extrabold text-[#8a4f00]">{pendingReview}</p></div></section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="md-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--md-on-surface-variant)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
