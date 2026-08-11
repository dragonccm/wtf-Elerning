import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { homeForRole, type JwtUser } from "../lib/roles.js";
import { ensureDailyGoal, ensureStreak } from "../lib/streak.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid credentials" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return reply.status(401).send({ error: "Email hoặc mật khẩu không đúng" });

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return reply.status(401).send({ error: "Email hoặc mật khẩu không đúng" });

    await Promise.all([ensureStreak(user.id), ensureDailyGoal(user.id)]);

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    } satisfies JwtUser);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      home: homeForRole(user.role),
    };
  });

  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Thông tin không hợp lệ" });

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) return reply.status(409).send({ error: "Email đã được sử dụng" });

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "STUDENT",
      },
    });

    await Promise.all([ensureStreak(user.id), ensureDailyGoal(user.id)]);

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    } satisfies JwtUser);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      home: "/learn",
    };
  });
}
