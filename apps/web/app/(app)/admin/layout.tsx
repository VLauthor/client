import { AdminGate } from "@/components/admin/admin-gate";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Администрирование</h1>
          <p className="text-sm text-muted-foreground">
            Управление пользователями, отделами, подписками и аудитом организации.
          </p>
        </header>
        <AdminSubnav />
        {children}
      </div>
    </AdminGate>
  );
}
