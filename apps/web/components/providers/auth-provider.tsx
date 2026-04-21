"use client";

import { demoAccounts } from "@/lib/auth/accounts";
import { apiBaseUrl } from "@/lib/api/http";
import { isTestDataMode } from "@/lib/api/mode";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleCodes: string[];
};

type MeResponse = {
  id: string;
  email: string;
  fullName: string;
  roles?: { code: string; name: string }[];
};

type LoginUserResponse = {
  id: string;
  email: string;
  fullName: string;
  roles?: { code: string; name: string }[];
};

function mapUser(u: MeResponse | LoginUserResponse): SessionUser {
  const roleEntry = u.roles?.[0];
  const role = roleEntry?.name || roleEntry?.code || "—";
  const roleCodes = (u.roles ?? []).map((r) => r.code).filter(Boolean);
  return { id: u.id, name: u.fullName, email: u.email, role, roleCodes };
}

type AuthContextType = {
  user: SessionUser | null;
  isReady: boolean;
  login: (
    email: string,
    password: string,
    organizationSlug?: string
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "subscriptions-auth-user";

async function fetchSessionFromApi(): Promise<SessionUser | null> {
  const res = await fetch(`${apiBaseUrl}/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as MeResponse;
  return mapUser(body);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async () => {
    if (isTestDataMode()) return;
    const next = await fetchSessionFromApi();
    setUser(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isTestDataMode()) {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as SessionUser;
            setUser({ ...parsed, roleCodes: parsed.roleCodes ?? [] });
          }
        } else {
          const next = await fetchSessionFromApi();
          if (!cancelled) setUser(next);
        }
      } catch {
        void 0;
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isReady,
      login: async (email, password, organizationSlug) => {
        if (isTestDataMode()) {
          const account = demoAccounts.find(
            (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
          );
          if (!account) return { ok: false, message: "Неверный email или пароль" };
          const roleCodes =
            account.email === "admin@corp.local"
              ? ["admin"]
              : account.email === "manager@corp.local"
                ? ["manager"]
                : ["employee"];
          const nextUser: SessionUser = {
            id: account.id,
            name: account.name,
            email: account.email,
            role: account.role,
            roleCodes,
          };
          setUser(nextUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
          return { ok: true };
        }

        const res = await fetch(`${apiBaseUrl}/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            email,
            password,
            ...(organizationSlug?.trim() ? { organizationSlug: organizationSlug.trim() } : {}),
          }),
        });

        if (!res.ok) {
          let message = "Не удалось войти";
          try {
            const err = (await res.json()) as { error?: { message?: string } };
            if (err.error?.message) message = err.error.message;
          } catch {
            void 0;
          }
          return { ok: false, message };
        }

        const body = (await res.json()) as { user: LoginUserResponse };
        const nextUser = mapUser(body.user);
        setUser(nextUser);
        return { ok: true };
      },
      logout: async () => {
        if (isTestDataMode()) {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        try {
          await fetch(`${apiBaseUrl}/auth/logout`, {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
        } catch {
          void 0;
        }
        setUser(null);
        await refreshSession();
      },
    }),
    [user, isReady, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
