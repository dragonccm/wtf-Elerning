import { prisma } from "@/lib/db";
import { NodeType } from "@prisma/client";
import { awardXp } from "@/lib/streak";

export async function getNodeStates(userId: string, unitId: string) {
  const nodes = await prisma.lessonNode.findMany({
    where: { unitId },
    orderBy: { orderIndex: "asc" },
    include: {
      progress: { where: { userId } },
    },
  });

  let unlocked = true;
  return nodes.map((node) => {
    const completed = node.progress.some((p) => p.completed);
    let state: "locked" | "current" | "completed" = "locked";
    if (completed) {
      state = "completed";
    } else if (unlocked) {
      state = "current";
      unlocked = false;
    }
    return { ...node, state };
  });
}

export function activityHref(type: NodeType, nodeId: string) {
  switch (type) {
    case "VIDEO":
      return `/learn/video/${nodeId}`;
    case "FLASHCARD":
      return `/learn/flashcards/${nodeId}`;
    case "QUIZ":
      return `/learn/quiz/${nodeId}`;
    case "ESSAY":
      return `/learn/essay/${nodeId}`;
    case "MILESTONE":
      return `/learn/milestone/${nodeId}`;
    default:
      return "/learn";
  }
}

export async function canAccessNode(userId: string, nodeId: string) {
  const node = await prisma.lessonNode.findFirst({
    where: {
      id: nodeId,
      status: "PUBLISHED",
      unit: { course: { status: "PUBLISHED", OR: [{ enrollments: { some: { userId } } }, { classrooms: { some: { members: { some: { userId } } } } }] } },
    },
    select: { unitId: true, orderIndex: true },
  });
  if (!node) return false;
  const unfinished = await prisma.lessonNode.count({
    where: { unitId: node.unitId, orderIndex: { lt: node.orderIndex }, status: "PUBLISHED", progress: { none: { userId, completed: true } } },
  });
  return unfinished === 0;
}

export async function completeNode(userId: string, nodeId: string, score?: number, timeSpentSec = 0) {
  const [node, existing] = await Promise.all([
    prisma.lessonNode.findFirst({
      where: { id: nodeId, unit: { course: { OR: [{ enrollments: { some: { userId } } }, { classrooms: { some: { members: { some: { userId } } } } }] } } },
      select: { type: true, xpReward: true, orderIndex: true, unitId: true },
    }),
    prisma.progressEvent.findUnique({ where: { userId_nodeId: { userId, nodeId } } }),
  ]);
  if (!node) throw new Error("Không tìm thấy bài học");
  const unfinishedPrerequisites = await prisma.lessonNode.count({
    where: {
      unitId: node.unitId,
      orderIndex: { lt: node.orderIndex },
      progress: { none: { userId, completed: true } },
    },
  });
  if (unfinishedPrerequisites > 0) throw new Error("Bài học này chưa được mở khóa");

  const progress = await prisma.progressEvent.upsert({
    where: { userId_nodeId: { userId, nodeId } },
    create: {
      userId,
      nodeId,
      completed: true,
      score,
      timeSpentSec,
      completedAt: new Date(),
    },
    update: {
      completed: true,
      score,
      timeSpentSec,
      completedAt: new Date(),
    },
  });
  if (!existing?.completed) await awardXp(userId, node.xpReward, `complete:${node.type}`);
  return progress;
}

export async function getStudentStats(userId: string) {
  const [progress, sessions, submissions] = await Promise.all([
    prisma.progressEvent.findMany({ where: { userId, completed: true } }),
    prisma.studySession.findMany({ where: { userId } }),
    prisma.submission.findMany({ where: { userId, score: { not: null } } }),
  ]);

  const totalNodes = await prisma.lessonNode.count({
    where: {
      type: { not: "MILESTONE" }, status: "PUBLISHED",
      unit: { course: { OR: [{ enrollments: { some: { userId } } }, { classrooms: { some: { members: { some: { userId } } } } }] } },
    },
  });

  const studySeconds = sessions.reduce((sum, s) => sum + s.durationSec, 0) +
    progress.reduce((sum, p) => sum + p.timeSpentSec, 0);

  const avgScore =
    submissions.length === 0
      ? 0
      : submissions.reduce((sum, s) => sum + (s.score ?? 0), 0) / submissions.length;

  return {
    completedLessons: progress.length,
    totalNodes,
    completionRate: totalNodes ? (progress.length / totalNodes) * 100 : 0,
    studySeconds,
    exercisesDone: submissions.length,
    averageScore: avgScore,
  };
}
