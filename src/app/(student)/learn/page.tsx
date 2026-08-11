import { LearningPath } from "@/components/learning/LearningPath";
import { DailyBanner } from "@/components/learning/DailyBanner";
import { UnitHeader } from "@/components/learning/UnitHeader";
import { prisma } from "@/lib/db";
import { activityHref, getNodeStates } from "@/lib/progress";
import { requireUser } from "@/lib/session";
import Link from "next/link";

export default async function LearnPage() {
  const user = await requireUser();
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          units: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!enrollment) {
    return (
      <main className="px-6 py-12">
        <h1 className="text-3xl font-extrabold">Chưa có khóa học</h1>
        <p className="mt-2 text-[#777]">Hãy đợi giáo viên ghi danh hoặc xem danh sách khóa.</p>
        <Link href="/courses" className="mt-4 inline-block font-extrabold text-[var(--brand)]">
          Xem khóa học →
        </Link>
      </main>
    );
  }

  const unit = enrollment.course.units[0];
  const nodes = unit ? await getNodeStates(user.id, unit.id) : [];

  return (
    <main className="min-h-screen">
      <UnitHeader
        sectionLabel={`${enrollment.course.level} · Unit 1`}
        title={unit?.title ?? "Unit"}
        objective={unit?.objective}
      />
      <DailyBanner />
      <LearningPath
        nodes={nodes.map((n) => ({
          id: n.id,
          title: n.title,
          type: n.type,
          state: n.state,
          href: n.state === "locked" ? undefined : activityHref(n.type, n.id),
        }))}
      />
      {enrollment.course.units.length > 1 && (
        <div className="mx-auto max-w-[680px] px-4 pb-12 lg:px-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-[#e5e5e5]" />
            <span className="text-sm font-extrabold text-[#afafaf]">Unit tiếp theo</span>
            <div className="h-0.5 flex-1 bg-[#e5e5e5]" />
          </div>
          <ul className="space-y-3">
            {enrollment.course.units.slice(1).map((u) => (
              <li
                key={u.id}
                className="rounded-2xl border-2 border-[#e5e5e5] bg-white px-5 py-4 text-sm font-extrabold text-[#afafaf]"
              >
                🔒 {u.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
