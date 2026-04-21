import { api } from "./http";
import { isTestDataMode } from "./mode";
import type { Subscription } from "./types";
import { dashboardData, employees, subscriptions } from "./test-data";

export type AdminDepartment = { id: string; name: string; code: string };
export type AdminRole = { id: string; code: string; name: string };
export type AdminCategory = { id: string; name: string; slug: string };

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  subscriptionsCount: number;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string;
  roleCodes: string[];
  roles: { code: string; name: string }[];
};

export type AdminEmailAvailability = {
  valid: boolean;
  available: boolean;
  message?: string;
};

export type AdminUserAssignment = {
  assignmentId: string;
  subscriptionId: string;
  subscriptionName: string;
  subscriptionStatus: string;
  nextPaymentOn: string;
  costAmount: number;
  costCurrency: string;
  billingCycle: string;
  seatCount: number;
  assignedAt: string;
};

export type AdminOrganizationAssignment = AdminUserAssignment & {
  userId: string;
  userName: string;
  userEmail: string;
  departmentName: string;
};

export type AdminSubscriptionDetails = {
  id: string;
  name: string;
  category: { id: string; name: string };
  status: string;
  ownerDepartment: { id: string; name: string } | null;
  cost: number;
  currency: string;
  billingCycle: string;
  nextPaymentOn: string;
  assignedUsers: { id: string; fullName: string; email: string }[];
};

type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

function mapSubListRow(row: {
  id: string;
  name: string;
  category: string;
  status: string;
  department: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextPaymentOn: string;
}): Subscription {
  const st = row.status === "active" || row.status === "expiring" || row.status === "inactive" || row.status === "cancelled" ? row.status : "inactive";
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: st,
    department: row.department,
    cost: row.cost,
    currency: row.currency,
    billingCycle: row.billingCycle === "year" ? "year" : "month",
    nextPayment: row.nextPaymentOn,
    users: [],
  };
}

export async function adminListDepartments(): Promise<AdminDepartment[]> {
  if (isTestDataMode()) {
    const names = Array.from(new Set(employees.map((e) => e.department)));
    return names.map((name, i) => ({ id: `d${i}`, name, code: name.toLowerCase().slice(0, 8) }));
  }
  const { data } = await api.get<{ data: AdminDepartment[] }>("/admin/departments");
  return data.data ?? [];
}

export async function adminListRoles(): Promise<AdminRole[]> {
  if (isTestDataMode()) {
    return [
      { id: "r1", code: "superadmin", name: "Суперадмин" },
      { id: "r2", code: "admin", name: "Администратор" },
      { id: "r3", code: "manager", name: "Менеджер" },
      { id: "r4", code: "employee", name: "Сотрудник" },
    ];
  }
  const { data } = await api.get<{ data: AdminRole[] }>("/admin/roles");
  return data.data ?? [];
}

