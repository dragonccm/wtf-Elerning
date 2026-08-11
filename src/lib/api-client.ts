"use client";

const TOKEN_KEY = "wtf_token";

export function getToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )wtf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `wtf_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = "wtf_token=; path=/; max-age=0";
}

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export async function loginApi(email: string, password: string) {
  return apiFetch<{ token: string; user: ApiUser; home: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(name: string, email: string, password: string) {
  return apiFetch<{ token: string; user: ApiUser; home: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function getDailyApi() {
  return apiFetch<{
    streak: number;
    totalXp: number;
    dailyTarget: number;
    dailyEarned: number;
    dailyCompleted: boolean;
  }>("/daily");
}

export async function getMeApi() {
  return apiFetch<{
    user: ApiUser;
    stats: {
      completedLessons: number;
      totalNodes: number;
      completionRate: number;
      studySeconds: number;
      exercisesDone: number;
      averageScore: number;
    };
    daily: {
      streak: number;
      totalXp: number;
      dailyTarget: number;
      dailyEarned: number;
      dailyCompleted: boolean;
    };
  }>("/me");
}
