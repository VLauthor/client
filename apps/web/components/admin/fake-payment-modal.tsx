"use client";

import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  periodLabel: string;
  usersCount: number;
  totalCostLabel: string;
  onCancel: () => void;
  onSuccess: () => Promise<void>;
};

function normalizeCard(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16);
}

function formatCard(raw: string) {
  return normalizeCard(raw).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function luhnCheck(raw: string) {
  const digits = normalizeCard(raw);
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function FakePaymentModal(props: Props) {
  const { open, onCancel, onSuccess, title, periodLabel, usersCount, totalCostLabel } = props;
  const [cardNumber, setCardNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [owner, setOwner] = useState("");
  const [email, setEmail] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState("");

  const cardOk = useMemo(() => luhnCheck(cardNumber), [cardNumber]);
  const expOk = /^\d{2}\/\d{2}$/.test(exp);
  const cvvOk = /^\d{3}$/.test(cvv);
  const emailOk = /.+@.+\..+/.test(email);
  const ownerOk = owner.trim().length > 2;
  const canPay = cardOk && expOk && cvvOk && emailOk && ownerOk;

  if (!open) return null;

  const handlePay = async () => {
    setError("");
    if (!canPay) {
      setError("Заполните данные карты корректно.");
      return;
    }
    setIsPaying(true);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await onSuccess();
      setIsPaid(true);
    } catch {
      setError("Не удалось завершить назначение после оплаты.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-background p-5 shadow-2xl">
        {!isPaid ? (
          <>
            <h3 className="text-lg font-semibold">Оформление подписки</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Проверьте заказ и оплатите, чтобы назначить подписку получателям.
            </p>
            <div className="mt-4 grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <p>Название: {title}</p>
              <p>Срок актуальности: {periodLabel}</p>
              <p>Получателей: {usersCount}</p>
              <p className="font-medium">Итоговая стоимость: {totalCostLabel}</p>
            </div>

            <div className="mt-4">
              <div
                className={`rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white transition-all duration-500 ${isPaying ? "scale-[1.01] opacity-80" : ""}`}
              >
                <p className="text-xs uppercase tracking-wide text-slate-300">Платежная карта</p>
                <p className="mt-6 font-mono text-lg tracking-widest">
                  {formatCard(cardNumber) || "•••• •••• •••• ••••"}
                </p>
                <div className="mt-4 flex justify-between text-xs text-slate-300">
                  <span>{owner || "CARD HOLDER"}</span>
                  <span>{exp || "MM/YY"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Номер карты</span>
                <input
                  className="rounded-md border bg-background px-3 py-2 font-mono"
                  value={formatCard(cardNumber)}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Владелец карты</span>
                <input
                  className="rounded-md border bg-background px-3 py-2"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value.toUpperCase())}
                  placeholder="IVAN IVANOV"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Срок действия (MM/YY)</span>
                <input
                  className="rounded-md border bg-background px-3 py-2 font-mono"
                  value={exp}
                  onChange={(e) => setExp(e.target.value.slice(0, 5))}
                  placeholder="12/30"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">CVV</span>
                <input
                  className="rounded-md border bg-background px-3 py-2 font-mono"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="***"
                />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-muted-foreground">Email для чека</span>
                <input
                  className="rounded-md border bg-background px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={onCancel} disabled={isPaying}>
                Отмена
              </Button>
              <Button type="button" onClick={() => void handlePay()} disabled={isPaying}>
                {isPaying ? "Обработка оплаты..." : "Оплатить и назначить"}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Оплата прошла успешно. Подписка назначена получателям.
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={onCancel}>
                Вернуться к ресурсу
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
