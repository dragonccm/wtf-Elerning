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
    <div className="mx-auto w-full max-w-xl">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Ẩn đáp án" : "Lật thẻ để xem đáp án"}
        className="group relative h-[320px] w-full [perspective:1400px] sm:h-[360px]"
      >
        <div
          className={cn(
            "relative h-full w-full rounded-[30px] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          <div className="flashcard-face absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[30px] border-2 border-[#dbe8df] bg-white p-8 [backface-visibility:hidden]">
            <span className="absolute left-6 top-5 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-dark)]">Mặt trước</span>
            <div className="absolute -right-12 -top-12 size-40 rounded-full bg-[var(--brand-soft)]/45" />
            <div className="absolute -bottom-20 -left-12 size-48 rounded-full border-[28px] border-[#ddf4ff]/70" />
            <p className="hanzi relative text-7xl font-extrabold text-[var(--ink)] sm:text-8xl">{hanzi}</p>
            <p className="relative mt-8 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
              Chạm để mở đáp án
            </p>
          </div>
          <div className="flashcard-face absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[30px] border-2 border-[var(--brand-dark)] bg-[#efffe5] p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="absolute left-6 top-5 rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-dark)]">Đáp án</span>
            <p className="text-xl font-extrabold text-[var(--brand-dark)]">{pinyin}</p>
            <p className="mt-3 text-3xl font-extrabold text-[var(--ink)]">{meaningVi}</p>
            {example && <p className="mt-6 max-w-sm rounded-2xl bg-white/80 px-5 py-3 text-center text-sm font-semibold leading-relaxed text-[var(--muted)]">{example}</p>}
          </div>
        </div>
      </button>
    </div>
  );
}
