import { ArrowRight, BarChart3, Brain, Database, LineChart, Sprout, Table2 } from "lucide-react";

const STEPS = [
  { label: "Historical Orders", icon: Database },
  { label: "Data Processing", icon: Table2 },
  { label: "Demand Forecasting", icon: Brain },
  { label: "Predicted Future Demand", icon: LineChart },
  { label: "Supply / Demand Insight", icon: BarChart3 },
  { label: "Farmer / FPO Planning", icon: Sprout },
];

export function ForecastFlow() {
  return (
    <div className="surface-panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">Demand intelligence flow</h3>
        <span className="rounded-full border border-info/40 bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
          Planned / demo forecasting flow
        </span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {STEPS.map((step, i) => (
          <li key={step.label} className="flex items-center gap-2 lg:flex-col lg:items-stretch">
            <div className="flex h-full w-full flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                <step.icon className="size-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-foreground">{step.label}</p>
            </div>
            {i < STEPS.length - 1 ? (
              <ArrowRight
                className="size-4 shrink-0 rotate-90 text-muted-foreground lg:hidden"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">
        Historical order patterns can be used to estimate future demand and support supply
        planning. A Python forecasting service can be connected later.
      </p>
    </div>
  );
}
