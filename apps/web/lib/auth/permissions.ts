import type { SessionUser } from "@/components/providers/auth-provider";

export function userCanAccessAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.roleCodes.some((c) => c === "admin" || c === "superadmin");
}

export function userCanAccessModeratorArea(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.roleCodes.some((c) => c === "admin" || c === "superadmin" || c === "manager");
}

export function hasRole(user: SessionUser | null, role: string): boolean {
  if (!user) return false;
  return user.roleCodes.includes(role);
}
