"use client";

import { ExportMenu } from "@/components/shared/export-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { getReports } from "@/lib/api/client";
import type { ReportData } from "@/lib/api/types";
import { userCanAccessModeratorArea } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/utils/currency";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const allowed = userCanAccessModeratorArea(user);
  const now = new Date();
  const prev = new Date(now);
  prev.setMonth(prev.getMonth() - 6);
  const [from, setFrom] = useState(isoDate(prev));
  const [to, setTo] = useState(isoDate(now));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      setData(await getReports({ from, to }));
    } catch (e) {
      toast.error("Не удалось загрузить отчёт");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [allowed, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = data?.totalSpend ?? 0;
  const avgMonthly = data && data.monthly.length > 0 ? total / data.monthly.length : 0;
  const topCategory = useMemo(
    () => (data?.byCategory ?? []).slice().sort((a, b) => b.value - a.value)[0],
    [data]
  );
  const topDepartment = useMemo(
    () => (data?.byDepartment ?? []).slice().sort((a, b) => b.value - a.value)[0],
    [data]
  );

  if (!allowed) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Доступ к отчетам есть только у модератора и администратора.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Отчеты</h1>
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[180px_180px_auto_auto] md:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Период с</span>
          <input type="date" className="rounded-md border bg-background px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Период по</span>
          <input type="date" className="rounded-md border bg-background px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => void load()}>
          Построить
        </button>
        <ExportMenu
          rows={(data?.monthly ?? []).map((m) => ({ month: m.month, value: m.value }))}
          filenameBase="reports-monthly"
        />
      </div>

      {loading || !data ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card title="Общие расходы" value={formatMoney(total, data.currency)} />
            <Card title="Среднее в месяц" value={formatMoney(avgMonthly, data.currency)} />
            <Card title="Топ категория" value={topCategory ? `${topCategory.name} (${formatMoney(topCategory.value, data.currency)})` : "—"} />
            <Card title="Топ отдел" value={topDepartment ? `${topDepartment.name} (${formatMoney(topDepartment.value, data.currency)})` : "—"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="mb-2 font-medium">Расходы по категориям</p>
              {data.byCategory.map((item) => (
                <p key={item.name} className="text-sm">
                  {item.name}: {formatMoney(item.value, data.currency)}
                </p>
              ))}
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-2 font-medium">Расходы по отделам</p>
              {data.byDepartment.map((item) => (
                <p key={item.name} className="text-sm">
                  {item.name}: {formatMoney(item.value, data.currency)}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 font-medium">Динамика затрат по месяцам</p>
            <div className="space-y-2 text-sm">
              {data.monthly.map((item) => (
                <div key={item.month} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span>{item.month}</span>
                  <span>{formatMoney(item.value, data.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
