import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatMinutes(seconds: number) {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}g ${rem}p`;
}

/** "m:ss" — compact clock label (video position, chapter marks). */
export function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDateTime(value: Date | string, withTime = true) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** "Còn 3 ngày" / "Còn 5 giờ" / "Đã quá hạn" — relative deadline label. */
export function deadlineLabel(dueAt: Date | string) {
  const d = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "Đã quá hạn";
  const hours = Math.ceil(diffMs / 3_600_000);
  if (hours < 48) return `Còn ${hours} giờ`;
  return `Còn ${Math.ceil(diffMs / 86_400_000)} ngày`;
}
