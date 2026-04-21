"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/shared/export-menu";
import {
  adminCreateSubscription,
  adminDeleteSubscription,
  adminListCategories,
  adminListCatalogSubscriptions,
  type AdminCategory,
} from "@/lib/api/admin";
import type { Subscription } from "@/lib/api/types";
import { formatMoney } from "@/lib/utils/currency";
import { isTestDataMode } from "@/lib/api/mode";
import { toast } from "sonner";

function formatCost(amount: number, currency: string) {
  return formatMoney(amount, currency);
}

function plusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const currencies = ["RUB", "USD", "EUR", "GBP", "CNY"];

export default function AdminSubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costAmount, setCostAmount] = useState("0");
  const [costCurrency, setCostCurrency] = useState("RUB");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "category" | "currency" | "cost">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, cats] = await Promise.all([
        adminListCatalogSubscriptions(),
        adminListCategories(),
      ]);
      setItems(subs);
      setCategories(cats);
      setCategoryId((prev) => prev || (cats[0]?.id ?? ""));
    } catch (e) {
      toast.error("Не удалось загрузить данные");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    if (!name.trim() || !categoryId) {
      toast.error("Заполните название и категорию");
      return;
    }
    const cost = Number(costAmount);
    if (Number.isNaN(cost) || cost < 0) {
      toast.error("Некорректная стоимость");
      return;
    }
    try {
      await adminCreateSubscription({
        name: name.trim(),
        categoryId,
        ownerDepartmentId: undefined,
        status: "active",
        billingCycle: "month",
        costAmount: cost,
        costCurrency: costCurrency.trim().toUpperCase() || "RUB",
        nextPaymentOn: plusDays(30),
        renewalReminderDays: [7, 14, 30],
      });
      toast.success("Запись каталога создана");
      setName("");
      setCostAmount("0");
      await load();
    } catch (e) {
      toast.error("Не удалось создать подписку");
      console.error(e);
    }
  };

  const onDelete = async (subId: string) => {
    if (!confirm("Удалить подписку (мягкое удаление)?")) return;
    try {
      await adminDeleteSubscription(subId);
      toast.success("Удалено");
      await load();
    } catch (e) {
      toast.error("Ошибка удаления");
      console.error(e);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCategory = filterCategory === "all" ? null : categories.find((c) => c.id === filterCategory)?.name;
    const list = items
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .filter((s) => !byCategory || s.category === byCategory);
    list.sort((a, b) => {
      let result = 0;
      if (sortBy === "name") result = a.name.localeCompare(b.name, "ru");
      if (sortBy === "category") result = a.category.localeCompare(b.category, "ru");
      if (sortBy === "currency") result = a.currency.localeCompare(b.currency, "ru");
      if (sortBy === "cost") result = a.cost - b.cost;
      return sortOrder === "asc" ? result : -result;
    });
    return list;
  }, [categories, filterCategory, items, search, sortBy, sortOrder]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Каталог подписок</h2>
        <p className="text-sm text-muted-foreground">
          Суверенная сущность подписок: создается один раз и затем массово назначается сотрудникам/отделам.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-medium">Новая запись каталога</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Название</span>
            <input className="rounded-md border bg-background px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Категория</span>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.length === 0 ? <option value="">— нет категорий —</option> : null}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Сумма</span>
            <input className="rounded-md border bg-background px-3 py-2" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Валюта</span>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={costCurrency}
              onChange={(e) => setCostCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={() => void onCreate()} className="mr-2">
            Создать
          </Button>
        </div>
        {isTestDataMode() && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Режим test: без записи в API.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-4 py-3">
          <h3 className="text-sm font-medium">Все подписки</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Поиск по названию"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="name">Сортировка: название</option>
              <option value="category">Сортировка: категория</option>
              <option value="currency">Сортировка: валюта</option>
              <option value="cost">Сортировка: сумма</option>
            </select>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            >
              <option value="asc">По возрастанию</option>
              <option value="desc">По убыванию</option>
            </select>
          </div>
          <div className="mt-2">
            <ExportMenu
              rows={filteredItems.map((i) => ({
                name: i.name,
                category: i.category,
                cost: i.cost,
                currency: i.currency,
              }))}
              filenameBase="catalog-subscriptions"
            />
          </div>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Название</th>
                  <th className="p-3 font-medium">Категория</th>
                  <th className="p-3 font-medium text-right">Сумма</th>
                  <th className="p-3 font-medium">Валюта</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      <Link href={`/subscriptions/${item.id}`} className="font-medium text-indigo-600 hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{item.category}</td>
                    <td className="p-3 text-right tabular-nums">{formatCost(item.cost, item.currency)}</td>
                    <td className="p-3">{item.currency}</td>
                    <td className="p-3 text-right">
                      <button type="button" className="text-rose-600 hover:underline" onClick={() => void onDelete(item.id)}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
