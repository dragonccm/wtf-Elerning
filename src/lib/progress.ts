import { prisma } from "@/lib/db";
import { NodeType } from "@prisma/client";

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

export async function completeNode(userId: string, nodeId: string, score?: number, timeSpentSec = 0) {
  return prisma.progressEvent.upsert({
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
}

export async function getStudentStats(userId: string) {
  const [progress, sessions, submissions] = await Promise.all([
    prisma.progressEvent.findMany({ where: { userId, completed: true } }),
    prisma.studySession.findMany({ where: { userId } }),
    prisma.submission.findMany({ where: { userId, score: { not: null } } }),
  ]);

  const totalNodes = await prisma.lessonNode.count({
    where: { type: { not: "MILESTONE" } },
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
