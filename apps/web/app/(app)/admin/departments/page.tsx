"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminAssignSubscriptionToUser,
  adminListCatalogSubscriptions,
  adminCreateDepartment,
  adminDeleteDepartment,
  adminListDepartments,
  adminListOrganizationAssignments,
  adminListUsers,
  adminPatchDepartment,
  adminRevokeSubscriptionAssignment,
  type AdminDepartment,
} from "@/lib/api/admin";
import { isTestDataMode } from "@/lib/api/mode";
import { formatMoney } from "@/lib/utils/currency";
import { ExportMenu } from "@/components/shared/export-menu";
import { toast } from "sonner";

export default function AdminDepartmentsPage() {
  const [items, setItems] = useState<AdminDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [openDepartmentId, setOpenDepartmentId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; fullName: string; department: string }[]>([]);
  const [catalog, setCatalog] = useState<{ id: string; name: string; cost: number; currency: string }[]>([]);
  const [assignments, setAssignments] = useState<
    { assignmentId: string; subscriptionId: string; subscriptionName: string; userId: string; userName: string; departmentName: string }[]
  >([]);
  const [selectedSubId, setSelectedSubId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [deps, us, subs, as] = await Promise.all([
        adminListDepartments(),
        adminListUsers({ limit: 1000 }),
        adminListCatalogSubscriptions(),
        adminListOrganizationAssignments(),
      ]);
      setItems(deps);
      setUsers(us.items.map((u) => ({ id: u.id, fullName: u.fullName, department: u.department })));
      setCatalog(subs.map((s) => ({ id: s.id, name: s.name, cost: s.cost, currency: s.currency })));
      setAssignments(
        as.map((x) => ({
          assignmentId: x.assignmentId,
          subscriptionId: x.subscriptionId,
          subscriptionName: x.subscriptionName,
          userId: x.userId,
          userName: x.userName,
          departmentName: x.departmentName || "",
        }))
      );
      setSelectedSubId((prev) => prev || subs[0]?.id || "");
    } catch (e) {
      toast.error("Не удалось загрузить отделы");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    if (!name.trim()) {
      toast.error("Укажите название");
      return;
    }
    try {
      await adminCreateDepartment({
        name: name.trim(),
        ...(code.trim() ? { code: code.trim().toLowerCase() } : {}),
      });
      toast.success("Отдел создан");
      setName("");
      setCode("");
      await load();
    } catch (e) {
      toast.error("Не удалось создать отдел");
      console.error(e);
    }
  };

  const usersInDepartment = users.filter((u) => u.department && u.department === items.find((i) => i.id === openDepartmentId)?.name);
  const deptAssignments = assignments.filter(
    (a) => a.departmentName && a.departmentName === items.find((i) => i.id === openDepartmentId)?.name
  );

  const onAssignToDepartment = async () => {
    if (!openDepartmentId || !selectedSubId) return;
    if (usersInDepartment.length === 0) {
      toast.error("В выбранном отделе нет сотрудников");
      return;
    }
    await Promise.allSettled(usersInDepartment.map((u) => adminAssignSubscriptionToUser(selectedSubId, u.id)));
    toast.success("Подписка назначена сотрудникам отдела");
    await load();
  };

  const onRevokeFromDepartment = async (assignmentId: string, subscriptionId: string) => {
    await adminRevokeSubscriptionAssignment(subscriptionId, assignmentId);
    toast.success("Назначение снято");
    await load();
  };

  const startEdit = (d: AdminDepartment) => {
    setEditing((prev) => ({ ...prev, [d.id]: d.name }));
  };

  const saveEdit = async (id: string) => {
    const nextName = editing[id]?.trim();
    if (!nextName) return;
    try {
      await adminPatchDepartment(id, { name: nextName });
      toast.success("Сохранено");
      setEditing((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      await load();
    } catch (e) {
      toast.error("Ошибка сохранения");
      console.error(e);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Удалить отдел? У сотрудников отдел будет сброшен.")) return;
    try {
      await adminDeleteDepartment(id);
      toast.success("Отдел удалён");
      await load();
    } catch (e) {
      toast.error("Не удалось удалить");
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Отделы</h2>
        <p className="text-sm text-muted-foreground">Справочник из базы. Код опционален, должен быть уникален в организации.</p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-medium">Новый отдел</h3>
        <div className="flex flex-wrap gap-3">
          <input
            className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-40 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Код (опц.)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="button" onClick={() => void onCreate()}>
            Добавить
          </Button>
        </div>
        {isTestDataMode() && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Режим test: без реального API.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-4 py-3">
          <h3 className="text-sm font-medium">Список</h3>
          <div className="mt-2">
            <ExportMenu rows={items.map((i) => ({ id: i.id, name: i.name, code: i.code }))} filenameBase="departments" />
          </div>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          <ul className="divide-y">
            {items.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {editing[d.id] !== undefined ? (
                    <>
                      <input
                        className="max-w-md flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                        value={editing[d.id]}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      />
                      <Button size="sm" type="button" onClick={() => void saveEdit(d.id)}>
                        Сохранить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() =>
                          setEditing((p) => {
                            const n = { ...p };
                            delete n[d.id];
                            return n;
                          })
                        }
                      >
                        Отмена
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{d.name}</span>
                      {d.code ? <span className="text-xs text-muted-foreground">код: {d.code}</span> : null}
                      <Button
                        size="sm"
                        variant={openDepartmentId === d.id ? "default" : "outline"}
                        type="button"
                        onClick={() => setOpenDepartmentId((prev) => (prev === d.id ? null : d.id))}
                      >
                        {openDepartmentId === d.id ? "Закрыть карточку" : "Открыть карточку"}
                      </Button>
                      <Button size="sm" variant="outline" type="button" onClick={() => startEdit(d)}>
                        Переименовать
                      </Button>
                    </>
                  )}
                </div>
                <button type="button" className="text-sm text-rose-600 hover:underline md:shrink-0" onClick={() => void onDelete(d.id)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openDepartmentId && (
        <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-medium">
            Карточка отдела: {items.find((d) => d.id === openDepartmentId)?.name}
          </h3>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
            >
              {catalog.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatMoney(s.cost, s.currency)}
                </option>
              ))}
            </select>
            <Button onClick={() => void onAssignToDepartment()}>Оформить/назначить подписку отделу</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="p-3">Подписка</th>
                  <th className="p-3">Сотрудник</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {deptAssignments.map((a) => (
                  <tr key={a.assignmentId} className="border-t">
                    <td className="p-3 font-medium">{a.subscriptionName}</td>
                    <td className="p-3">{a.userName}</td>
                    <td className="p-3 text-right">
                      <button
                        className="text-rose-600 hover:underline"
                        onClick={() => void onRevokeFromDepartment(a.assignmentId, a.subscriptionId)}
                      >
                        Снять
                      </button>
                    </td>
                  </tr>
                ))}
                {deptAssignments.length === 0 && (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={3}>
                      На отдел пока ничего не назначено.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
