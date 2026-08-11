import type { FastifyInstance } from "fastify";
import { getStudentStats } from "../lib/progress.js";
import { getDailySummary } from "../lib/streak.js";
import { requireAuth } from "../lib/roles.js";
import type { JwtUser } from "../lib/roles.js";

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: requireAuth }, async (request) => {
    const user = request.user as JwtUser;
    const [stats, daily] = await Promise.all([getStudentStats(user.id), getDailySummary(user.id)]);
    return { user, stats, daily };
  });
}
