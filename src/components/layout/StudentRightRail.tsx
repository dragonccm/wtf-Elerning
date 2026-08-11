import Link from "next/link";
import { Flame, Gem, Heart, Trophy, Zap } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatPercent } from "@/lib/utils";

export function StudentRightRail({
  streak,
  xp,
  hearts = 5,
  completionRate,
  exercisesDone,
  dailyGoal = 20,
  dailyProgress = 0,
  dailyTarget = 20,
  dailyCompleted = false,
}: {
  streak: number;
  xp: number;
  hearts?: number;
  completionRate: number;
  exercisesDone: number;
  dailyGoal?: number;
  dailyProgress?: number;
  dailyTarget?: number;
  dailyCompleted?: boolean;
}) {
  const target = dailyTarget || dailyGoal;
  const questPct = Math.min(100, (dailyProgress / target) * 100);

  return (
    <aside className="hidden w-[352px] shrink-0 flex-col gap-4 py-6 pl-2 pr-4 xl:flex">
      <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-[#e5e5e5] bg-white px-3 py-3">
        <Stat icon={<span className="text-lg">🇨🇳</span>} value="HSK" />
        <Stat icon={<Flame className="size-5 text-[#ff9600]" />} value={String(streak)} tone="#ff9600" />
        <Stat icon={<Gem className="size-5 text-[#1cb0f6]" />} value={String(xp)} tone="#1cb0f6" />
        <Stat icon={<Heart className="size-5 text-[#ff4b4b]" />} value={String(hearts)} tone="#ff4b4b" />
      </div>

      <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#3c3c3c]">Tiến độ khóa</h3>
          <Trophy className="size-5 text-[#ffc800]" />
        </div>
        <p className="mt-1 text-sm font-semibold text-[#777]">
          Hoàn thành {formatPercent(completionRate)} · {exercisesDone} bài đã làm
        </p>
        <ProgressBar value={completionRate} className="mt-3 h-4" />
        <Link
          href="/progress"
          className="mt-4 flex h-12 items-center justify-center rounded-2xl border-2 border-b-4 border-[#e5e5e5] text-sm font-extrabold uppercase tracking-wide text-[#1cb0f6] transition active:translate-y-[2px] active:border-b-2"
        >
          Xem chi tiết
        </Link>
      </div>

      <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#3c3c3c]">Nhiệm vụ hôm nay</h3>
          <Zap className="size-5 text-[#ffc800]" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#fff4d4]">
            <Zap className="size-6 text-[#ffc800]" fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-[#3c3c3c]">Kiếm {target} XP</p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={questPct} className="h-3.5 flex-1" tone="warning" />
              <span className="text-xs font-bold text-[#777]">
                {dailyProgress}/{target}
              </span>
            </div>
            {dailyCompleted && (
              <p className="mt-2 text-xs font-extrabold text-[#58a700]">✓ Hoàn thành mục tiêu hôm nay!</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-[#ddf4ff] bg-gradient-to-br from-[#ddf4ff] to-white p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#1899d6]">Mẹo học</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#3c3c3c]">
          Làm lần lượt theo chuỗi path. Mỗi node mở ra khi bạn hoàn thành bước trước.
        </p>
        <Link
          href="/learn"
          className="mt-4 flex h-12 items-center justify-center rounded-2xl border-2 border-b-4 border-[#84d8ff] bg-[#1cb0f6] text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_0_0_0] transition active:translate-y-[2px] active:border-b-2"
        >
          Bắt đầu học
        </Link>
      </div>
    </aside>
  );
}

function Stat({
  icon,
  value,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {icon}
      <span className="text-sm font-extrabold" style={{ color: tone ?? "#3c3c3c" }}>
        {value}
      </span>
    </div>
  );
}
