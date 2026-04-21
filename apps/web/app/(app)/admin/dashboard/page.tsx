"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminDashboardStats } from "@/lib/api/admin";
import { formatMoney, formatRub, toRub } from "@/lib/utils/currency";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{
    usersTotal: number;
    departmentsTotal: number;
    subscriptionsTotal: number;
    monthlySpend: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    void adminDashboardStats()
      .then(setStats)
      .catch((e) => {
        toast.error("Не удалось загрузить статистику");
        console.error(e);
      });
  }, []);

  const spendLabel =
    stats && stats.currency === "USD" ? formatRub(toRub(stats.monthlySpend, "USD")) : stats ? formatMoney(stats.monthlySpend, stats.currency) : "—";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Обзор</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">Пользователи</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{stats?.usersTotal ?? "—"}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">Отделы</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{stats?.departmentsTotal ?? "—"}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">Подписки</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{stats?.subscriptionsTotal ?? "—"}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">Расходы / мес.</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{spendLabel}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users" className="rounded-xl border bg-card p-4 text-sm shadow-sm transition-colors hover:bg-muted/40">
          <p className="font-medium">Пользователи и роли</p>
          <p className="mt-1 text-xs text-muted-foreground">Создание, отдел из списка, роли из БД</p>
        </Link>
        <Link href="/admin/departments" className="rounded-xl border bg-card p-4 text-sm shadow-sm transition-colors hover:bg-muted/40">
          <p className="font-medium">Отделы</p>
          <p className="mt-1 text-xs text-muted-foreground">Справочник подразделений</p>
        </Link>
        <Link href="/admin/subscriptions" className="rounded-xl border bg-card p-4 text-sm shadow-sm transition-colors hover:bg-muted/40">
          <p className="font-medium">Каталог подписок</p>
          <p className="mt-1 text-xs text-muted-foreground">Суверенные записи и массовые назначения</p>
        </Link>
        <Link href="/admin/assignments" className="rounded-xl border bg-card p-4 text-sm shadow-sm transition-colors hover:bg-muted/40">
          <p className="font-medium">Управление назначениями</p>
          <p className="mt-1 text-xs text-muted-foreground">Активные и неиспользуемые подписки</p>
        </Link>
        <Link href="/admin/audit-log" className="rounded-xl border bg-card p-4 text-sm shadow-sm transition-colors hover:bg-muted/40">
          <p className="font-medium">Журнал аудита</p>
          <p className="mt-1 text-xs text-muted-foreground">Действия администраторов</p>
        </Link>
      </div>
    </div>
  );
}
