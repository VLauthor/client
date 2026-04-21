"use client";

import { useEffect, useState } from "react";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,
  adminPatchCategory,
  type AdminCategory,
} from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/shared/export-menu";
import { toast } from "sonner";

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState<Record<string, { name: string; slug: string }>>({});

  const load = async () => {
    void adminListCategories()
      .then(setItems)
      .catch((e) => {
        toast.error("Не удалось загрузить категории");
        console.error(e);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async () => {
    if (!name.trim()) {
      toast.error("Введите название категории");
      return;
    }
    try {
      await adminCreateCategory({ name: name.trim(), slug: slug.trim() || undefined });
      setName("");
      setSlug("");
      toast.success("Категория добавлена");
      await load();
    } catch (e) {
      toast.error("Не удалось создать категорию");
      console.error(e);
    }
  };

  const onSave = async (id: string) => {
    const row = editing[id];
    if (!row || !row.name.trim()) return;
    try {
      await adminPatchCategory(id, { name: row.name.trim(), slug: row.slug.trim() || undefined });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Категория обновлена");
      await load();
    } catch (e) {
      toast.error("Не удалось обновить категорию");
      console.error(e);
    }
  };

  const updateEditingName = (id: string, nameValue: string) => {
    setEditing((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, name: nameValue } };
    });
  };

  const updateEditingSlug = (id: string, slugValue: string) => {
    setEditing((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, slug: slugValue } };
    });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Удалить категорию?")) return;
    try {
      await adminDeleteCategory(id);
      toast.success("Категория удалена");
      await load();
    } catch (e) {
      toast.error("Не удалось удалить категорию");
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Категории подписок</h2>
        <p className="text-sm text-muted-foreground">Создание, редактирование и удаление категорий из БД.</p>
      </div>

      <section className="grid gap-3 rounded-xl border bg-card p-5 shadow-sm md:grid-cols-[1fr_220px_auto]">
        <input
          className="rounded-md border bg-background px-3 py-2"
          placeholder="Название категории"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded-md border bg-background px-3 py-2"
          placeholder="slug (опц.)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Button type="button" onClick={() => void onCreate()}>
          Добавить
        </Button>
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <>
        <ExportMenu
          rows={items.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          filenameBase="subscription-categories"
        />
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          {items.map((c) => {
            const draft = editing[c.id];
            return (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              {draft ? (
                <div className="grid w-full gap-2 md:grid-cols-[1fr_220px_auto_auto]">
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={draft.name}
                    onChange={(e) => updateEditingName(c.id, e.target.value)}
                  />
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={draft.slug}
                    onChange={(e) => updateEditingSlug(c.id, e.target.value)}
                  />
                  <Button size="sm" type="button" onClick={() => void onSave(c.id)}>
                    Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      setEditing((prev) => {
                        const next = { ...prev };
                        delete next[c.id];
                        return next;
                      })
                    }
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.slug}</span>
                  <span className="w-full font-mono text-xs text-muted-foreground md:w-auto">{c.id}</span>
                  <div className="flex gap-3 text-sm">
                    <button
                      className="text-indigo-600 hover:underline"
                      onClick={() => setEditing((prev) => ({ ...prev, [c.id]: { name: c.name, slug: c.slug } }))}
                    >
                      Изменить
                    </button>
                    <button className="text-rose-600 hover:underline" onClick={() => void onDelete(c.id)}>
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </li>
          )})}
        </ul>
        </>
      )}
    </div>
  );
}
