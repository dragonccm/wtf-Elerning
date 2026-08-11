import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { getNodeStates } from "../lib/progress.js";
import { requireAuth } from "../lib/roles.js";
import type { JwtUser } from "../lib/roles.js";

export async function learnRoutes(app: FastifyInstance) {
  app.get("/learn/path", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as JwtUser;
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id },
      include: {
        course: {
          include: { units: { orderBy: { orderIndex: "asc" } } },
        },
      },
    });

    if (!enrollment) {
      return reply.status(404).send({ error: "Chưa có khóa học" });
    }

    const unit = enrollment.course.units[0];
    const nodes = unit ? await getNodeStates(user.id, unit.id) : [];

    return {
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        level: enrollment.course.level,
      },
      unit: unit
        ? { id: unit.id, title: unit.title, objective: unit.objective, orderIndex: unit.orderIndex }
        : null,
      nodes,
      lockedUnits: enrollment.course.units.slice(1).map((u) => ({
        id: u.id,
        title: u.title,
      })),
    };
  });
}
