import { prisma } from "@/lib/db";

function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIME_ZONE || "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function yesterdayKey(date = new Date()) {
  const [year, month, day] = todayKey(date).split("-").map(Number);
  return todayKey(new Date(Date.UTC(year, month - 1, day - 1, 12)));
}

export async function awardXp(userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  const date = todayKey();
  const [streak] = await Promise.all([
    prisma.userStreak.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.dailyGoal.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, targetXp: 20 },
      update: {},
    }),
  ]);

  await prisma.$transaction([
    prisma.xpEvent.create({ data: { userId, amount, reason } }),
    prisma.userStreak.update({ where: { userId }, data: { totalXp: { increment: amount } } }),
    prisma.dailyGoal.update({
      where: { userId_date: { userId, date } },
      data: { earnedXp: { increment: amount } },
    }),
  ]);

  const goal = await prisma.dailyGoal.findUnique({ where: { userId_date: { userId, date } } });
  if (goal && !goal.completed && goal.earnedXp >= goal.targetXp) {
    await prisma.dailyGoal.update({ where: { userId_date: { userId, date } }, data: { completed: true } });
  }

  if (streak.lastActiveDate !== date) {
    const currentStreak = streak.lastActiveDate === yesterdayKey() ? streak.currentStreak + 1 : 1;
    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak,
        longestStreak: Math.max(streak.longestStreak, currentStreak),
        lastActiveDate: date,
      },
    });
  }
}
