import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployeeById, getSubscriptions } from "@/lib/api/client";
import { isTestDataMode } from "@/lib/api/mode";
import { getServerCookieHeader } from "@/lib/api/server-cookies";

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieHeader = await getServerCookieHeader();
  const employee = await getEmployeeById(id, { cookieHeader });
  if (!employee) return notFound();

  const subscriptions = isTestDataMode() ? await getSubscriptions({ cookieHeader }) : [];
  const assignedFromTest = subscriptions.filter((sub) => employee.subscriptions.includes(sub.id));
  const rows = employee.subscriptionRows;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{employee.name}</h1>
      <p className="text-sm text-muted-foreground">
        {employee.email} · {employee.department} · {employee.role}
      </p>
      <div className="rounded-lg border p-4">
        <p className="mb-2 font-medium">Назначенные подписки</p>
        {rows && rows.length > 0 ? (
          <ul className="list-inside list-disc text-sm">
            {rows.map((row) => (
              <li key={row.subscriptionId}>
                <Link className="text-indigo-600" href={`/subscriptions/${row.subscriptionId}`}>
                  {row.name}
                </Link>
                {" — "}
                {row.status}, до {row.nextPaymentOn} ({row.daysUntilRenewal} дн.)
              </li>
            ))}
          </ul>
        ) : assignedFromTest.length > 0 ? (
          <ul className="list-inside list-disc text-sm">
            {assignedFromTest.map((sub) => (
              <li key={sub.id}>
                <Link className="text-indigo-600" href={`/subscriptions/${sub.id}`}>
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Подписки не назначены.</p>
        )}
      </div>
    </div>
  );
}
