"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { hasRole, userCanAccessAdmin } from "@/lib/auth/permissions";

const items = [
  { href: "/admin/dashboard", label: "Обзор" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/departments", label: "Отделы" },
  { href: "/admin/subscriptions", label: "Каталог подписок" },
  { href: "/admin/assignments", label: "Журнал оформления/назначений" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/support", label: "Поддержка" },
  { href: "/admin/audit-log", label: "Журнал" },
];

export function AdminSubnav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const adminAccess = userCanAccessAdmin(user);
  const adminOnly = hasRole(user, "admin") || hasRole(user, "superadmin");
  const visible = items.filter((i) => {
    if (i.href === "/admin/assignments") return true;
    if (i.href === "/admin/support") return adminOnly;
    return adminAccess;
  });
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
