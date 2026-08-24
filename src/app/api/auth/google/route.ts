import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google OAuth chưa được cấu hình trên máy chủ." }, { status: 503 });
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "wtf-elearning-dev-secret-change-in-production");
  const state = await new SignJWT({
    id: randomUUID(),
    email: "google-oauth-state",
    name: "Google OAuth state",
    role: "STUDENT",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${process.env.WEB_ORIGIN || "http://localhost:3000"}/api/auth/google/callback`;
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${query.toString()}`);
}
