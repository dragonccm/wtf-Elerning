import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { completeNode } from "../lib/progress.js";
import { gradeAnswers } from "../lib/scoring.js";
import { awardXp } from "../lib/streak.js";
import { requireAuth } from "../lib/roles.js";
import type { JwtUser } from "../lib/roles.js";

export async function progressRoutes(app: FastifyInstance) {
  app.post("/nodes/:nodeId/complete", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as JwtUser;
    const { nodeId } = request.params as { nodeId: string };
    const body = z
      .object({ score: z.number().optional(), timeSpentSec: z.number().min(0).max(86400).optional() })
      .parse(request.body ?? {});

    const node = await prisma.lessonNode.findFirst({
      where: {
        id: nodeId,
        unit: { course: { OR: [{ enrollments: { some: { userId: user.id } } }, { classrooms: { some: { members: { some: { userId: user.id } } } } }] } },
      },
      include: { progress: { where: { userId: user.id } } },
    });
    if (!node) return reply.status(404).send({ error: "Node not found" });
    const unfinishedPrerequisites = await prisma.lessonNode.count({
      where: {
        unitId: node.unitId,
        orderIndex: { lt: node.orderIndex },
        progress: { none: { userId: user.id, completed: true } },
      },
    });
    if (unfinishedPrerequisites > 0) {
      return reply.status(409).send({ error: "Lesson is still locked" });
    }

    await completeNode(user.id, nodeId, body.score, body.timeSpentSec ?? 0);
    const firstCompletion = !node.progress.some((progress) => progress.completed);
    if (firstCompletion) await awardXp(user.id, node.xpReward, `complete:${node.type}`);

    return { ok: true, xp: firstCompletion ? node.xpReward : 0 };
  });

  app.post("/assessments/:assessmentId/submit", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as JwtUser;
    const { assessmentId } = request.params as { assessmentId: string };
    const body = z
      .object({
        nodeId: z.string(),
        answers: z.array(z.object({ questionId: z.string(), responseJson: z.string() })),
      })
      .parse(request.body);

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        node: { unit: { course: { OR: [{ enrollments: { some: { userId: user.id } } }, { classrooms: { some: { members: { some: { userId: user.id } } } } }] } } },
      },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        node: { include: { progress: { where: { userId: user.id } } } },
      },
    });
    if (!assessment || assessment.nodeId !== body.nodeId) {
      return reply.status(404).send({ error: "Assessment not found" });
    }
    const unfinishedPrerequisites = await prisma.lessonNode.count({
      where: {
        unitId: assessment.node.unitId,
        orderIndex: { lt: assessment.node.orderIndex },
        progress: { none: { userId: user.id, completed: true } },
      },
    });
    if (unfinishedPrerequisites > 0) {
      return reply.status(409).send({ error: "Lesson is still locked" });
    }

    const allowedQuestionIds = new Set(assessment.questions.map((question) => question.id));
    if (body.answers.some((answer) => !allowedQuestionIds.has(answer.questionId))) {
      return reply.status(400).send({ error: "Invalid answer payload" });
    }

    const graded = gradeAnswers(assessment.questions, body.answers);
    const submission = await prisma.submission.create({
      data: {
        userId: user.id,
        assessmentId,
        score: graded.score,
        maxScore: graded.maxScore,
        autoGraded: true,
        status: "GRADED",
        gradedAt: new Date(),
        answers: {
          create: body.answers.map((a) => {
            const detail = graded.details.find((d) => d.questionId === a.questionId);
            return {
              questionId: a.questionId,
              responseJson: a.responseJson,
              isCorrect: detail?.isCorrect ?? false,
              pointsEarned: detail?.pointsEarned ?? 0,
            };
          }),
        },
      },
    });

    const passed = graded.percent >= assessment.passScore;
    const firstCompletion = !assessment.node.progress.some((progress) => progress.completed);
    const xp = passed && firstCompletion ? assessment.node.xpReward : 0;
    if (xp > 0) await awardXp(user.id, xp, "quiz_pass");

    if (passed) {
      await completeNode(user.id, body.nodeId, graded.percent, 600);
    }

    return { submissionId: submission.id, score: graded.score, maxScore: graded.maxScore, percent: graded.percent, xp };
  });
}
