"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, isPathActive } from "@/lib/utils";
import { ChartColumn, GraduationCap, House, Layers, UserRound, Zap } from "lucide-react";

const items = [
  { href: "/learn", label: "Học", icon: House },
  { href: "/drills", label: "Luyện", icon: Zap },
  { href: "/classes", label: "Lớp", icon: GraduationCap },
  { href: "/courses", label: "Từ vựng", icon: Layers },
  { href: "/progress", label: "Tiến độ", icon: ChartColumn },
  { href: "/profile", label: "Hồ sơ", icon: UserRound },
];

const itemHrefs = items.map((i) => i.href);

export function StudentSidebar({ brand = "WTF Learn" }: { brand?: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-[236px] shrink-0 flex-col border-r-2 border-[#e5e5e5] bg-white px-4 py-6 lg:flex">
      <Link href="/learn" className="mb-8 px-3 text-[28px] font-extrabold tracking-tight text-[var(--brand)]">
        {brand}
      </Link>
      <nav className="flex flex-1 flex-col gap-2">
        {items.map((item) => {
          const active = isPathActive(pathname, item.href, itemHrefs);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-2xl border-2 px-3 py-3 text-[15px] font-extrabold uppercase tracking-wide transition",
                active
                  ? "border-[#84d8ff] bg-[#ddf4ff] text-[#1899d6]"
                  : "border-transparent text-[#777777] hover:bg-[#f7f7f7]",
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  active ? "bg-white text-[#1899d6]" : "bg-[#f0f0f0] text-[#777]",
                )}
              >
                <Icon className="size-5" strokeWidth={2.5} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border-2 border-[#e5e5e5] bg-[#f7f7f7] p-3 text-xs font-semibold text-[#777]">
        Học tiếng Trung theo chuỗi bài — nhìn là biết bước tiếp theo.
      </div>
    </aside>
  );
}

export function StudentMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-[#e5e5e5] bg-white lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-6">
        {items.map((item) => {
          const active = isPathActive(pathname, item.href, itemHrefs);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-extrabold uppercase",
                  active ? "text-[var(--brand)]" : "text-[#777]",
                )}
              >
                <Icon className="size-5" strokeWidth={2.5} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
