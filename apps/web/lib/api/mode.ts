export type AppDataMode = "test" | "api";

export function getAppDataMode(): AppDataMode {
  const raw = process.env.NEXT_PUBLIC_APP_MODE ?? process.env.MODE ?? "api";
  return raw === "test" ? "test" : "api";
}

export function isTestDataMode(): boolean {
  return getAppDataMode() === "test";
}
