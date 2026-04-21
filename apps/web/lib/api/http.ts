import axios, { type AxiosInstance } from "axios";

const defaultApiUrl = "http://localhost:8080/api/v1";

export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl;
}

function internalApiUrlFromEnv(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const key = "INTERNAL" + "_" + "API" + "_" + "URL";
  const v = process.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function getApiMode(): "docker" | "local" {
  const raw = (process.env.API_MODE ?? "").toLowerCase().trim();
  return raw === "docker" ? "docker" : "local";
}

export function getServerApiBaseUrl(): string {
  if (getApiMode() !== "docker") return getPublicApiBaseUrl();
  const internal = internalApiUrlFromEnv();
  return internal ?? getPublicApiBaseUrl();
}

export const apiBaseUrl = getPublicApiBaseUrl();

export const api = axios.create({
  baseURL: getPublicApiBaseUrl(),
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export function createServerApi(cookieHeader: string | undefined): AxiosInstance {
  return axios.create({
    baseURL: getServerApiBaseUrl(),
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
}
