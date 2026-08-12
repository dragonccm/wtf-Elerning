"use client";

import { cn } from "@/lib/utils";

export function ChoiceCard({
  label,
  selected,
  correct,
  wrong,
  onClick,
  disabled,
  index,
}: {
  label: string;
  selected?: boolean;
  correct?: boolean;
  wrong?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  index?: number;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative min-h-[120px] w-full cursor-pointer rounded-2xl border-2 border-b-4 bg-white px-5 py-5 text-center text-xl font-extrabold transition-all sm:min-h-[136px] sm:text-2xl lg:min-h-[156px] lg:rounded-3xl lg:px-7 lg:py-7 lg:text-[28px]",
        "active:translate-y-[2px] active:border-b-2",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#84d8ff]/50 disabled:cursor-default",
        selected && "border-[#84d8ff] bg-[#ddf4ff] text-[#1899d6]",
        !selected && "border-[#e5e5e5] text-[#3c3c3c] hover:bg-[#f7f7f7]",
        correct && "border-[#58a700] bg-[#d7ffb8] text-[#58a700]",
        wrong && "border-[#ea2b2b] bg-[#ffdfe0] text-[#ea2b2b]",
      )}
    >
      <span className="hanzi block">{label}</span>
      {index != null && (
        <span className="absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-lg border-2 border-current/20 text-xs font-extrabold opacity-60 lg:bottom-4 lg:right-4 lg:size-8 lg:text-sm">
          {index}
        </span>
      )}
    </button>
  );
}
