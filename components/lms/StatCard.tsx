import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: "primary" | "emerald" | "amber" | "violet" | "rose";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  }[tone];

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", toneClass)}>
          <Icon size={21} />
        </div>
      </div>
      {detail && <p className="mt-4 text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}
