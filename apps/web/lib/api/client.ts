import { api, createServerApi } from "./http";
import { isTestDataMode } from "./mode";
import { dashboardData, employees, notifications, reportsData, subscriptions } from "./test-data";
import type {
  DashboardData,
  Employee,
  EmployeeSubscriptionRow,
  MySubscriptionRow,
  NotificationItem,
  ReportData,
  Status,
  Subscription,
} from "./types";

export type ApiRequestContext = {
  cookieHeader?: string | undefined;
};

function http(ctx?: ApiRequestContext) {
  if (typeof window === "undefined") {
    return createServerApi(ctx?.cookieHeader);
  }
  return api;
}

export function getCurrentMode() {
  return isTestDataMode() ? "test" : "api";
}

function mapStatus(s: string): Status {
  if (s === "active" || s === "expiring" || s === "inactive" || s === "cancelled") return s;
  return "inactive";
}

type Paginated<T> = { data: T[]; meta?: { page: number; limit: number; total: number; totalPages: number } };

function mapDashboardFromApi(raw: Record<string, unknown>): DashboardData {
  const expiringRaw = (raw.expiring as { days: number; count: number }[]) ?? [];
  const byDays = new Map(expiringRaw.map((e) => [e.days, e.count]));
  const expiring: DashboardData["expiring"] = [30, 90, 180, 365].map((days) => ({
    days: days as 30 | 90 | 180 | 365,
    count: byDays.get(days) ?? 0,
  }));
  const currency = String(raw.currency ?? "RUB");
  const upcomingRaw =
    (raw.upcomingRenewals as {
      id: string;
      name: string;
      date: string;
      cost: number;
      currency?: string;
    }[]) ?? [];
  const upcomingRenewals = upcomingRaw.map((u) => ({
    ...u,
    currency: u.currency ?? currency,
  }));
  const recentChanges = (raw.recentChanges as { id: string; text: string; at: string }[]) ?? [];
  return {
    totalSubscriptions: Number(raw.totalSubscriptions ?? 0),
    monthlySpend: Number(raw.monthlySpend ?? 0),
    currency,
    expiring,
    upcomingRenewals,
    recentChanges,
  };
}

type ApiSubscriptionListRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  department: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextPaymentOn: string;
};

function mapSubscriptionListRow(row: ApiSubscriptionListRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: mapStatus(row.status),
    department: row.department ?? "",
    cost: Number(row.cost ?? 0),
    currency: row.currency ?? "RUB",
    billingCycle: row.billingCycle === "year" ? "year" : "month",
    nextPayment: row.nextPaymentOn ?? "",
    users: [],
  };
}

type ApiCategory = { id: string; name: string };
type ApiDepartment = { id: string; name: string } | null;
type ApiAssignedUser = { id: string; fullName: string; email: string };

type ApiSubscriptionDetail = {
  id: string;
  name: string;
  category: string | ApiCategory;
  status: string;
  ownerDepartment: ApiDepartment;
  cost: number;
  currency: string;
  billingCycle: string;
  nextPaymentOn: string;
  assignedUsers?: ApiAssignedUser[];
};

function mapSubscriptionDetail(d: ApiSubscriptionDetail): Subscription {
  const category =
    typeof d.category === "string" ? d.category : (d.category?.name ?? "");
  return {
    id: d.id,
    name: d.name,
    category,
    status: mapStatus(d.status),
    department: d.ownerDepartment?.name ?? "",
    cost: Number(d.cost ?? 0),
    currency: d.currency ?? "RUB",
    billingCycle: d.billingCycle === "year" ? "year" : "month",
    nextPayment: d.nextPaymentOn ?? "",
    users: (d.assignedUsers ?? []).map((u) => u.fullName),
  };
}

type ApiEmployeeListRow = {
  id: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  subscriptionsCount: number;
};

function mapEmployeeListRow(e: ApiEmployeeListRow): Employee {
  return {
    id: e.id,
    name: e.fullName,
    email: e.email,
    role: e.role,
    department: e.department ?? "",
    subscriptions: [],
    subscriptionsCount: e.subscriptionsCount,
  };
}

type ApiEmployeeDetail = {
  id: string;
  fullName: string;
  email: string;
  department: string;
  subscriptions: { data: EmployeeSubscriptionRow[] };
};

function mapEmployeeDetail(e: ApiEmployeeDetail): Employee {
  const rows = e.subscriptions?.data ?? [];
  return {
    id: e.id,
    name: e.fullName,
    email: e.email,
    role: "—",
    department: e.department ?? "",
    subscriptions: rows.map((r) => r.subscriptionId),
    subscriptionRows: rows,
  };
}

