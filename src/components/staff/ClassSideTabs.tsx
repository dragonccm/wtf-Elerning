"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SideTab = { key: string; label: string; badge?: number; content: ReactNode };

/** Collapsible tab panel for the class management right column — keeps the page from
 * stacking 5+ cards and staying noisy. */
export function ClassSideTabs({ tabs }: { tabs: SideTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;
  return (
    <section className="md-card overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={current.key === t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold transition",
              current.key === t.key
                ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                : "text-[var(--md-on-surface-variant)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)]",
            )}
          >
            {t.label}
            {typeof t.badge === "number" && t.badge > 0 && (
              <span className="rounded-full bg-[var(--md-primary)]/15 px-1.5 text-xs font-extrabold">{t.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div className="p-5" role="tabpanel">
        {current.content}
      </div>
    </section>
  );
}
