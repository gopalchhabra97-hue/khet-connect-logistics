import { createFileRoute } from "@tanstack/react-router";
import { DemandForecastChart } from "@/components/common/DemandForecastChart";
import { DashboardCard } from "@/components/common/DashboardCard";
import { LineChart, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { forecastService } from "@/services";
import { CROPS } from "@/data/mockData";

export const Route = createFileRoute("/farmer/forecast")({
  head: () => ({
    meta: [
      { title: "Demand Forecast — KHETSETU" },
    ],
  }),
  component: FarmerForecast,
});

function FarmerForecast() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Demand Forecast
        </h1>
        <p className="mt-1 text-muted-foreground">
          Historical order patterns and predicted future demand to support your supply planning
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-info/50 bg-info/15 p-4">
        <p className="text-sm text-info-foreground">
          <span className="font-semibold">📊 Demand Intelligence:</span> This forecast is based on
          historical order data from the KHETSETU marketplace. Use these insights to plan your
          production, harvest timing, and inventory levels.
        </p>
      </div>

      {/* Forecast Charts */}
      <div className="space-y-6">
        {CROPS.map((crop) => {
          const data = forecastService.series(crop);
          const metrics = forecastService.metrics(crop);

          if (data.length === 0) return null;

          return (
            <div key={crop} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">{crop}</h2>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Current Demand</p>
                    <p className="font-semibold text-foreground">
                      {metrics.current.toLocaleString("en-IN")} kg/week
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Predicted Next Week</p>
                    <p className="font-semibold text-primary">
                      {metrics.predicted.toLocaleString("en-IN")} kg/week
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <DashboardCard
                  label="Current Demand"
                  value={`${metrics.current.toLocaleString("en-IN")} kg`}
                  icon={LineChart}
                />
                <DashboardCard
                  label="Predicted Demand"
                  value={`${metrics.predicted.toLocaleString("en-IN")} kg`}
                  icon={TrendingUp}
                />
                <DashboardCard
                  label="Trend"
                  value={metrics.trend}
                  icon={
                    metrics.trend === "Increasing"
                      ? AlertCircle
                      : metrics.trend === "Decreasing"
                        ? CheckCircle
                        : LineChart
                  }
                />
              </div>

              {/* Chart */}
              <div className="surface-panel p-5">
                <DemandForecastChart data={data} crop={crop} />
              </div>

              <p className="text-xs text-muted-foreground">
                Forecast accuracy (MAPE): {metrics.error.toFixed(1)}% | Data shows 5 weeks
                historical and 3 weeks predicted demand
              </p>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      <div className="surface-panel p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Planning Recommendations</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            ✓ <span className="text-foreground">Monitor predicted demand trends</span> — Increasing
            demand signals suggest planting more or harvesting strategically.
          </li>
          <li>
            ✓ <span className="text-foreground">Cross-reference with historical data</span> —
            Look for seasonal patterns to anticipate future buyer needs.
          </li>
          <li>
            ✓ <span className="text-foreground">Use forecasts to optimize inventory</span> —
            Avoid shortages or oversupply by aligning harvest with predicted demand.
          </li>
          <li>
            ✓ <span className="text-foreground">Communicate with buyers</span> — Share your supply
            plans to build trust and secure bulk orders.
          </li>
        </ul>
      </div>
    </div>
  );
}