type ApiReportSummary = {
  totalSpend: number;
  currency: string;
  byCategory: { name: string; value: number }[];
  byDepartment: { name: string; value: number }[];
  monthly: { month: string; value: number }[];
  unused: unknown[];
};

function mapReportFromApi(raw: ApiReportSummary): ReportData {
  const unusedRaw = (raw.unused ?? []) as { name?: string; department?: string; seats?: number }[];
  const unused = unusedRaw.map((u) => ({
    name: String(u.name ?? "—"),
    department: String(u.department ?? "—"),
    seats: Number(u.seats ?? 0),
  }));
  return {
    totalSpend: Number(raw.totalSpend ?? 0),
    currency: raw.currency ?? "RUB",
    byCategory: raw.byCategory ?? [],
    byDepartment: raw.byDepartment ?? [],
    monthly: raw.monthly ?? [],
    unused,
  };
}

type ApiNotification = {
  id: string;
  kind: string;
  title: string;
  readAt: string | null;
  createdAt: string;
};

function mapNotification(n: ApiNotification): NotificationItem {
  const kind = n.kind === "renewal" || n.kind === "assignment" || n.kind === "change" ? n.kind : "change";
  return {
    id: n.id,
    title: n.title,
    kind,
    at: n.createdAt,
    readAt: n.readAt,
  };
}

function reportRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

type GetReportsParams = {
  from?: string;
  to?: string;
};

export async function getDashboard(ctx?: ApiRequestContext): Promise<DashboardData> {
  if (isTestDataMode()) return dashboardData;
  const { data } = await http(ctx).get<Record<string, unknown>>("/dashboard");
  return mapDashboardFromApi(data);
}

export async function getSubscriptions(ctx?: ApiRequestContext): Promise<Subscription[]> {
  if (isTestDataMode()) return subscriptions;
  const { data } = await http(ctx).get<Paginated<ApiSubscriptionListRow>>("/subscriptions", {
    params: { page: 1, limit: 100, status: "all" },
  });
  return (data.data ?? []).map(mapSubscriptionListRow);
}

export async function getSubscriptionById(id: string, ctx?: ApiRequestContext): Promise<Subscription | null> {
  if (isTestDataMode()) return subscriptions.find((item) => item.id === id) ?? null;
  try {
    const { data } = await http(ctx).get<ApiSubscriptionDetail>(`/subscriptions/${id}`);
    return mapSubscriptionDetail(data);
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 404) return null;
    throw e;
  }
}

export async function getEmployees(ctx?: ApiRequestContext): Promise<Employee[]> {
  if (isTestDataMode()) return employees;
  const { data } = await http(ctx).get<Paginated<ApiEmployeeListRow>>("/employees", {
    params: { page: 1, limit: 100 },
  });
  return (data.data ?? []).map(mapEmployeeListRow);
}

export async function getEmployeeById(id: string, ctx?: ApiRequestContext): Promise<Employee | null> {
  if (isTestDataMode()) return employees.find((item) => item.id === id) ?? null;
  try {
    const { data } = await http(ctx).get<ApiEmployeeDetail>(`/employees/${id}`);
    return mapEmployeeDetail(data);
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 404) return null;
    throw e;
  }
}

export async function getReports(ctxOrParams?: ApiRequestContext | GetReportsParams, maybeParams?: GetReportsParams): Promise<ReportData> {
  if (isTestDataMode()) return reportsData;
  const ctx = (ctxOrParams && "cookieHeader" in ctxOrParams ? ctxOrParams : undefined) as ApiRequestContext | undefined;
  const explicit = (ctx ? maybeParams : ctxOrParams) as GetReportsParams | undefined;
  const defaults = reportRange();
  const from = explicit?.from ?? defaults.from;
  const to = explicit?.to ?? defaults.to;
  const { data } = await http(ctx).get<ApiReportSummary>("/reports/summary", {
    params: { from, to },
  });
  return mapReportFromApi(data);
}

export async function getNotifications(ctx?: ApiRequestContext): Promise<NotificationItem[]> {
  if (isTestDataMode()) return notifications;
  const { data } = await http(ctx).get<Paginated<ApiNotification>>("/notifications", {
    params: { page: 1, limit: 100 },
  });
  return (data.data ?? []).map(mapNotification);
}

export async function getMySubscriptions(): Promise<MySubscriptionRow[]> {
  if (isTestDataMode()) return [];
  const { data } = await api.get<{ data: MySubscriptionRow[] }>("/me/subscriptions");
  return data.data ?? [];
}
