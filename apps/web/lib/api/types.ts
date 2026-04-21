export type Status = "active" | "expiring" | "inactive" | "cancelled";

export type DashboardData = {
  totalSubscriptions: number;
  monthlySpend: number;
  currency: string;
  expiring: { days: 30 | 90 | 180 | 365; count: number }[];
  upcomingRenewals: { id: string; name: string; date: string; cost: number; currency: string }[];
  recentChanges: { id: string; text: string; at: string }[];
};

export type Subscription = {
  id: string;
  name: string;
  category: string;
  status: Status;
  department: string;
  cost: number;
  currency: string;
  billingCycle: "month" | "year";
  nextPayment: string;
  users: string[];
};

export type EmployeeSubscriptionRow = {
  subscriptionId: string;
  name: string;
  status: string;
  nextPaymentOn: string;
  daysUntilRenewal: number;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  subscriptions: string[];
  subscriptionsCount?: number;
  subscriptionRows?: EmployeeSubscriptionRow[];
};

export type ReportData = {
  totalSpend: number;
  currency: string;
  byCategory: { name: string; value: number }[];
  byDepartment: { name: string; value: number }[];
  monthly: { month: string; value: number }[];
  unused: { name: string; department: string; seats: number }[];
};

export type NotificationItem = {
  id: string;
  title: string;
  kind: "renewal" | "assignment" | "change";
  at: string;
  readAt?: string | null;
};

export type MySubscriptionRow = {
  subscriptionId: string;
  name: string;
  status: string;
  nextPaymentOn: string;
  daysUntilRenewal: number;
};
