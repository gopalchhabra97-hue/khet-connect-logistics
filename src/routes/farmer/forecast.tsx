import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DemandForecastChart } from "@/components/common/DemandForecastChart";
import { DashboardCard } from "@/components/common/DashboardCard";
import { LineChart, TrendingUp, AlertCircle, CheckCircle, Package, Sparkles } from "lucide-react";
import { forecastService } from "@/services";
import { forecastApi, type ApiForecastResponse } from "@/services/api";
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
  const [forecasts, setForecasts] = useState<ApiForecastResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchForecasts = async () => {
      try {
        const data = await forecastApi.list();
        if (mounted && data && data.length > 0) {
          setForecasts(data);
        }
      } catch (err) {
        console.warn("Could not fetch remote forecasts, using local fallback:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void fetchForecasts();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Demand Forecast
          </h1>
          <p className="mt-1 text-muted-foreground">
            Historical order patterns and predicted future demand to support your supply planning
          </p>
        </div>
        {forecasts.some((f) => f.status === "live") ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> LIVE AI FORECAST ACTIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/50 bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
            DEMO / BENCHMARK MODE
          </span>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-info/50 bg-info/15 p-4">
        <p className="text-sm text-info-foreground">
          <span className="font-semibold">📊 Demand Intelligence &amp; Supply Recommendations:</span>{" "}
          Predictions are generated from PostgreSQL historical order records with machine learning regression.
          When order history is below threshold, verified benchmark demo values are transparently provided.
        </p>
      </div>

      {/* Forecast Charts */}
      <div className="space-y-8">
        {CROPS.map((crop) => {
          const remote = forecasts.find((f) => f.product_name.toLowerCase().includes(crop.toLowerCase()));

          // Use remote data if available, otherwise fall back to local service
          const localData = forecastService.series(crop);
          const localMetrics = forecastService.metrics(crop);

          const data = remote ? remote.series : localData;
          const current = remote ? remote.current_demand : localMetrics.current;
          const predicted = remote ? remote.predicted_demand : localMetrics.predicted;
          const trend = remote ? remote.trend : localMetrics.trend;
          const error = remote ? remote.error_metric : localMetrics.error;
          const isLive = remote ? remote.status === "live" : false;
          const availableSupply = remote ? remote.available_supply : 0;
          const recommendedSupply = remote ? remote.recommended_supply : forecastService.suggestedSupply(crop);
          const recommendationText = remote
            ? remote.recommendation_text
            : `Based on predicted demand of ${predicted.toLocaleString("en-IN")} kg with 10% safety buffer, recommended supply target is ${recommendedSupply.toLocaleString("en-IN")} kg.`;
          const modelName = remote ? remote.model : "Seeded Market Baseline (Demo)";
          const reasonText = remote ? remote.reason : "Insufficient data in database; showing baseline seed forecast.";

          if (!data || data.length === 0) return null;

          return (
            <div key={crop} className="space-y-4 rounded-xl border border-border bg-card/60 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-foreground">{crop}</h2>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      ● Live AI Model
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                      ● Demo Fallback
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Current Demand</p>
                    <p className="font-semibold text-foreground">
                      {current.toLocaleString("en-IN")} kg/week
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Predicted Next Week</p>
                    <p className="font-semibold text-primary">
                      {predicted.toLocaleString("en-IN")} kg/week
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid gap-4 sm:grid-cols-4">
                <DashboardCard
                  label="Current Demand"
                  value={`${current.toLocaleString("en-IN")} kg`}
                  icon={LineChart}
                />
                <DashboardCard
                  label="Predicted Demand"
                  value={`${predicted.toLocaleString("en-IN")} kg`}
                  icon={TrendingUp}
                />
                <DashboardCard
                  label="Available Supply"
                  value={`${availableSupply.toLocaleString("en-IN")} kg`}
                  icon={Package}
                />
                <DashboardCard
                  label="Recommended Supply"
                  value={`${recommendedSupply.toLocaleString("en-IN")} kg`}
                  icon={
                    trend === "Increasing"
                      ? AlertCircle
                      : trend === "Decreasing"
                        ? CheckCircle
                        : LineChart
                  }
                />
              </div>

              {/* Chart */}
              <div className="surface-panel p-5">
                <DemandForecastChart data={data} crop={crop} />
              </div>

              {/* Demand-to-Supply Recommendation Box */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Demand-to-Supply Recommendation
                  </p>
                </div>
                <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">
                  {recommendationText}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>
                  Model: <span className="font-medium text-foreground">{modelName}</span> | Status:{" "}
                  <span className={isLive ? "text-primary font-medium" : "text-warning-foreground font-medium"}>
                    {isLive ? "Live Model" : "Demo Fallback"}
                  </span>{" "}
                  | Accuracy (MAPE): {error.toFixed(1)}%
                </p>
                <p className="italic text-muted-foreground/80">{reasonText}</p>
              </div>
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
