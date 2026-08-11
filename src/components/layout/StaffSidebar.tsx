"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">WTF E-learning</p>
        <h1 className="mt-1 text-lg font-extrabold text-[var(--ink)]">{title}</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="border-t border-[var(--line)] p-4">{footer}</div>}
    </aside>
  );
}
