"use client";

import { getDailyApi } from "@/lib/api-client";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Flame, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function DailyBanner() {
  const [daily, setDaily] = useState<Awaited<ReturnType<typeof getDailyApi>> | null>(null);

  useEffect(() => {
    getDailyApi().then(setDaily).catch(() => setDaily(null));
  }, []);

  if (!daily) return null;

  const pct = Math.min(100, (daily.dailyEarned / daily.dailyTarget) * 100);

  return (
    <div className="mx-auto max-w-[680px] px-4 pt-4 lg:px-8">
      <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#777]">Hôm nay</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-extrabold text-[#3c3c3c]">
              <Flame className="size-5 text-[#ff9600]" />
              {daily.streak} ngày liên tiếp
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#ffc800]">
            <Zap className="size-4" fill="currentColor" />
            {daily.dailyEarned}/{daily.dailyTarget} XP
            {daily.dailyCompleted && " ✓"}
          </div>
        </div>
        <ProgressBar value={pct} className="mt-3 h-3" tone="warning" />
        <p className="mt-2 text-sm font-semibold text-[#777]">
          Hoàn thành 1 bài trên path để giữ streak và đạt mục tiêu ngày.
        </p>
      </div>
    </div>
  );
}
