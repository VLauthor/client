import { getNotifications } from "@/lib/api/client";
import { getServerCookieHeader } from "@/lib/api/server-cookies";
import { ExportMenu } from "@/components/shared/export-menu";
import { formatDateTimeRu } from "@/lib/utils/datetime";

export default async function NotificationsPage() {
  const cookieHeader = await getServerCookieHeader();
  const items = await getNotifications({ cookieHeader });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Уведомления</h1>
      <ExportMenu
        rows={items.map((i) => ({
          title: i.title,
          kind: i.kind,
          createdAt: formatDateTimeRu(i.at),
          readAt: i.readAt ? formatDateTimeRu(i.readAt) : "",
        }))}
        filenameBase="notifications"
      />
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.kind} · {formatDateTimeRu(item.at)}
              {item.readAt ? " · прочитано" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
