import { Check, CircleDashed, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TimelineStep {
  key: string;
  label: string;
  description?: string;
  icon: LucideIcon;
}

export function OrderTimeline({
  steps,
  activeIndex,
  orientation = "vertical",
}: {
  steps: TimelineStep[];
  activeIndex: number;
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <ol
      className={cn(
        orientation === "vertical"
          ? "space-y-0"
          : "flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2",
      )}
    >
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        const Icon = done ? Check : current ? step.icon : CircleDashed;
        return (
          <li
            key={step.key}
            className={cn(
              "relative",
              orientation === "vertical" ? "flex gap-3 pb-6 last:pb-0" : "flex-1",
            )}
          >
            {orientation === "vertical" ? (
              <>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border",
                      done
                        ? "border-success bg-success text-success-foreground"
                        : current
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {index < steps.length - 1 ? (
                    <span
                      className={cn(
                        "mt-1 w-px flex-1",
                        done ? "bg-success/50" : "bg-border",
                      )}
                    />
                  ) : null}
                </div>
                <div className="pt-1">
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {done ? "Completed" : current ? "In progress" : "Pending"}
                    {step.description ? ` · ${step.description}` : ""}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border",
                    done
                      ? "border-success bg-success text-success-foreground"
                      : current
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {done ? "Completed" : current ? "In progress" : "Pending"}
                  </p>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
