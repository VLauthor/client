import { cookies } from "next/headers";

export async function getServerCookieHeader(): Promise<string | undefined> {
  const store = await cookies();
  const parts = store.getAll();
  if (parts.length === 0) return undefined;
  return parts.map((c) => `${c.name}=${c.value}`).join("; ");
}
