import { getDashboard, getNotifications } from "@/lib/api/client";
import { getServerCookieHeader } from "@/lib/api/server-cookies";
import { formatDateTimeRu } from "@/lib/utils/datetime";
import { formatMoney } from "@/lib/utils/currency";

function formatSpend(amount: number, currency: string) {
  return formatMoney(amount, currency);
}

export default async function DashboardPage() {
  const cookieHeader = await getServerCookieHeader();
  const [data, notifications] = await Promise.all([
    getDashboard({ cookieHeader }),
    getNotifications({ cookieHeader }),
  ]);
  const recentChanges = notifications.slice(0, 5).map((n) => ({
    id: n.id,
    text: n.title,
    at: formatDateTimeRu(n.at),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Активные подписки</p>
          <p className="text-2xl font-semibold">{data.totalSubscriptions}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Ежемесячные расходы</p>
          <p className="text-2xl font-semibold">{formatSpend(data.monthlySpend, data.currency)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Скоро истекают (30д)</p>
          <p className="text-2xl font-semibold">{data.expiring[0]?.count ?? 0}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="mb-3 font-medium">Ближайшие продления</p>
          <div className="space-y-2 text-sm">
            {data.upcomingRenewals.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span>{item.name}</span>
                <span>{formatSpend(item.cost, item.currency)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="mb-3 font-medium">Последние изменения</p>
          <div className="space-y-2 text-sm">
            {recentChanges.map((item) => (
              <div key={item.id} className="rounded-md bg-muted/40 px-3 py-2">
                <p>{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.at}</p>
              </div>
            ))}
            {recentChanges.length === 0 && <p className="text-xs text-muted-foreground">Изменений пока нет.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
