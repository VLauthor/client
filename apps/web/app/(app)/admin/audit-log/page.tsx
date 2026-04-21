"use client";

import { useCallback, useEffect, useState } from "react";
import { adminListAuditLog, type AuditLogEntry } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data, meta } = await adminListAuditLog({ page: p, limit: 30 });
      setRows(data);
      setTotalPages(meta.totalPages);
      setPage(meta.page);
    } catch (e) {
      toast.error("Не удалось загрузить журнал");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Журнал действий</h2>
        <p className="text-sm text-muted-foreground">События из audit_log (создание пользователей, подписок и т.д.).</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Время</th>
                  <th className="p-3 font-medium">Действие</th>
                  <th className="p-3 font-medium">Сущность</th>
                  <th className="p-3 font-medium">Кто</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{row.createdAt}</td>
                    <td className="p-3 font-mono text-xs">{row.action}</td>
                    <td className="p-3 text-muted-foreground">{row.entityType}</td>
                    <td className="p-3 font-mono text-xs">{row.actorUserId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
              Назад
            </Button>
            <span className="text-sm text-muted-foreground">
              Стр. {page} из {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => void load(page + 1)}>
              Вперёд
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
