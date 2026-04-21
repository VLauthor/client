"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/shared/export-menu";
import {
  adminCheckEmailAvailability,
  adminCreateUser,
  adminDeleteUser,
  adminListDepartments,
  adminListRoles,
  adminListUsers,
  type AdminDepartment,
  type AdminRole,
  type AdminUserListItem,
} from "@/lib/api/admin";
import { isTestDataMode } from "@/lib/api/mode";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [emailHint, setEmailHint] = useState<string>("");
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);

  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [sortBy, setSortBy] = useState<"fullName" | "email" | "department" | "role" | "subscriptionsCount">(
    "fullName"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d, r] = await Promise.all([adminListUsers({ limit: 100 }), adminListDepartments(), adminListRoles()]);
      setItems(u.items);
      setDepartments(d);
      setRoles(r);
      setSelectedRole((prev) => prev || r.find((x) => x.code === "employee")?.code || r[0]?.code || "");
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

  const verifyEmail = async (raw: string) => {
    const normalized = raw.trim();
    if (!normalized) {
      setEmailHint("");
      setEmailOk(null);
      return;
    }
    setEmailChecking(true);
    try {
      const res = await adminCheckEmailAvailability(normalized);
      if (!res.valid) {
        setEmailHint(res.message || "Некорректный email");
        setEmailOk(false);
        return;
      }
      if (!res.available) {
        setEmailHint("Email уже занят в базе");
        setEmailOk(false);
        return;
      }
      setEmailHint("Email свободен");
      setEmailOk(true);
    } catch (e) {
      setEmailHint("Не удалось проверить email");
      setEmailOk(false);
      console.error(e);
    } finally {
      setEmailChecking(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items
      .filter((x) => !q || x.fullName.toLowerCase().includes(q) || x.email.toLowerCase().includes(q))
      .filter((x) => filterDepartment === "all" || x.department === filterDepartment)
      .filter((x) => filterRole === "all" || x.role === filterRole);
    list.sort((a, b) => {
      let result = 0;
      if (sortBy === "fullName") result = a.fullName.localeCompare(b.fullName, "ru");
      if (sortBy === "email") result = a.email.localeCompare(b.email, "ru");
      if (sortBy === "department") result = (a.department || "").localeCompare(b.department || "", "ru");
      if (sortBy === "role") result = (a.role || "").localeCompare(b.role || "", "ru");
      if (sortBy === "subscriptionsCount") result = a.subscriptionsCount - b.subscriptionsCount;
      return sortOrder === "asc" ? result : -result;
    });
    return list;
  }, [filterDepartment, filterRole, items, search, sortBy, sortOrder]);

  const roleNames = useMemo(() => Array.from(new Set(items.map((x) => x.role).filter(Boolean))), [items]);
  const deptNames = useMemo(() => Array.from(new Set(items.map((x) => x.department).filter(Boolean))), [items]);

  const onCreate = async () => {
    if (!email.trim() || !password || !fullName.trim()) {
      toast.error("Заполните email, пароль и ФИО");
      return;
    }
    if (!selectedRole) {
      toast.error("Выберите роль");
      return;
    }
    if (emailOk !== true) {
      toast.error("Email не прошёл проверку валидности/свободности");
      return;
    }
    try {
      await adminCreateUser({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        departmentId: departmentId || undefined,
        roleCodes: [selectedRole],
      });
      toast.success("Пользователь создан");
      setEmail("");
      setPassword("");
      setFullName("");
      setDepartmentId("");
      setEmailHint("");
      setEmailOk(null);
      setSelectedRole(roles.find((x) => x.code === "employee")?.code || roles[0]?.code || "");
      await load();
    } catch (e) {
      toast.error("Не удалось создать пользователя");
      console.error(e);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Удалить пользователя? Сессии будут отозваны.")) return;
    try {
      await adminDeleteUser(id);
      toast.success("Пользователь удалён");
      await load();
    } catch (e) {
      toast.error("Не удалось удалить");
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Пользователи</h2>
        <p className="text-sm text-muted-foreground">
          Список из базы. Отдел и роли задаются из справочников организации.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-medium">Новый пользователь</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Email</span>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailOk(null);
                setEmailHint("");
              }}
              onBlur={() => void verifyEmail(email)}
              autoComplete="off"
            />
            <span
              className={`text-xs ${
                emailOk === true
                  ? "text-emerald-600"
                  : emailOk === false
                    ? "text-rose-600"
                    : "text-muted-foreground"
              }`}
            >
              {emailChecking ? "Проверка email..." : emailHint || "Проверка email выполняется по базе"}
            </span>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Пароль</span>
            <input
              type="password"
              className="rounded-md border bg-background px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">ФИО</span>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2 lg:col-span-1">
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
                  {d.code ? ` (${d.code})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2 lg:col-span-2">
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
        </div>
        <div className="mt-4">
          <Button type="button" onClick={() => void onCreate()}>
            Создать пользователя
          </Button>
        </div>
        {isTestDataMode() && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            Режим test: запросы к API не уходят, список демо-статичен.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-4 py-3">
          <h3 className="text-sm font-medium">Все пользователи</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Поиск по ФИО/почте"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="all">Все отделы</option>
              {deptNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">Все роли</option>
              {roleNames.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="fullName">Сортировка: ФИО</option>
              <option value="email">Сортировка: почта</option>
              <option value="department">Сортировка: отдел</option>
              <option value="role">Сортировка: роль</option>
              <option value="subscriptionsCount">Сортировка: подписки</option>
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
                fullName: i.fullName,
                email: i.email,
                department: i.department,
                role: i.role,
                subscriptionsCount: i.subscriptionsCount,
              }))}
              filenameBase="admin-users"
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
                  <th className="p-3 font-medium">ФИО</th>
                  <th className="p-3 font-medium">Почта</th>
                  <th className="p-3 font-medium">Отдел</th>
                  <th className="p-3 font-medium">Роль (кратко)</th>
                  <th className="p-3 font-medium text-right">Подписок</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">{item.fullName}</td>
                    <td className="p-3 text-muted-foreground">{item.email}</td>
                    <td className="p-3">{item.department || "—"}</td>
                    <td className="p-3">{item.role || "—"}</td>
                    <td className="p-3 text-right tabular-nums">{item.subscriptionsCount}</td>
                    <td className="p-3 text-right">
                      <Link className="mr-3 text-indigo-600 hover:underline" href={`/admin/users/${item.id}`}>
                        Изменить
                      </Link>
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
