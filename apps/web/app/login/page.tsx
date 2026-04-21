"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { createSupportPasswordRequestPublic } from "@/lib/api/admin";
import { isTestDataMode } from "@/lib/api/mode";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const { login, user, isReady } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@corp.local");
  const [password, setPassword] = useState(isTestDataMode() ? "Admin123!" : "password");
  const [organizationSlug, setOrganizationSlug] = useState("acme");
  const [supportMessage, setSupportMessage] = useState("");

  useEffect(() => {
    if (isReady && user) router.replace("/dashboard");
  }, [isReady, router, user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await login(
      email,
      password,
      isTestDataMode() ? undefined : organizationSlug || undefined
    );
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Успешный вход");
    router.push("/dashboard");
  };

  const onSupportRequest = async () => {
    if (!email.trim()) {
      toast.error("Введите email для заявки");
      return;
    }
    try {
      await createSupportPasswordRequestPublic({
        email: email.trim(),
        organizationSlug: organizationSlug.trim() || undefined,
        message: supportMessage.trim() || undefined,
      });
      toast.success("Заявка в поддержку отправлена");
      setSupportMessage("");
    } catch (e) {
      toast.error("Не удалось отправить заявку");
      console.error(e);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-3 flex justify-end">
        <ThemeToggle />
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Вход в систему</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Авторизуйтесь для доступа к корпоративным подпискам.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!isTestDataMode() && (
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Код организации (slug), опционально"
              value={organizationSlug}
              onChange={(e) => setOrganizationSlug(e.target.value)}
            />
          )}
          <Button className="w-full" type="submit">
            Войти
          </Button>
        </form>
        <div className="mt-4 rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-medium">Нужна смена пароля?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Отправьте заявку в поддержку. Администратор обработает её в разделе «Поддержка».
          </p>
          <textarea
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-xs"
            rows={2}
            placeholder="Комментарий к заявке (опционально)"
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
          />
          <Button className="mt-2 w-full" variant="outline" type="button" onClick={() => void onSupportRequest()}>
            Отправить заявку на смену пароля
          </Button>
        </div>
      </div>
    </main>
  );
}
