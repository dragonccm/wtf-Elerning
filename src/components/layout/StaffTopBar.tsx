import Link from "next/link";
import { Bell, Menu } from "lucide-react";

export function StaffTopBar({ title, userName }: { title: string; userName: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[var(--md-outline-variant)] bg-[var(--md-surface)]/90 px-5 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <button aria-label="Mở điều hướng" className="flex size-11 items-center justify-center rounded-full hover:bg-[var(--md-surface-container)] lg:hidden"><Menu /></button>
        <div><p className="text-xs font-bold uppercase tracking-wider text-[var(--md-primary)]">Không gian vận hành</p><h2 className="text-lg font-extrabold">{title}</h2></div>
      </div>
      <div className="flex items-center gap-2">
        <Link aria-label="Thông báo" href="/notifications" className="flex size-11 items-center justify-center rounded-full hover:bg-[var(--md-surface-container)]"><Bell className="size-5" /></Link>
        <div className="hidden rounded-full bg-[var(--md-primary-container)] px-4 py-2 text-sm font-bold text-[var(--md-on-primary-container)] sm:block">{userName}</div>
      </div>
    </header>
  );
}
