import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { homeForRole, type JwtUser } from "../lib/roles.js";
import { ensureDailyGoal, ensureStreak } from "../lib/streak.js";
import { syncIdentity } from "../lib/mongo.js";
import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

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
  app.get("/auth/google", async (_request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/auth/google/callback";
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      return reply.status(503).send({ error: "Google OAuth chưa được cấu hình trên máy chủ." });
    }

    const state = app.jwt.sign({
      id: randomUUID(),
      email: "google-oauth-state",
      name: "Google OAuth state",
      role: "STUDENT",
    } satisfies JwtUser, { expiresIn: "10m" });
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return reply.redirect(`${GOOGLE_AUTH_URL}?${query.toString()}`);
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    const frontendUrl = process.env.WEB_ORIGIN || "http://localhost:3000";
    const fail = (reason: string) => reply.redirect(`${frontendUrl}/login?error=${encodeURIComponent(reason)}`);
    if (query.error || !query.code || !query.state) return fail("Đăng nhập Google đã bị hủy.");

    try {
      const state = app.jwt.verify<JwtUser>(query.state);
      if (state.email !== "google-oauth-state") return fail("Phiên đăng nhập Google không hợp lệ.");

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/auth/google/callback";
      if (!clientId || !clientSecret) return fail("Google OAuth chưa được cấu hình.");

      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: query.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResponse.ok) return fail("Không thể xác thực với Google.");
      const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; scope?: string };
      if (!tokens.access_token) return fail("Google không trả về quyền truy cập.");

      const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileResponse.ok) return fail("Không thể đọc hồ sơ Google.");
      const profile = await profileResponse.json() as { sub?: string; email?: string; name?: string; picture?: string; email_verified?: boolean };
      if (!profile.sub || !profile.email || !profile.email_verified) return fail("Google chưa xác minh địa chỉ email này.");

      const email = profile.email.toLowerCase();
      const primaryAdmin = (process.env.PRIMARY_ADMIN_EMAIL || "lachinh5511@gmail.com").toLowerCase();
      const role = email === primaryAdmin ? "ADMIN" : undefined;
      const passwordHash = await bcrypt.hash(randomUUID(), 10);
      const encryptedAccessToken = encryptGoogleToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? encryptGoogleToken(tokens.refresh_token) : undefined;
      const user = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: profile.name || email.split("@")[0],
          avatarUrl: profile.picture,
          googleId: profile.sub,
          passwordHash,
          role: role || "STUDENT",
          googleAccessToken: encryptedAccessToken,
          googleRefreshToken: encryptedRefreshToken,
          googleScope: tokens.scope || GOOGLE_SCOPES,
        },
        update: {
          name: profile.name || undefined,
          avatarUrl: profile.picture || undefined,
          googleId: profile.sub,
          ...(role ? { role } : {}),
          googleAccessToken: encryptedAccessToken,
          ...(encryptedRefreshToken ? { googleRefreshToken: encryptedRefreshToken } : {}),
          googleScope: tokens.scope || GOOGLE_SCOPES,
        },
      });
      await Promise.all([ensureStreak(user.id), ensureDailyGoal(user.id)]);
      await syncIdentity(user);

      const token = app.jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role } satisfies JwtUser);
      const destination = new URL("/auth/google/callback", frontendUrl);
      destination.searchParams.set("token", token);
      destination.searchParams.set("home", homeForRole(user.role));
      return reply.redirect(destination.toString());
    } catch {
      return fail("Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.");
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid credentials" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.isActive) return reply.status(401).send({ error: "Email hoặc mật khẩu không đúng" });

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return reply.status(401).send({ error: "Email hoặc mật khẩu không đúng" });

    await Promise.all([ensureStreak(user.id), ensureDailyGoal(user.id)]);
    await syncIdentity(user);

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
    await syncIdentity(user);

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

function encryptGoogleToken(value: string) {
  // The database must never retain a raw Google token. The companion
  // decryption helper will only be introduced with a Drive/Gmail action.
  const key = createHash("sha256")
    .update(process.env.TOKEN_ENCRYPTION_KEY || process.env.AUTH_SECRET || "development-only-key")
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
