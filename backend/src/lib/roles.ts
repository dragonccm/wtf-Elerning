import type { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

const rank: Record<Role, number> = { STUDENT: 1, TEACHER: 2, ADMIN: 3 };

export type JwtUser = { id: string; email: string; name: string; role: Role };

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

export function hasMinRole(userRole: Role, required: Role) {
  return rank[userRole] >= rank[required];
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export function requireRole(min: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    const user = request.user as JwtUser;
    if (!hasMinRole(user.role, min)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
}

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/learn";
}
