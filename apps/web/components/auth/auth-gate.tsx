"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!user && pathname !== "/login") router.replace("/login");
  }, [isReady, pathname, router, user]);

  if (!isReady) return <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>;
  if (!user) return null;

  return <>{children}</>;
}
