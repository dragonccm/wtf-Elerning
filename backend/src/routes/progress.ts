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
      .object({ score: z.number().optional(), timeSpentSec: z.number().optional(), xp: z.number().default(10) })
      .parse(request.body ?? {});

    const node = await prisma.lessonNode.findUnique({ where: { id: nodeId } });
    if (!node) return reply.status(404).send({ error: "Node not found" });

    await completeNode(user.id, nodeId, body.score, body.timeSpentSec ?? 0);
    await awardXp(user.id, body.xp, `complete:${node.type}`);

    return { ok: true, xp: body.xp };
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

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!assessment) return reply.status(404).send({ error: "Not found" });

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

    const xp = Math.max(5, Math.round(graded.percent / 10));
    await awardXp(user.id, xp, "quiz_submit");

    if (graded.percent >= assessment.passScore) {
      await completeNode(user.id, body.nodeId, graded.percent, 600);
    }

    return { submissionId: submission.id, score: graded.score, maxScore: graded.maxScore, percent: graded.percent, xp };
  });
}
