"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminAssignSubscriptionToUser,
  adminDeleteUser,
  adminGetUser,
  adminListCatalogSubscriptions,
  adminListDepartments,
  adminListRoles,
  adminListUserAssignments,
  adminPatchUser,
  adminRevokeSubscriptionAssignment,
  type AdminUserAssignment,
  type AdminDepartment,
  type AdminRole,
  type AdminUserDetail,
} from "@/lib/api/admin";
import { isTestDataMode } from "@/lib/api/mode";
import { formatMoney, formatRub, toRub } from "@/lib/utils/currency";
import { toast } from "sonner";

export default function AdminUserEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [catalog, setCatalog] = useState<{ id: string; name: string; status: string; nextPayment: string }[]>([]);
  const [assignments, setAssignments] = useState<AdminUserAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedRole, setSelectedRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d, r, a, c] = await Promise.all([
        adminGetUser(id),
        adminListDepartments(),
        adminListRoles(),
        adminListUserAssignments(id),
        adminListCatalogSubscriptions(),
      ]);
      setUser(u);
      setDepartments(d);
      setRoles(r);
      setAssignments(a);
      setFullName(u.fullName);
      setDepartmentId(u.departmentId ?? "");
      setIsActive(u.isActive);
      setSelectedRole(u.roleCodes[0] || r[0]?.code || "");
      const catalogRows = c.map((x) => ({
        id: x.id,
        name: x.name,
        status: x.status,
        nextPayment: x.nextPayment,
      }));
      setCatalog(catalogRows);
      setSelectedSubscriptionId((prev) => prev || catalogRows[0]?.id || "");
    } catch (e) {
      toast.error("Пользователь не найден или нет доступа");
      console.error(e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleCodesPayload = () => (selectedRole ? [selectedRole] : []);

  const onSave = async () => {
    const codes = roleCodesPayload();
    if (codes.length === 0) {
      toast.error("Нужна хотя бы одна роль");
      return;
    }
    setSaving(true);
    try {
      const noDept = !departmentId;
      await adminPatchUser(id, {
        fullName: fullName.trim(),
        clearDepartment: noDept,
        ...(!noDept && departmentId ? { departmentId } : {}),
        isActive,
        roleCodes: codes,
        ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
      });
      toast.success("Сохранено");
      setNewPassword("");
      await load();
    } catch (e) {
      toast.error("Ошибка сохранения");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Удалить пользователя?")) return;
    try {
      await adminDeleteUser(id);
      toast.success("Удалён");
      router.push("/admin/users");
    } catch (e) {
      toast.error("Не удалось удалить");
      console.error(e);
    }
  };

  const onAssignSubscription = async () => {
    if (!selectedSubscriptionId) return;
    setAssigning(true);
    try {
      await adminAssignSubscriptionToUser(selectedSubscriptionId, id);
      toast.success("Подписка назначена пользователю");
      await load();
    } catch (e) {
      toast.error("Не удалось назначить подписку");
      console.error(e);
    } finally {
      setAssigning(false);
    }
  };

  const onRevokeAssignment = async (row: AdminUserAssignment) => {
    try {
      await adminRevokeSubscriptionAssignment(row.subscriptionId, row.assignmentId);
      toast.success("Подписка снята");
      await load();
    } catch (e) {
      toast.error("Не удалось снять подписку");
      console.error(e);
    }
  };

  const availableForAssign = useMemo(
    () => catalog.filter((sub) => !assignments.some((a) => a.subscriptionId === sub.id)),
    [assignments, catalog]
  );

  const money = (v: number, c: string) => (c === "USD" ? formatRub(toRub(v, "USD")) : formatMoney(v, c));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Загрузка…</p>;
  }
  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Пользователь недоступен.</p>
        <Link href="/admin/users" className="text-sm text-indigo-600 hover:underline">
          ← К списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/users" className="text-sm text-indigo-600 hover:underline">
            ← Пользователи
          </Link>
          <h2 className="mt-2 text-lg font-semibold">{user.fullName}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="destructive" size="sm" type="button" onClick={() => void onDelete()}>
          Удалить
        </Button>
      </div>

      <div className="grid max-w-xl gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">ФИО</span>
          <input className="rounded-md border bg-background px-3 py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Отдел</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">— не выбран —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Активен (может входить в систему)
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Роли</span>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Смена пароля (опционально)</span>
          <input
            type="password"
            className="rounded-md border bg-background px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Новый пароль (минимум 8 символов)"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="button" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/users">Отмена</Link>
          </Button>
        </div>

        {isTestDataMode() && <p className="text-xs text-amber-700 dark:text-amber-400">Режим test: изменения не отправляются на сервер.</p>}
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-medium">Подписки пользователя</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={selectedSubscriptionId}
            onChange={(e) => setSelectedSubscriptionId(e.target.value)}
          >
            {availableForAssign.length === 0 ? <option value="">Нет свободных подписок</option> : null}
            {availableForAssign.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.status} · до {s.nextPayment}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() => void onAssignSubscription()}
            disabled={!selectedSubscriptionId || assigning || availableForAssign.length === 0}
          >
            Назначить подписку
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-3">Подписка</th>
                <th className="p-3">Статус</th>
                <th className="p-3">Срок</th>
                <th className="p-3 text-right">Стоимость</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.assignmentId} className="border-t">
                  <td className="p-3 font-medium">{a.subscriptionName}</td>
                  <td className="p-3">{a.subscriptionStatus}</td>
                  <td className="p-3">{a.nextPaymentOn}</td>
                  <td className="p-3 text-right">{money(a.costAmount, a.costCurrency)}</td>
                  <td className="p-3 text-right">
                    <button className="text-rose-600 hover:underline" onClick={() => void onRevokeAssignment(a)}>
                      Снять
                    </button>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    Активных назначений нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
