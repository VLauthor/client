import { Status } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const map: Record<Status, string> = {
  active: "bg-emerald-100 text-emerald-700",
  expiring: "bg-amber-100 text-amber-700",
  inactive: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-700",
};
const labels: Record<Status, string> = {
  active: "Активна",
  expiring: "Скоро истекает",
  inactive: "Неактивна",
  cancelled: "Отменена",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium", map[status])}>
      {labels[status]}
    </span>
  );
}
