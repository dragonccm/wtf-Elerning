"use client";

import { cn } from "@/lib/utils";
import { BookOpen, Lock, Star, Trophy, Video, Layers } from "lucide-react";
import Link from "next/link";

export type PathNodeState = "locked" | "current" | "completed";
export type PathNodeKind = "VIDEO" | "FLASHCARD" | "QUIZ" | "ESSAY" | "MILESTONE";

const icons = {
  VIDEO: Video,
  FLASHCARD: Layers,
  QUIZ: Star,
  ESSAY: BookOpen,
  MILESTONE: Trophy,
};

export function PathNode({
  href,
  state,
  kind,
  label,
  index,
  offset = 0,
}: {
  href?: string;
  state: PathNodeState;
  kind: PathNodeKind;
  label?: string;
  index: number;
  offset?: number;
}) {
  const Icon = state === "locked" ? Lock : icons[kind];
  const content = (
    <div
      className="relative flex flex-col items-center animate-rise"
      style={{ marginLeft: offset, animationDelay: `${index * 50}ms` }}
    >
      {state === "current" && (
        <div className="absolute -top-12 z-10 rounded-xl border-2 border-[#e5e5e5] bg-white px-3 py-2 text-[13px] font-extrabold uppercase tracking-wider text-[var(--brand)] shadow-sm">
          {label ?? "Bắt đầu"}
          <span className="absolute left-1/2 top-full -mt-[5px] size-2.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#e5e5e5] bg-white" />
        </div>
      )}
      <div
        className={cn(
          "relative flex size-[70px] items-center justify-center rounded-full border-2",
          state === "current" &&
            "border-b-[6px] border-[var(--brand-dark)] bg-[var(--brand)] text-white animate-pulse-soft",
          state === "completed" &&
            "border-b-[6px] border-[#58a700] bg-[#58cc02] text-white",
          state === "locked" && "border-b-[6px] border-[#b7b7b7] bg-[#e5e5e5] text-white",
        )}
      >
        <Icon className="size-7" strokeWidth={2.6} />
        {state === "current" && (
          <span className="absolute -inset-1 rounded-full border-[5px] border-[#ffc800] border-b-transparent border-l-transparent" />
        )}
      </div>
    </div>
  );

  if (state === "locked" || !href) return content;
  return (
    <Link href={href} className="block focus:outline-none">
      {content}
    </Link>
  );
}
