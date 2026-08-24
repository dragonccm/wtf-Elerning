import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { homeForRole, signSessionToken } from "@/lib/session";
import { ensureDailyGoal, ensureStreak } from "@/lib/streak";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const frontendUrl = process.env.WEB_ORIGIN || "http://localhost:3000";
  const fail = (reason: string) => NextResponse.redirect(`${frontendUrl}/login?error=${encodeURIComponent(reason)}`);
  if (error || !code || !state) return fail("Đăng nhập Google đã bị hủy.");

  let user: User;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "wtf-elearning-dev-secret-change-in-production");
    const { payload } = await jwtVerify(state, secret);
    if ((payload as { email?: string }).email !== "google-oauth-state") {
      return fail("Phiên đăng nhập Google không hợp lệ.");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/api/auth/google/callback`;
    if (!clientId || !clientSecret) return fail("Google OAuth chưa được cấu hình.");

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return fail("Không thể xác thực với Google.");
    const tokens = (await tokenResponse.json()) as { access_token?: string; refresh_token?: string; scope?: string };
    if (!tokens.access_token) return fail("Google không trả về quyền truy cập.");

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) return fail("Không thể đọc hồ sơ Google.");
    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };
    if (!profile.sub || !profile.email || !profile.email_verified) {
      return fail("Google chưa xác minh địa chỉ email này.");
    }

    const email = profile.email.toLowerCase();
    const primaryAdmin = (process.env.PRIMARY_ADMIN_EMAIL || "lachinh5511@gmail.com").toLowerCase();
    const role = email === primaryAdmin ? "ADMIN" : undefined;
    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const encryptedAccessToken = encryptGoogleToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encryptGoogleToken(tokens.refresh_token) : undefined;
    user = await prisma.user.upsert({
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
  } catch {
    return fail("Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.");
  }

  const token = await signSessionToken(user);
  (await cookies()).set("wtf_token", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect(homeForRole(user.role));
}
