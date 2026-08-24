"use client";

export async function getDailyApi() {
  const res = await fetch("/api/daily");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as {
    streak: number;
    totalXp: number;
    dailyTarget: number;
    dailyEarned: number;
    dailyCompleted: boolean;
  };
}

export async function getMeApi() {
  const res = await fetch("/api/me");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ADMIN" | "TEACHER" | "STUDENT";
    };
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
  };
}
