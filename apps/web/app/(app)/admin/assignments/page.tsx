"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminAssignSubscriptionToUser,
  adminListCatalogSubscriptions,
  adminListOrganizationAssignments,
  adminRevokeSubscriptionAssignment,
  type AdminOrganizationAssignment,
  adminListUsers,
} from "@/lib/api/admin";
import { FakePaymentModal } from "@/components/admin/fake-payment-modal";
import { formatMoney, formatRub, toRub } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/shared/export-menu";
import { toast } from "sonner";

function money(v: number, c: string) {
  return c === "USD" ? formatRub(toRub(v, "USD")) : formatMoney(v, c);
}

export default function AdminAssignmentsPage() {
  const [rows, setRows] = useState<AdminOrganizationAssignment[]>([]);
  const [unused, setUnused] = useState<
    { id: string; name: string; category: string; nextPayment: string; cost: number; currency: string }[]
  >([]);
  const [users, setUsers] = useState<{ id: string; fullName: string; email: string; department: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"checkout" | "assignments">("checkout");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "people" | "departments">("all");
  const [sortBy, setSortBy] = useState<"subscription" | "user" | "department" | "date">("subscription");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [durationDays, setDurationDays] = useState(30);
  const [selectedSubId, setSelectedSubId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({});
  const [selectedDepts, setSelectedDepts] = useState<Record<string, boolean>>({});
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignments, subscriptions, us] = await Promise.all([
        adminListOrganizationAssignments(),
        adminListCatalogSubscriptions(),
        adminListUsers({ limit: 1000 }),
      ]);
      setRows(assignments);
      setUsers(us.items.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, department: u.department })));
      const used = new Set(assignments.map((x) => x.subscriptionId));
      setUnused(
        subscriptions
          .filter((s) => !used.has(s.id))
          .map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            nextPayment: s.nextPayment,
            cost: s.cost,
            currency: s.currency,
          }))
      );
      setSelectedSubId((prev) => prev || subscriptions.find((s) => !used.has(s.id))?.id || subscriptions[0]?.id || "");
    } catch (e) {
      toast.error("Не удалось загрузить назначения");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows
      .filter(
        (x) =>
          !q ||
          x.subscriptionName.toLowerCase().includes(q) ||
          x.userName.toLowerCase().includes(q) ||
          x.userEmail.toLowerCase().includes(q) ||
          (x.departmentName || "").toLowerCase().includes(q)
      )
      .filter((x) => scope !== "departments" || !!x.departmentName)
      .filter((x) => scope !== "people" || !x.departmentName || x.departmentName.trim() !== "");
    list.sort((a, b) => {
      let result = 0;
      if (sortBy === "subscription") result = a.subscriptionName.localeCompare(b.subscriptionName, "ru");
      if (sortBy === "user") result = a.userName.localeCompare(b.userName, "ru");
      if (sortBy === "department") result = (a.departmentName || "").localeCompare(b.departmentName || "", "ru");
      if (sortBy === "date") result = a.nextPaymentOn.localeCompare(b.nextPaymentOn);
      return sortOrder === "asc" ? result : -result;
    });
    return list;
  }, [rows, scope, search, sortBy, sortOrder]);

  const departments = useMemo(
    () => Array.from(new Set(users.map((u) => u.department).filter(Boolean))),
    [users]
  );
  const selectedDepartmentNames = useMemo(
    () => departments.filter((d) => selectedDepts[d]),
    [departments, selectedDepts]
  );
  const recipients = useMemo(() => {
    const direct = users.filter((u) => selectedUserIds[u.id]).map((u) => u.id);
    const byDept = users.filter((u) => selectedDepartmentNames.includes(u.department)).map((u) => u.id);
    return Array.from(new Set([...direct, ...byDept]));
  }, [selectedDepartmentNames, selectedUserIds, users]);
  const catalogById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; cost: number; currency: string }>();
    for (const row of unused) map.set(row.id, row);
    for (const row of rows) {
      if (!map.has(row.subscriptionId)) {
        map.set(row.subscriptionId, {
          id: row.subscriptionId,
          name: row.subscriptionName,
          cost: row.costAmount,
          currency: row.costCurrency,
        });
      }
    }
    return map;
  }, [rows, unused]);
  const selectedCatalog = selectedSubId ? catalogById.get(selectedSubId) : undefined;
  const totalCost = useMemo(() => {
    if (!selectedCatalog) return 0;
    const base30 = selectedCatalog.cost;
    const days = Math.max(1, Number(durationDays) || 0);
    const usersCount = Math.max(1, recipients.length);
    return (base30 / 30) * days * usersCount;
  }, [durationDays, recipients.length, selectedCatalog]);
  const durationLabel = `${durationDays} дней`;

  const onCheckoutAssign = async () => {
    if (!selectedSubId || recipients.length === 0) {
      toast.error("Выберите подписку и получателей");
      return;
    }
    await Promise.allSettled(recipients.map((uid) => adminAssignSubscriptionToUser(selectedSubId, uid, durationDays)));
    toast.success("Оформление выполнено, назначения созданы");
    setSelectedUserIds({});
    setSelectedDepts({});
    setPayOpen(false);
    await load();
  };

  const onRevoke = async (row: AdminOrganizationAssignment) => {
    if (!confirm("Снять назначение подписки с пользователя?")) return;
    try {
      await adminRevokeSubscriptionAssignment(row.subscriptionId, row.assignmentId);
      toast.success("Назначение снято");
      await load();
    } catch (e) {
      toast.error("Не удалось снять назначение");
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Журнал оформления/назначение подписками</h2>
        <p className="text-sm text-muted-foreground">
          Оформление подписок и управление назначениями по сотрудникам и отделам.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "checkout" ? "default" : "outline"} onClick={() => setTab("checkout")}>
          Оформление
        </Button>
        <Button variant={tab === "assignments" ? "default" : "outline"} onClick={() => setTab("assignments")}>
          Назначение
        </Button>
      </div>

      {tab === "checkout" ? (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Подписка</span>
              <select className="rounded-md border bg-background px-3 py-2" value={selectedSubId} onChange={(e) => setSelectedSubId(e.target.value)}>
                {Array.from(catalogById.values()).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {money(s.cost, s.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Срок действия подписки</span>
              <select className="rounded-md border bg-background px-3 py-2" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))}>
                {[30, 60, 90, 180, 365].map((d) => (
                  <option key={d} value={d}>
                    {d} дней
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <p>Получателей: {recipients.length}</p>
              <p>Срок: {durationLabel}</p>
              <p className="font-medium">Итог: {money(totalCost, selectedCatalog?.currency ?? "RUB")}</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-2 text-sm font-medium">Отделы</p>
              <div className="max-h-48 space-y-2 overflow-auto text-sm">
                {departments.map((d) => (
                  <label key={d} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selectedDepts[d]}
                      onChange={(e) => setSelectedDepts((prev) => ({ ...prev, [d]: e.target.checked }))}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-2 text-sm font-medium">Пользователи</p>
              <div className="max-h-48 space-y-2 overflow-auto text-sm">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selectedUserIds[u.id]}
                      onChange={(e) => setSelectedUserIds((prev) => ({ ...prev, [u.id]: e.target.checked }))}
                    />
                    {u.fullName} <span className="text-muted-foreground">({u.department || "без отдела"})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={() => setPayOpen(true)} disabled={!selectedSubId || recipients.length === 0}>
            Оформить подписку
          </Button>
          <FakePaymentModal
            open={payOpen}
            title={selectedCatalog?.name || "Подписка"}
            periodLabel={durationLabel}
            usersCount={recipients.length}
            totalCostLabel={money(totalCost, selectedCatalog?.currency ?? "RUB")}
            onCancel={() => setPayOpen(false)}
            onSuccess={onCheckoutAssign}
          />
        </section>
      ) : (
        <section className="space-y-3">
          <div className="grid gap-2 md:grid-cols-5">
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
              placeholder="Поиск: подписка, пользователь, отдел, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="all">Все</option>
              <option value="people">По людям</option>
              <option value="departments">По отделам</option>
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="subscription">Сортировка: подписка</option>
              <option value="user">Сортировка: пользователь</option>
              <option value="department">Сортировка: отдел</option>
              <option value="date">Сортировка: срок</option>
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}>
              <option value="asc">По возрастанию</option>
              <option value="desc">По убыванию</option>
            </select>
          </div>
          <ExportMenu
            rows={filtered.map((r) => ({
              subscription: r.subscriptionName,
              user: r.userName,
              email: r.userEmail,
              department: r.departmentName,
              nextPaymentOn: r.nextPaymentOn,
              costAmount: r.costAmount,
              costCurrency: r.costCurrency,
            }))}
            filenameBase="assignments"
          />

          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Загрузка…</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="p-3">Подписка</th>
                    <th className="p-3">Пользователь</th>
                    <th className="p-3">Отдел</th>
                    <th className="p-3">Срок</th>
                    <th className="p-3 text-right">Сумма</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.assignmentId} className="border-t">
                      <td className="p-3 font-medium">{row.subscriptionName}</td>
                      <td className="p-3">
                        {row.userName}
                        <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                      </td>
                      <td className="p-3">{row.departmentName || "—"}</td>
                      <td className="p-3">{row.nextPaymentOn}</td>
                      <td className="p-3 text-right">{money(row.costAmount, row.costCurrency)}</td>
                      <td className="p-3 text-right">
                        <button className="text-rose-600 hover:underline" onClick={() => void onRevoke(row)}>
                          Снять
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-muted-foreground">
                        Назначений не найдено.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-4 py-3">
          <h3 className="text-sm font-medium">Не назначенные подписки и количество</h3>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-3">Подписка</th>
                <th className="p-3">Категория</th>
                <th className="p-3">Доступное количество</th>
                <th className="p-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {unused.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3">{row.category}</td>
                  <td className="p-3">1</td>
                  <td className="p-3 text-right">{money(row.cost, row.currency)}</td>
                </tr>
              ))}
              {unused.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-3 text-muted-foreground">
                    Неиспользуемых подписок нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
