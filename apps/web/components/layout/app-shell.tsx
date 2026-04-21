"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { hasRole, userCanAccessAdmin, userCanAccessModeratorArea } from "@/lib/auth/permissions";
import { Bell, BookOpen, Briefcase, ChartColumn, CircleUser, LayoutDashboard, Settings2, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";

const mainLinks = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Подписки", icon: BookOpen },
  { href: "/employees", label: "Сотрудники", icon: Users },
  { href: "/notifications", label: "Уведомления", icon: Bell },
  { href: "/profile", label: "Профиль", icon: CircleUser },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Обзор", icon: Shield },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/departments", label: "Отделы", icon: Briefcase },
  { href: "/admin/subscriptions", label: "Каталог подписок", icon: BookOpen },
  { href: "/admin/categories", label: "Категории", icon: Settings2 },
  { href: "/admin/support", label: "Поддержка", icon: Bell },
  { href: "/admin/audit-log", label: "Журнал аудита", icon: ChartColumn },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const showAdmin = userCanAccessAdmin(user);
  const showModeratorArea = userCanAccessModeratorArea(user);
  const isAdminOnly = hasRole(user, "admin") || hasRole(user, "superadmin");

  const onLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-r bg-muted/30 p-4">
        <p className="mb-4 text-sm font-semibold">Корпоративные подписки</p>
        <nav className="flex flex-col gap-1">
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
              <span className="inline-flex items-center gap-2">
                <link.icon className="h-4 w-4" />
                {link.label}
              </span>
            </Link>
          ))}
          {showModeratorArea && (
            <>
              <p className="mt-4 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Аналитика</p>
              <Link href="/reports" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                <span className="inline-flex items-center gap-2">
                  <ChartColumn className="h-4 w-4" />
                  Отчеты
                </span>
              </Link>
              <Link href="/admin/assignments" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                <span className="inline-flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Журнал оформления/назначений
                </span>
              </Link>
            </>
          )}
          {showAdmin && (
            <>
              <p className="mt-4 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Админка</p>
              {adminLinks.filter((l) => (l.href === "/admin/support" ? isAdminOnly : true)).map((link) => (
                <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                  <span className="inline-flex items-center gap-2">
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </span>
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="mt-auto space-y-2 pt-6">
          <ThemeToggle />
          <p className="px-3 text-xs text-muted-foreground">
            {user?.name}
            <br />
            {user?.email}
          </p>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => void onLogout()}>
            Выйти
          </Button>
        </div>
      </aside>
      <section className="bg-gradient-to-b from-muted/20 to-background p-6">{children}</section>
    </div>
  );
}
