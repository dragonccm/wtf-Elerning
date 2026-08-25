"use client";

import { isPathActive, cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";

const TABS = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/content", label: "Nội dung" },
  { href: "/teacher/grading", label: "Chấm bài" },
  { href: "/teacher/grades", label: "Sổ điểm" },
  { href: "/teacher/students", label: "Học viên" },
  { href: "/teacher/classes", label: "Lớp học" },
  { href: "/teacher/progress", label: "Tiến độ" },
];

const HREFS = TABS.map((t) => t.href);

export function TeacherTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng giáo viên"
      className="sticky top-20 z-10 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface)]/90 px-5 backdrop-blur-xl md:px-8"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-extrabold transition",
                isPathActive(pathname, t.href, HREFS)
                  ? "bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                  : "bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <LogoutButton compact />
      </div>
    </nav>
  );
}
