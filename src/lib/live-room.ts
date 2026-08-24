import type { QuickQuestion } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/session";

export type LiveTally = { option: string; count: number; percent: number };

export type LiveQuestionView = {
  id: string;
  prompt: string;
  mode: "CHOICE" | "FREE";
  options: string[];
  correctOption: string | null;
  status: "OPEN" | "CLOSED";
  tallies: LiveTally[];
  totalResponses: number;
  myAnswer: string | null;
  createdAt: string;
  closedAt: string | null;
};

export type LiveData = {
  ok: true;
  memberCount: number;
  open: LiveQuestionView | null;
  recent: LiveQuestionView[];
};

function parseOptions(q: QuickQuestion): string[] {
  if (!q.optionsJson) return [];
  try {
    const v: unknown = JSON.parse(q.optionsJson);
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function buildQuestionView(q: QuickQuestion, meId: string): Promise<LiveQuestionView> {
  const options = parseOptions(q);
  const rows = await prisma.quickQuestionResponse.findMany({
    where: { questionId: q.id },
    select: { answer: true, userId: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.answer, (counts.get(r.answer) ?? 0) + 1);
  const total = rows.length;
  let entries: [string, number][];
  if (options.length > 0) {
    entries = options.map((o) => [o, counts.get(o) ?? 0]);
  } else {
    entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }
  return {
    id: q.id,
    prompt: q.prompt,
    mode: options.length > 0 ? "CHOICE" : "FREE",
    options,
    correctOption: q.correctOption,
    status: q.status,
    tallies: entries.map(([option, count]) => ({
      option,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    })),
    totalResponses: total,
    myAnswer: rows.find((r) => r.userId === meId)?.answer ?? null,
    createdAt: q.createdAt.toISOString(),
    closedAt: q.closedAt ? q.closedAt.toISOString() : null,
  };
}

export async function getLiveData(classroomId: string, meId: string): Promise<LiveData> {
  const [openQ, closedQs, memberCount] = await Promise.all([
    prisma.quickQuestion.findFirst({ where: { classroomId, status: "OPEN" } }),
    prisma.quickQuestion.findMany({
      where: { classroomId, status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      take: 10,
    }),
    prisma.classroomMember.count({ where: { classroomId } }),
  ]);
  return {
    ok: true,
    memberCount,
    open: openQ ? await buildQuestionView(openQ, meId) : null,
    recent: await Promise.all(closedQs.map((q) => buildQuestionView(q, meId))),
  };
}

export async function assertTeacherOf(classroomId: string, user: SessionUser) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw new Error("Không tìm thấy lớp học");
  if (user.role !== "ADMIN" && classroom.teacherId !== user.id) {
    throw new Error("Bạn không có quyền với lớp này");
  }
  return classroom;
}

export async function assertMemberOf(classroomId: string, userId: string) {
  const m = await prisma.classroomMember.findUnique({
    where: { classroomId_userId: { classroomId, userId } },
  });
  if (!m) throw new Error("Bạn không phải thành viên của lớp này");
}
