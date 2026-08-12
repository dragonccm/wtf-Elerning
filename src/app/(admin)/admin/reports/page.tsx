import { formatPercent } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminReportsPage() {
  await requireRole("ADMIN");
  const courses = await prisma.course.findMany({
    include: {
      teacher: true,
      enrollments: true,
      units: { include: { nodes: { include: { progress: { where: { completed: true } } } } } },
    },
  });
  const submissions = await prisma.submission.findMany({ where: { score: { not: null } } });
  const avgScore =
    submissions.length === 0
      ? 0
      : submissions.reduce((s, x) => s + (x.score ?? 0), 0) / submissions.length;

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Báo cáo thống kê</h1>
      <p className="mt-1 text-[var(--muted)]">Toàn hệ thống — nhiều khóa, nhiều giáo viên.</p>
      <a href="/api/reports/courses" className="md-button mt-5">Xuất báo cáo CSV</a>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="md-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Điểm TB hệ thống</p>
          <p className="mt-2 text-3xl font-extrabold">{avgScore.toFixed(1)}</p>
        </div>
        <div className="md-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Số bài đã chấm</p>
          <p className="mt-2 text-3xl font-extrabold">{submissions.length}</p>
        </div>
        <div className="md-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Tổng khóa học</p>
          <p className="mt-2 text-3xl font-extrabold">{courses.length}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-4">
        {courses.map((course) => {
          const totalNodes = course.units.reduce((s, u) => s + u.nodes.length, 0) || 1;
          const completions = course.units.reduce(
            (s, u) => s + u.nodes.reduce((ss, n) => ss + n.progress.length, 0),
            0,
          );
          const possible = totalNodes * Math.max(course.enrollments.length, 1);
          const rate = (completions / possible) * 100;
          return (
            <li key={course.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold">{course.title}</h2>
                  <p className="text-sm text-[var(--muted)]">
                    GV: {course.teacher?.name ?? "—"} · {course.enrollments.length} HV
                  </p>
                </div>
                <span className="text-sm font-bold">{formatPercent(rate)}</span>
              </div>
              <ProgressBar value={rate} className="mt-3" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
