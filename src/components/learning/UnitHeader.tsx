import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function UnitHeader({
  title,
  objective,
  sectionLabel = "Phần 1, Cửa 1",
  className,
}: {
  title: string;
  objective?: string | null;
  sectionLabel?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 mx-auto w-full max-w-[680px] px-4 pt-4 lg:px-8",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--brand)] px-5 py-4 text-white shadow-[0_6px_0_0_var(--brand-dark)]">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/85">{sectionLabel}</p>
          <h1 className="mt-1 truncate text-xl font-extrabold lg:text-2xl">{title}</h1>
          {objective && <p className="mt-0.5 truncate text-sm font-medium text-white/90">{objective}</p>}
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-b-4 border-black/15 bg-black/10 px-3 py-2 text-xs font-extrabold uppercase tracking-wide"
        >
          <BookOpen className="size-4" />
          Hướng dẫn
        </button>
      </div>
    </header>
  );
}
