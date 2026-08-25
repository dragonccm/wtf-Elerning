"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, isPathActive } from "@/lib/utils";
import { ReactNode } from "react";

export function StaffSidebar({
  title,
  items,
  footer,
}: {
  title: string;
  items: { href: string; label: string; icon?: ReactNode }[];
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const hrefs = items.map((i) => i.href);
  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col bg-[var(--md-surface-container)] lg:flex">
      <div className="px-6 py-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--md-primary)]">WTF · 学习空间</p>
        <h1 className="mt-2 text-xl font-extrabold text-[var(--md-on-surface)]">{title}</h1>
      </div>
      <nav aria-label={title} className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = isPathActive(pathname, item.href, hrefs);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-full px-5 text-sm font-bold transition",
                active
                  ? "bg-[var(--md-secondary-container)] text-[var(--md-on-primary-container)]"
                  : "text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="p-5">{footer}</div>}
    </aside>
  );
}
