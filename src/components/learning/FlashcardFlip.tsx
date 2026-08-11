"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function FlashcardFlip({
  hanzi,
  pinyin,
  meaningVi,
  example,
}: {
  hanzi: string;
  pinyin: string;
  meaningVi: string;
  example?: string | null;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="group relative h-64 w-full [perspective:1200px]"
      >
        <div
          className={cn(
            "relative h-full w-full rounded-[28px] transition-transform duration-500 [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-card)] [backface-visibility:hidden]">
            <p className="hanzi text-6xl text-[var(--ink)]">{hanzi}</p>
            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Nhớ nghĩa · chạm để xem đáp án
            </p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-[var(--line)] bg-[var(--brand-soft)] p-6 shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-xl font-bold text-[var(--brand)]">{pinyin}</p>
            <p className="mt-3 text-2xl font-bold text-[var(--ink)]">{meaningVi}</p>
            {example && <p className="mt-4 text-center text-sm text-[var(--muted)]">{example}</p>}
          </div>
        </div>
      </button>
    </div>
  );
}
