import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function serverApi<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("wtf_token")?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export type DailyPayload = {
  date: string;
  streak: number;
  longestStreak: number;
  totalXp: number;
  dailyTarget: number;
  dailyEarned: number;
  dailyCompleted: boolean;
  stats: {
    completedLessons: number;
    totalNodes: number;
    completionRate: number;
    studySeconds: number;
    exercisesDone: number;
    averageScore: number;
  };
};

export type PathPayload = {
  course: { id: string; title: string; level: string };
  unit: { id: string; title: string; objective: string | null } | null;
  nodes: {
    id: string;
    title: string;
    type: string;
    state: "locked" | "current" | "completed";
    href: string | null;
  }[];
  lockedUnits: { id: string; title: string }[];
};

export type AuthUser = { id: string; email: string; name: string; role: Role };

export async function getMe() {
  return serverApi<AuthUser>("/me");
}

export async function getDaily() {
  return serverApi<DailyPayload>("/daily");
}

export async function getLearnPath() {
  return serverApi<PathPayload>("/learn/path");
}
