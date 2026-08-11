import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMinutes, formatPercent } from "@/lib/utils";
import { getStudentStats } from "@/lib/progress";
import { requireUser } from "@/lib/session";

export default async function ProgressPage() {
  const user = await requireUser();
  const stats = await getStudentStats(user.id);

  const cards = [
    { label: "Bài đã hoàn thành", value: `${stats.completedLessons}/${stats.totalNodes}` },
    { label: "Thời gian học", value: formatMinutes(stats.studySeconds) },
    { label: "Tỷ lệ khóa học", value: formatPercent(stats.completionRate) },
    { label: "Bài tập đã làm", value: String(stats.exercisesDone) },
    { label: "Điểm trung bình", value: stats.averageScore.toFixed(1) },
  ];

  return (
    <main className="px-5 py-6">
      <h1 className="text-3xl font-extrabold">Tiến độ học tập</h1>
      <p className="mt-1 text-[var(--muted)]">Theo dõi mức độ tiến bộ của bạn.</p>
      <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Hoàn thành khóa</span>
          <span>{formatPercent(stats.completionRate)}</span>
        </div>
        <ProgressBar value={stats.completionRate} className="mt-3" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[22px] border border-[var(--line)] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{c.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
