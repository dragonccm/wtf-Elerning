"use client";

import { StudentMobileNav, StudentSidebar } from "@/components/layout/StudentSidebar";
import { StudentRightRail } from "@/components/layout/StudentRightRail";
import { getMeApi } from "@/lib/api-client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type MeData = Awaited<ReturnType<typeof getMeApi>>;

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<MeData | null>(null);

  const isActivity =
    pathname.includes("/learn/video/") ||
    pathname.includes("/learn/flashcards/") ||
    pathname.includes("/learn/quiz/") ||
    pathname.includes("/learn/essay/") ||
    pathname.includes("/learn/milestone/") ||
    pathname.includes("/learn/results/");

  useEffect(() => {
    getMeApi()
      .then(setMe)
      .catch(() => setMe(null));
  }, [pathname]);

  if (isActivity) {
    return <div className="min-h-screen bg-white text-[#3c3c3c]">{children}</div>;
  }

  const daily = me?.daily;
  const stats = me?.stats;

  return (
    <div className="min-h-screen bg-white text-[#3c3c3c]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1280px]">
        <StudentSidebar />
        <div className="flex min-w-0 flex-1 pb-24 lg:pb-0">
          <div className="min-w-0 flex-1">{children}</div>
          {daily && stats && (
            <StudentRightRail
              streak={daily.streak}
              xp={daily.totalXp}
              completionRate={stats.completionRate}
              exercisesDone={stats.exercisesDone}
              dailyProgress={daily.dailyEarned}
              dailyTarget={daily.dailyTarget}
              dailyCompleted={daily.dailyCompleted}
            />
          )}
        </div>
      </div>
      <StudentMobileNav />
    </div>
  );
}
