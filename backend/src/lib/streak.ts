import { prisma, todayKey, yesterdayKey } from "./prisma.js";

export async function ensureStreak(userId: string) {
  return prisma.userStreak.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function ensureDailyGoal(userId: string, date = todayKey()) {
  return prisma.dailyGoal.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, targetXp: 20 },
    update: {},
  });
}

export async function awardXp(userId: string, amount: number, reason: string) {
  const date = todayKey();
  await ensureStreak(userId);
  await ensureDailyGoal(userId, date);

  await prisma.$transaction([
    prisma.xpEvent.create({ data: { userId, amount, reason } }),
    prisma.userStreak.update({
      where: { userId },
      data: { totalXp: { increment: amount } },
    }),
    prisma.dailyGoal.update({
      where: { userId_date: { userId, date } },
      data: { earnedXp: { increment: amount } },
    }),
  ]);

  const goal = await prisma.dailyGoal.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (goal && !goal.completed && goal.earnedXp >= goal.targetXp) {
    await prisma.dailyGoal.update({
      where: { userId_date: { userId, date } },
      data: { completed: true },
    });
  }

  await touchStreak(userId, date);
}

async function touchStreak(userId: string, date: string) {
  const streak = await ensureStreak(userId);
  if (streak.lastActiveDate === date) return;

  let current = 1;
  if (streak.lastActiveDate === yesterdayKey()) {
    current = streak.currentStreak + 1;
  }

  await prisma.userStreak.update({
    where: { userId },
    data: {
      currentStreak: current,
      longestStreak: Math.max(streak.longestStreak, current),
      lastActiveDate: date,
    },
  });
}

export async function getDailySummary(userId: string) {
  const date = todayKey();
  const [streak, goal] = await Promise.all([ensureStreak(userId), ensureDailyGoal(userId, date)]);
  return {
    date,
    streak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalXp: streak.totalXp,
    dailyTarget: goal.targetXp,
    dailyEarned: goal.earnedXp,
    dailyCompleted: goal.completed || goal.earnedXp >= goal.targetXp,
  };
}
