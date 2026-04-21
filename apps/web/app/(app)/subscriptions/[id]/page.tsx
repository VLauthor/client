import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { getSubscriptionById } from "@/lib/api/client";
import { getServerCookieHeader } from "@/lib/api/server-cookies";
import { formatMoney, formatRub, toRub } from "@/lib/utils/currency";

function formatCost(amount: number, currency: string) {
  if (currency === "USD") return formatRub(toRub(amount, "USD"));
  return formatMoney(amount, currency);
}

export default async function SubscriptionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieHeader = await getServerCookieHeader();
  const sub = await getSubscriptionById(id, { cookieHeader });
  if (!sub) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{sub.name}</h1>
        <StatusBadge status={sub.status} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">Категория: {sub.category}</div>
        <div className="rounded-lg border p-4">Отдел: {sub.department}</div>
        <div className="rounded-lg border p-4">
          Стоимость: {formatCost(sub.cost, sub.currency)} / {sub.billingCycle === "month" ? "мес." : "год"}
        </div>
        <div className="rounded-lg border p-4">Следующий платеж: {sub.nextPayment}</div>
      </div>
      {sub.users.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="mb-2 font-medium">Назначенные пользователи</p>
          <p className="text-sm text-muted-foreground">{sub.users.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
