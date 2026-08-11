import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminHomePage() {
  await requireRole("ADMIN");
  const [courses, teachers, students, submissions] = await Promise.all([
    prisma.course.count(),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.submission.count(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Quản trị hệ thống</h1>
      <p className="mt-1 text-[var(--muted)]">Tầng 1 — quản lý toàn bộ khóa học, giáo viên, học viên và báo cáo.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Khóa học" value={courses} />
        <Card label="Giáo viên" value={teachers} />
        <Card label="Học viên" value={students} />
        <Card label="Bài nộp" value={submissions} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
