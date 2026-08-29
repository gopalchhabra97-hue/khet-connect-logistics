import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ForecastPoint } from "@/types";

export function DemandForecastChart({ data, unit = "kg" }: { data: ForecastPoint[]; unit?: string }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--muted-foreground)" fontSize={12} width={54} />
          <Tooltip
            formatter={(value: number | string, name: string) => [`${value} ${unit}`, name]}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="historical"
            name="Historical demand"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="predicted"
            name="Predicted demand (demo)"
            stroke="var(--info)"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-primary" aria-hidden="true" /> Historical demand
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-5 rounded bg-info"
            style={{ backgroundImage: "repeating-linear-gradient(90deg,var(--info) 0 6px,transparent 6px 11px)" }}
            aria-hidden="true"
          />{" "}
          Predicted demand (demo)
        </span>
      </div>
    </div>
  );
}
