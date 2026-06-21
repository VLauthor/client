 "use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ExportMenu } from "@/components/shared/export-menu";
import { getMySubscriptions, getSubscriptions } from "@/lib/api/client";
import { type Subscription } from "@/lib/api/types";
import { formatRub, toRub } from "@/lib/utils/currency";
import { formatDateRu } from "@/lib/utils/datetime";
import { useAuth } from "@/components/providers/auth-provider";

type SortKey = "name" | "nextPayment" | "cost";

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Subscription[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("nextPayment");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const load = async () => {
      const roleCodes = user?.roleCodes ?? [];
      if (roleCodes.includes("employee") && !roleCodes.includes("manager") && !roleCodes.includes("admin") && !roleCodes.includes("superadmin")) {
        const my = await getMySubscriptions();
        const mapped: Subscription[] = my.map((x) => ({
          id: x.subscriptionId,
          name: x.name,
          category: "—",
          status: (x.status as Subscription["status"]) || "active",
          department: "—",
          cost: 0,
          currency: "RUB",
          billingCycle: "month",
          nextPayment: x.nextPaymentOn,
          users: [],
        }));
        setItems(mapped);
        return;
      }
      const all = await getSubscriptions();
      setItems(all);
    };
    void load();
  }, [user?.roleCodes]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    const next = items
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => item.name.toLowerCase().includes(normalizedQuery));

    next.sort((a, b) => {
      let result = 0;
      if (sortBy === "name") result = a.name.localeCompare(b.name, "ru");
      if (sortBy === "nextPayment") result = a.nextPayment.localeCompare(b.nextPayment);
      if (sortBy === "cost") result = toRub(a.cost, a.currency) - toRub(b.cost, b.currency);
      return sortOrder === "asc" ? result : -result;
    });

    return next;
  }, [items, query, sortBy, sortOrder, status]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Подписки</h1>
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Поиск по названию"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="expiring">Скоро истекают</option>
          <option value="inactive">Неактивные</option>
          <option value="cancelled">Отменённые</option>
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortKey)}
        >
          <option value="nextPayment">Сортировка: дата продления</option>
          <option value="cost">Сортировка: стоимость</option>
          <option value="name">Сортировка: название</option>
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
        >
          <option value="asc">По возрастанию</option>
          <option value="desc">По убыванию</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <div className="border-b bg-muted/20 p-2">
          <ExportMenu
            rows={filteredItems.map((i) => ({
              name: i.name,
              category: i.category,
              status: i.status,
              department: i.department,
              nextPayment: formatDateRu(i.nextPayment),
            }))}
            filenameBase="subscriptions"
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Категория</th>
              <th className="p-3 text-left">Статус</th>
              <th className="p-3 text-left">Отдел</th>
              <th className="p-3 text-left">Стоимость</th>
              <th className="p-3 text-left">След. платеж</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">
                  <Link className="text-indigo-600" href={`/subscriptions/${item.id}`}>
                    {item.name}
                  </Link>
                </td>
                <td className="p-3">{item.category}</td>
                <td className="p-3">
                  <StatusBadge status={item.status} date={item.nextPayment} />
                </td>
                <td className="p-3">{item.department}</td>
                <td className="p-3">{item.cost > 0 ? formatRub(toRub(item.cost, item.currency)) : "—"}</td>
                <td className="p-3">{formatDateRu(item.nextPayment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
