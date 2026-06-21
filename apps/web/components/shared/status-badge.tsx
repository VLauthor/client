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

export function StatusBadge({ status, date }: { status: Status, date: Date | string }) {
  if (typeof date == 'string') {
    date = new Date(date)
  }
  if (new Date() > date)
    return (
      <span className={cn("rounded-full px-2 py-1 text-xs font-medium", map['inactive'])}>
        {labels['inactive']}
      </span>
    );
  date.setDate(date.getDate() - 14)
  if (new Date() > date)
    return (
      <span className={cn("rounded-full px-2 py-1 text-xs font-medium", map['expiring'])}>
        {labels['expiring']}
      </span>
    );
  return (
    <span className={cn("rounded-full px-2 py-1 text-xs font-medium", map['active'])}>
      {labels['active']}
    </span>
  );
}
