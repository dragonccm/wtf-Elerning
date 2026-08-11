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
