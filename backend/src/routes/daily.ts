import type { FastifyInstance } from "fastify";
import { getDailySummary } from "../lib/streak.js";
import { requireAuth } from "../lib/roles.js";
import type { JwtUser } from "../lib/roles.js";

export async function dailyRoutes(app: FastifyInstance) {
  app.get("/daily", { preHandler: requireAuth }, async (request) => {
    const user = request.user as JwtUser;
    return getDailySummary(user.id);
  });
}
