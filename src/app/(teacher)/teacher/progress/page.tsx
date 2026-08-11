import { formatPercent } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default async function TeacherProgressPage() {
  const user = await requireRole("TEACHER");
  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? undefined : { teacherId: user.id },
    include: {
      enrollments: {
        include: {
          user: {
            include: {
              progressEvents: { where: { completed: true } },
              submissions: { where: { score: { not: null } } },
            },
          },
        },
      },
      units: { include: { _count: { select: { nodes: true } } } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Tiến độ lớp</h1>
      <p className="mt-1 text-[var(--muted)]">Thống kê theo học viên trong khóa bạn phụ trách.</p>
      <div className="mt-6 space-y-4">
        {courses.map((course) => {
          const totalNodes = course.units.reduce((s, u) => s + u._count.nodes, 0) || 1;
          return (
            <section key={course.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
              <h2 className="text-xl font-extrabold">{course.title}</h2>
              <ul className="mt-4 space-y-4">
                {course.enrollments.map((e) => {
                  const rate = (e.user.progressEvents.length / totalNodes) * 100;
                  const avg =
                    e.user.submissions.length === 0
                      ? 0
                      : e.user.submissions.reduce((s, x) => s + (x.score ?? 0), 0) / e.user.submissions.length;
                  return (
                    <li key={e.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold">{e.user.name}</span>
                        <span className="text-[var(--muted)]">
                          {formatPercent(rate)} · ĐTB {avg.toFixed(1)}
                        </span>
                      </div>
                      <ProgressBar value={rate} className="mt-2" />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