export async function adminListCategories(): Promise<AdminCategory[]> {
  if (isTestDataMode()) {
    return Array.from(new Set(subscriptions.map((s) => s.category))).map((name, i) => ({
      id: `c${i}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    }));
  }
  const { data } = await api.get<{ data: AdminCategory[] }>("/admin/subscription-categories");
  return data.data ?? [];
}

export async function adminListUsers(params?: { page?: number; limit?: number }): Promise<{
  items: AdminUserListItem[];
  meta: Paginated<AdminUserListItem>["meta"];
}> {
  if (isTestDataMode()) {
    const items: AdminUserListItem[] = employees.map((e) => ({
      id: e.id,
      fullName: e.name,
      email: e.email,
      department: e.department,
      role: e.role,
      subscriptionsCount: e.subscriptions.length,
    }));
    return { items, meta: { page: 1, limit: 100, total: items.length, totalPages: 1 } };
  }
  const { data } = await api.get<Paginated<AdminUserListItem>>("/admin/users", {
    params: { page: params?.page ?? 1, limit: params?.limit ?? 100 },
  });
  return { items: data.data ?? [], meta: data.meta };
}

export async function adminGetUser(id: string): Promise<AdminUserDetail> {
  if (isTestDataMode()) {
    const e = employees.find((x) => x.id === id);
    if (!e) throw new Error("not found");
    return {
      id: e.id,
      email: e.email,
      fullName: e.name,
      isActive: true,
      departmentId: null,
      departmentName: e.department,
      roleCodes: [e.role === "Администратор" ? "admin" : "employee"],
      roles: [{ code: "employee", name: "Сотрудник" }],
    };
  }
  const { data } = await api.get<AdminUserDetail>(`/admin/users/${id}`);
  return data;
}

export async function adminCheckEmailAvailability(email: string): Promise<AdminEmailAvailability> {
  if (isTestDataMode()) {
    const valid = /.+@.+\..+/.test(email);
    return { valid, available: valid && !employees.some((e) => e.email.toLowerCase() === email.toLowerCase()) };
  }
  const { data } = await api.get<AdminEmailAvailability>("/admin/users/check-email", { params: { email } });
  return data;
}

export async function adminCreateUser(body: {
  email: string;
  password: string;
  fullName: string;
  departmentId?: string | null;
  roleCodes: string[];
}): Promise<{ id: string; email: string; fullName: string }> {
  if (isTestDataMode()) {
    return { id: `e${Date.now()}`, email: body.email, fullName: body.fullName };
  }
  const payload: Record<string, unknown> = {
    email: body.email,
    password: body.password,
    fullName: body.fullName,
    roleCodes: body.roleCodes,
  };
  if (body.departmentId) payload.departmentId = body.departmentId;
  const { data } = await api.post<{ id: string; email: string; fullName: string }>("/admin/users", payload);
  return data;
}

export async function adminPatchUser(
  id: string,
  body: {
    fullName?: string;
    departmentId?: string | null;
    clearDepartment?: boolean;
    password?: string;
    isActive?: boolean;
    roleCodes?: string[];
  }
): Promise<void> {
  if (isTestDataMode()) return;
  const payload: Record<string, unknown> = {};
  if (body.fullName !== undefined) payload.fullName = body.fullName;
  if (body.clearDepartment) payload.clearDepartment = true;
  else if (body.departmentId !== undefined && body.departmentId !== null) payload.departmentId = body.departmentId;
  if (body.password !== undefined) payload.password = body.password;
  if (body.isActive !== undefined) payload.isActive = body.isActive;
  if (body.roleCodes !== undefined) payload.roleCodes = body.roleCodes;
  await api.patch(`/admin/users/${id}`, payload);
}

export async function adminDeleteUser(id: string): Promise<void> {
  if (isTestDataMode()) return;
  await api.delete(`/admin/users/${id}`);
}

export async function adminCreateDepartment(body: { name: string; code?: string }): Promise<{ id: string }> {
  if (isTestDataMode()) return { id: `d${Date.now()}` };
  const { data } = await api.post<{ id: string }>("/admin/departments", body);
  return data;
}

export async function adminPatchDepartment(id: string, body: { name?: string; code?: string }): Promise<void> {
  if (isTestDataMode()) return;
  await api.patch(`/admin/departments/${id}`, body);
}

export async function adminDeleteDepartment(id: string): Promise<void> {
  if (isTestDataMode()) return;
  await api.delete(`/admin/departments/${id}`);
}

export async function adminListCatalogSubscriptions(): Promise<Subscription[]> {
  if (isTestDataMode()) return subscriptions;
  const { data } = await api.get<Paginated<Parameters<typeof mapSubListRow>[0]>>("/subscriptions", {
    params: { page: 1, limit: 100, status: "all" },
  });
  return (data.data ?? []).map(mapSubListRow);
}

export async function adminGetSubscriptionDetails(id: string): Promise<AdminSubscriptionDetails> {
  if (isTestDataMode()) {
    const sub = subscriptions.find((x) => x.id === id);
    if (!sub) throw new Error("not found");
    return {
      id: sub.id,
      name: sub.name,
      category: { id: "cat-test", name: sub.category },
      status: sub.status,
      ownerDepartment: sub.department ? { id: "dep-test", name: sub.department } : null,
      cost: sub.cost,
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      nextPaymentOn: sub.nextPayment,
      assignedUsers: [],
    };
  }
  const { data } = await api.get<AdminSubscriptionDetails>(`/subscriptions/${id}`);
  return data;
}

export async function adminCreateSubscription(body: {
  name: string;
  categoryId: string;
  ownerDepartmentId?: string | null;
  status: string;
  billingCycle: string;
  costAmount: number;
  costCurrency: string;
  nextPaymentOn: string;
  renewalReminderDays?: number[];
}): Promise<{ id: string }> {
  if (isTestDataMode()) return { id: `s${Date.now()}` };
  const payload = { ...body, ownerDepartmentId: body.ownerDepartmentId || undefined };
  const { data } = await api.post<{ id: string }>("/subscriptions", payload);
  return data;
}

export async function adminPatchSubscription(
  id: string,
  body: Partial<{
    name: string;
    categoryId: string;
    ownerDepartmentId: string | null;
    status: string;
    billingCycle: string;
    costAmount: number;
    costCurrency: string;
    nextPaymentOn: string;
  }>
): Promise<void> {
  if (isTestDataMode()) return;
  await api.patch(`/subscriptions/${id}`, body);
}

export async function adminDeleteSubscription(id: string): Promise<void> {
  if (isTestDataMode()) return;
  await api.delete(`/subscriptions/${id}`);
}

export async function adminAssignSubscriptionToUser(subscriptionId: string, userId: string): Promise<void> {
  if (isTestDataMode()) return;
  await api.post(`/subscriptions/${subscriptionId}/assignments`, { userId, seatCount: 1 });
}

export async function adminRevokeSubscriptionAssignment(subscriptionId: string, assignmentId: string): Promise<void> {
  if (isTestDataMode()) return;
  await api.delete(`/subscriptions/${subscriptionId}/assignments/${assignmentId}`);
}

export async function adminListUserAssignments(userId: string): Promise<AdminUserAssignment[]> {
  if (isTestDataMode()) return [];
  const { data } = await api.get<{ data: AdminUserAssignment[] }>(`/admin/users/${userId}/assignments`);
  return data.data ?? [];
}

export async function adminListOrganizationAssignments(): Promise<AdminOrganizationAssignment[]> {
  if (isTestDataMode()) return [];
  const { data } = await api.get<{ data: AdminOrganizationAssignment[] }>("/admin/assignments");
  return data.data ?? [];
}

export async function adminCreateCategory(body: { name: string; slug?: string }): Promise<AdminCategory> {
  if (isTestDataMode()) {
    return { id: `c${Date.now()}`, name: body.name, slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-") };
  }
  const { data } = await api.post<AdminCategory>("/admin/subscription-categories", body);
  return data;
}

export async function adminPatchCategory(id: string, body: { name?: string; slug?: string }): Promise<AdminCategory> {
  if (isTestDataMode()) return { id, name: body.name || "Категория", slug: body.slug || "category" };
  const { data } = await api.patch<AdminCategory>(`/admin/subscription-categories/${id}`, body);
  return data;
}

export async function adminDeleteCategory(id: string): Promise<void> {
  if (isTestDataMode()) return;
  await api.delete(`/admin/subscription-categories/${id}`);
}

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  actorUserId?: string;
  entityId?: string;
  diff?: unknown;
  createdAt: string;
};

export type SupportPasswordRequest = {
  id: string;
  userId: string;
  userFullName: string;
  requestedEmail: string;
  message: string;
  status: "new" | "completed" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export async function adminListAuditLog(params?: {
  page?: number;
  limit?: number;
  action?: string;
}): Promise<{ data: AuditLogEntry[]; meta: Paginated<AuditLogEntry>["meta"] }> {
  if (isTestDataMode()) {
    return {
      data: [
        {
          id: "1",
          action: "user.create",
          entityType: "user",
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
  }
  const { data } = await api.get<Paginated<AuditLogEntry>>("/admin/audit-log", {
    params: { page: params?.page ?? 1, limit: params?.limit ?? 50, action: params?.action },
  });
  return { data: data.data ?? [], meta: data.meta };
}

export async function adminDashboardStats(): Promise<{
  usersTotal: number;
  departmentsTotal: number;
  subscriptionsTotal: number;
  monthlySpend: number;
  currency: string;
}> {
  if (isTestDataMode()) {
    return {
      usersTotal: employees.length,
      departmentsTotal: new Set(employees.map((e) => e.department)).size,
      subscriptionsTotal: subscriptions.length,
      monthlySpend: dashboardData.monthlySpend,
      currency: dashboardData.currency,
    };
  }
  const [users, depts, dash] = await Promise.all([
    adminListUsers({ page: 1, limit: 1 }),
    adminListDepartments(),
    api.get<{
      totalSubscriptions: number;
      monthlySpend: number;
      currency: string;
    }>("/dashboard"),
  ]);
  return {
    usersTotal: users.meta.total,
    departmentsTotal: depts.length,
    subscriptionsTotal: dash.data.totalSubscriptions,
    monthlySpend: dash.data.monthlySpend,
    currency: dash.data.currency ?? "RUB",
  };
}

export async function adminListSupportPasswordRequests(params?: {
  page?: number;
  limit?: number;
  status?: "new" | "completed" | "rejected" | "";
  search?: string;
  sort?: "createdAt" | "status";
  order?: "asc" | "desc";
}): Promise<{ data: SupportPasswordRequest[]; meta: Paginated<SupportPasswordRequest>["meta"] }> {
  if (isTestDataMode()) {
    return {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }
  const { data } = await api.get<Paginated<SupportPasswordRequest>>("/admin/support/password-requests", {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      status: params?.status ?? "",
      search: params?.search ?? "",
      sort: params?.sort ?? "createdAt",
      order: params?.order ?? "desc",
    },
  });
  return { data: data.data ?? [], meta: data.meta };
}

export async function adminPatchSupportPasswordRequest(
  id: string,
  body: { status: "new" | "completed" | "rejected"; newPassword?: string }
): Promise<void> {
  if (isTestDataMode()) return;
  await api.patch(`/admin/support/password-requests/${id}`, body);
}

export async function createSupportPasswordRequestPublic(body: {
  email: string;
  organizationSlug?: string;
  message?: string;
}): Promise<void> {
  if (isTestDataMode()) return;
  await api.post("/support/password-requests/public", body);
}
