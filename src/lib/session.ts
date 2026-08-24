import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

async function readTokenUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get("wtf_token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "wtf-elearning-dev-secret-change-in-production");
    const { payload } = await jwtVerify(token, secret);
    const tokenUser = payload as unknown as SessionUser;
    const user = await prisma.user.findFirst({ where: { id: tokenUser.id, isActive: true }, select: { id: true, email: true, name: true, role: true } });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await readTokenUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(minRole: Role) {
  const user = await requireUser();
  const rank: Record<Role, number> = { STUDENT: 1, TEACHER: 2, ADMIN: 3 };
  if (rank[user.role] < rank[minRole]) {
    if (user.role === "ADMIN") redirect("/admin");
    if (user.role === "TEACHER") redirect("/teacher");
    redirect("/learn");
  }
  return user;
}

export async function getOptionalUser() {
  return readTokenUser();
}

export async function signSessionToken(user: { id: string; email: string; name: string; role: Role }) {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "wtf-elearning-dev-secret-change-in-production");
  return new SignJWT({ id: user.id, email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/learn";
}
