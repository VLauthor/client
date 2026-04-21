"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { hasRole, userCanAccessAdmin, userCanAccessModeratorArea } from "@/lib/auth/permissions";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const adminAccess = userCanAccessAdmin(user);
  const moderatorAccess = userCanAccessModeratorArea(user);
  const isAssignmentsPath = pathname?.startsWith("/admin/assignments");
  const isSupportPath = pathname?.startsWith("/admin/support");
  const allowed = isAssignmentsPath ? moderatorAccess : adminAccess;
  const adminOnlyViolation = isSupportPath && !(hasRole(user, "admin") || hasRole(user, "superadmin"));

  useEffect(() => {
    if (!isReady) return;
    if (!allowed || adminOnlyViolation) router.replace("/dashboard");
  }, [isReady, user, router, allowed, adminOnlyViolation]);

  if (!isReady) {
    return <div className="p-6 text-sm text-muted-foreground">Загрузка…</div>;
  }
  if (!allowed || adminOnlyViolation) {
    return <div className="p-6 text-sm text-muted-foreground">Перенаправление…</div>;
  }

  return <>{children}</>;
}
