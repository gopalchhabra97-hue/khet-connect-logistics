import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function DashboardCard({
  label,
  title,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  tint,
  className,
}: {
  label?: string;
  title?: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "leaf" | "info" | "warning" | "muted";
  tint?: string;
  className?: string;
}) {
  const displayLabel = label ?? title ?? "";
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    leaf: "bg-leaf/20 text-primary",
    info: "bg-info/12 text-info",
    warning: "bg-warning/18 text-warning-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className={cn("surface-panel p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{displayLabel}</p>
        <span className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}>
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DemoTag({ label = "Demo Forecast" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-info/40 bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
      {label}
    </span>
  );
}
