 "use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEmployees } from "@/lib/api/client";
import { type Employee } from "@/lib/api/types";

type SortKey = "name" | "department" | "role" | "subscriptions";

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [department, setDepartment] = useState("all");
  const [role, setRole] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    void getEmployees().then(setItems);
  }, []);

  const departments = useMemo(
    () => ["all", ...new Set(items.map((item) => item.department))],
    [items]
  );
  const roles = useMemo(() => ["all", ...new Set(items.map((item) => item.role))], [items]);

  const filteredItems = useMemo(() => {
    const next = items
      .filter((item) => department === "all" || item.department === department)
      .filter((item) => role === "all" || item.role === role);

    next.sort((a, b) => {
      let result = 0;
      if (sortBy === "name") result = a.name.localeCompare(b.name, "ru");
      if (sortBy === "department") result = a.department.localeCompare(b.department, "ru");
      if (sortBy === "role") result = a.role.localeCompare(b.role, "ru");
      if (sortBy === "subscriptions")
        result =
          (a.subscriptionsCount ?? a.subscriptions.length) - (b.subscriptionsCount ?? b.subscriptions.length);
      return sortOrder === "asc" ? result : -result;
    });

    return next;
  }, [department, items, role, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Сотрудники</h1>
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          {departments.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Все отделы" : item}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Все роли" : item}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortKey)}
        >
          <option value="name">Сортировка: ФИО</option>
          <option value="department">Сортировка: отдел</option>
          <option value="role">Сортировка: роль</option>
          <option value="subscriptions">Сортировка: кол-во подписок</option>
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
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left">ФИО</th>
              <th className="p-3 text-left">Почта</th>
              <th className="p-3 text-left">Отдел</th>
              <th className="p-3 text-left">Роль</th>
              <th className="p-3 text-left">Подписок</th>
              <th className="p-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.email}</td>
                <td className="p-3">{item.department}</td>
                <td className="p-3">{item.role}</td>
                <td className="p-3">{item.subscriptionsCount ?? item.subscriptions.length}</td>
                <td className="p-3">
                  <Link className="text-indigo-600" href={`/employees/${item.id}`}>
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
