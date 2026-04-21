"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ExportMenu } from "@/components/shared/export-menu";
import { getEmployees, getMySubscriptions, getSubscriptions } from "@/lib/api/client";
import { isTestDataMode } from "@/lib/api/mode";
import type { Employee, MySubscriptionRow, Subscription } from "@/lib/api/types";
import { formatDateRu } from "@/lib/utils/datetime";
import { useEffect, useMemo, useState } from "react";

function daysTo(dateString: string) {
  const target = new Date(dateString).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function statusRu(status: string) {
  if (status === "active") return "Активна";
  if (status === "expiring") return "Скоро истекает";
  if (status === "inactive") return "Неактивна";
  if (status === "cancelled") return "Отменена";
  return status;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [mySubs, setMySubs] = useState<MySubscriptionRow[]>([]);

  useEffect(() => {
    if (isTestDataMode()) {
      void getEmployees().then(setEmployees);
      void getSubscriptions().then(setSubscriptions);
      setMySubs([]);
    } else {
      void getMySubscriptions().then(setMySubs);
    }
  }, []);

  const employee = useMemo(
    () => employees.find((item) => item.email === user?.email || item.name === user?.name),
    [employees, user?.email, user?.name]
  );

  const ownSubscriptionsTest = useMemo(() => {
    if (!employee) return [];
    return subscriptions.filter((sub) => employee.subscriptions.includes(sub.id));
  }, [employee, subscriptions]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Профиль</h1>
      <div className="rounded-lg border p-4 text-sm">
        <p>ФИО: {employee?.name ?? user?.name ?? "—"}</p>
        <p>Отдел: {employee?.department ?? "—"}</p>
        <p>Почта: {employee?.email ?? user?.email ?? "—"}</p>
        <p>
          Количество подписок:{" "}
          {isTestDataMode() ? ownSubscriptionsTest.length : mySubs.length}
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="mb-3 font-medium">Мои подписки и срок до сгорания</p>
        <ExportMenu
          rows={(isTestDataMode() ? ownSubscriptionsTest : mySubs).map((sub) => ({
            name: "id" in sub ? sub.name : sub.name,
            nextPaymentOn: formatDateRu("nextPayment" in sub ? sub.nextPayment : sub.nextPaymentOn),
            status: statusRu("status" in sub ? sub.status : "active"),
          }))}
          filenameBase="profile-subscriptions"
        />
        <div className="space-y-2 text-sm">
          {isTestDataMode()
            ? ownSubscriptionsTest.map((sub) => (
                <div key={sub.id} className="rounded-md bg-muted/40 px-3 py-2">
                  <p>{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    До сгорания: {daysTo(sub.nextPayment)} дней (до {formatDateRu(sub.nextPayment)})
                  </p>
                </div>
              ))
            : mySubs.map((sub) => (
                <div key={sub.subscriptionId} className="rounded-md bg-muted/40 px-3 py-2">
                  <p>{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    До сгорания: {sub.daysUntilRenewal} дней (до {formatDateRu(sub.nextPaymentOn)}) · {statusRu(sub.status)}
                  </p>
                </div>
              ))}
          {(isTestDataMode() ? ownSubscriptionsTest : mySubs).length === 0 && (
            <p className="text-muted-foreground">Подписки не назначены.</p>
          )}
        </div>
      </div>
    </div>
  );
}
