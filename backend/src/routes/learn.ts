import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { getNodeStates } from "../lib/progress.js";
import { requireAuth } from "../lib/roles.js";
import type { JwtUser } from "../lib/roles.js";

export async function learnRoutes(app: FastifyInstance) {
  app.get("/learn/path", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as JwtUser;
    const membership = await prisma.classroomMember.findFirst({
      where: { userId: user.id, classroom: { course: { status: "PUBLISHED" } } },
      include: {
        classroom: { include: { course: { include: { units: { where: { status: "PUBLISHED" }, orderBy: { orderIndex: "asc" } } } } } },
      },
    });

    if (!membership) {
      return reply.status(404).send({ error: "Chưa có khóa học" });
    }

    const course = membership.classroom.course;

    const unit = course.units[0];
    const nodes = unit ? await getNodeStates(user.id, unit.id) : [];

    return {
      course: {
        id: course.id,
        title: course.title,
        level: course.level,
      },
      unit: unit
        ? { id: unit.id, title: unit.title, objective: unit.objective, orderIndex: unit.orderIndex }
        : null,
      nodes,
      lockedUnits: course.units.slice(1).map((u) => ({
        id: u.id,
        title: u.title,
      })),
    };
  });
}
