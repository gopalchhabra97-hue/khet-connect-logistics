import {
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  XCircle,
  Boxes,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BatchStatus, DriverStatus, OrderStatus } from "@/types";

type AnyStatus = OrderStatus | BatchStatus | DriverStatus | "Available" | "Unavailable";

const MAP: Record<string, { cls: string; Icon: LucideIcon }> = {
  Pending: { cls: "bg-warning/15 text-warning-foreground border-warning/40", Icon: Clock },
  Accepted: { cls: "bg-success/12 text-success border-success/40", Icon: CheckCircle2 },
  Rejected: { cls: "bg-destructive/12 text-destructive border-destructive/40", Icon: XCircle },
  Preparing: { cls: "bg-info/12 text-info border-info/40", Icon: Boxes },
  Planned: { cls: "bg-info/12 text-info border-info/40", Icon: Boxes },
  Assigned: { cls: "bg-info/12 text-info border-info/40", Icon: PackageCheck },
  "Picked Up": { cls: "bg-primary/12 text-primary border-primary/40", Icon: PackageCheck },
  "In Transit": { cls: "bg-primary/12 text-primary border-primary/40", Icon: Truck },
  "On Route": { cls: "bg-primary/12 text-primary border-primary/40", Icon: Truck },
  Delivered: { cls: "bg-success/12 text-success border-success/40", Icon: CheckCircle2 },
  Available: { cls: "bg-success/12 text-success border-success/40", Icon: CheckCircle2 },
  Unavailable: { cls: "bg-muted text-muted-foreground border-border", Icon: XCircle },
};

export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  const entry = MAP[status] ?? { cls: "bg-muted text-muted-foreground border-border", Icon: Clock };
  const { Icon } = entry;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        entry.cls,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {status}
    </span>
  );
}
