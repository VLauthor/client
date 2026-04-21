"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminListSupportPasswordRequests,
  adminPatchSupportPasswordRequest,
  type SupportPasswordRequest,
} from "@/lib/api/admin";
import { formatDateTimeRu } from "@/lib/utils/datetime";
import { ExportMenu } from "@/components/shared/export-menu";
import { toast } from "sonner";

export default function AdminSupportPage() {
  const [rows, setRows] = useState<SupportPasswordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"" | "new" | "completed" | "rejected">("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"createdAt" | "status">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListSupportPasswordRequests({ status, search, sort, order, limit: 200 });
      setRows(res.data);
    } catch (e) {
      toast.error("Не удалось загрузить заявки");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [order, search, sort, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);

  const setStatusAction = async (id: string, s: "new" | "completed" | "rejected") => {
    try {
      await adminPatchSupportPasswordRequest(id, {
        status: s,
        ...(s === "completed" && newPasswords[id]?.trim() ? { newPassword: newPasswords[id].trim() } : {}),
      });
      toast.success("Статус обновлён");
      await load();
    } catch (e) {
      toast.error("Не удалось обновить статус");
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Поддержка</h2>
        <p className="text-sm text-muted-foreground">
          Заявки пользователей на смену пароля. Доступно только администратору.
        </p>
      </div>
      <div className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-5">
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="">Все статусы</option>
          <option value="new">Новая</option>
          <option value="completed">Выполнена</option>
          <option value="rejected">Отклонена</option>
        </select>
        <input className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Поиск по email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="createdAt">Сортировка: дата</option>
          <option value="status">Сортировка: статус</option>
        </select>
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={order} onChange={(e) => setOrder(e.target.value as typeof order)}>
          <option value="desc">По убыванию</option>
          <option value="asc">По возрастанию</option>
        </select>
      </div>
      <ExportMenu
        rows={filtered.map((r) => ({
          requestedEmail: r.requestedEmail,
          userFullName: r.userFullName,
          status: r.status,
          message: r.message,
          createdAt: r.createdAt,
        }))}
        filenameBase="support-password-requests"
      />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-3">Почта</th>
                <th className="p-3">Пользователь</th>
                <th className="p-3">Сообщение</th>
                <th className="p-3">Статус</th>
                <th className="p-3">Создана</th>
                <th className="p-3">Быстрая смена пароля</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.requestedEmail}</td>
                  <td className="p-3">{r.userFullName || "—"}</td>
                  <td className="p-3">{r.message || "—"}</td>
                  <td className="p-3">
                    {r.status === "new" ? "Новая" : r.status === "completed" ? "Выполнена" : "Отклонена"}
                  </td>
                  <td className="p-3">{formatDateTimeRu(r.createdAt)}</td>
                  <td className="p-3">
                    <input
                      className="w-48 rounded-md border bg-background px-2 py-1 text-xs"
                      type="password"
                      placeholder="Новый пароль"
                      value={newPasswords[r.id] || ""}
                      onChange={(e) => setNewPasswords((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => void setStatusAction(r.id, "rejected")}>
                        Отклонить
                      </Button>
                      <Button size="sm" onClick={() => void setStatusAction(r.id, "completed")}>
                        Выполнить
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-muted-foreground">
                    Заявок нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
