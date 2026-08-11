import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

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
    return payload as unknown as SessionUser;
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
