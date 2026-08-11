import { Role } from "@prisma/client";

const rank: Record<Role, number> = {
  STUDENT: 1,
  TEACHER: 2,
  ADMIN: 3,
};

export function hasMinRole(userRole: Role, required: Role) {
  return rank[userRole] >= rank[required];
}

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/learn";
}
