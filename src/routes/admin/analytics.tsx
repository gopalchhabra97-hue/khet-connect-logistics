import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Info,
  LineChart as LineChartIcon,
  MapPin,
  Package,
  Sprout,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemandForecastChart } from "@/components/common/DemandForecastChart";
import { ForecastFlow } from "@/components/common/ForecastFlow";
import { CROPS, forecastMetrics } from "@/data/mockData";
import { useDemo } from "@/context/DemoStore";
import { forecastService, formatINR, formatQty } from "@/services";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [{ title: "Demand Analytics & Market Intelligence — KHETSETU" }],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { orders, products } = useDemo();
  const [selectedCrop, setSelectedCrop] = useState<string>("Tomato");

  // Calculate basic platform metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.quantity * o.pricePerUnit, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const acceptedOrders = orders.filter((o) => o.status === "Accepted" || o.status === "Preparing" || o.status === "In Transit" || o.status === "Delivered").length;
  const fulfillmentRate = totalOrders > 0 ? Math.round((acceptedOrders / totalOrders) * 100) : 0;

  // Selected crop intelligence
  const currentCropMetrics = forecastService.metrics(selectedCrop);
  const currentCropSeries = forecastService.series(selectedCrop);
  const currentCropSuggestedSupply = forecastService.suggestedSupply(selectedCrop);

  // Regional demand distribution
  const regionalDemand: Record<string, { orders: number; volume: number }> = {};
  orders.forEach((o) => {
    if (!regionalDemand[o.delivery]) {
      regionalDemand[o.delivery] = { orders: 0, volume: 0 };
    }
    regionalDemand[o.delivery].orders += 1;
    regionalDemand[o.delivery].volume += o.quantity;
  });

  const maxRegionalVolume = Math.max(...Object.values(regionalDemand).map((r) => r.volume), 1);

  // Average Forecast MAPE Error
  const avgForecastError = (
    Object.values(forecastMetrics).reduce((acc, m) => acc + m.error, 0) /
    Object.values(forecastMetrics).length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Demand Intelligence & Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time order demand patterns, predictive forecasting, and supply planning for regional agriculture
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Marketplace Orders</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalOrders}</p>
          <p className="mt-1 text-xs text-muted-foreground">{acceptedOrders} active / fulfilled</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Marketplace Gross Value</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatINR(totalRevenue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Avg: {formatINR(Math.round(avgOrderValue))}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Fulfillment Rate</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{fulfillmentRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Logistics pipeline active</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Forecast Accuracy (MAPE)</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{avgForecastError}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Deterministic prototype model</p>
        </Card>
      </div>

      {/* Demand Intelligence Flow Banner */}
      <ForecastFlow />

      {/* Interactive Crop Forecast Section */}
      <Card className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Crop Demand Forecast & Supply Target</h2>
              <Badge variant="secondary" className="text-xs">Prototype Model</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Select any regional staple crop to inspect historical demand trends, future forecasts, and suggested supply quantities.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
              <SelectTrigger id="crop-select">
                <SelectValue placeholder="Select Crop" />
              </SelectTrigger>
              <SelectContent>
                {CROPS.map((crop) => (
                  <SelectItem key={crop} value={crop}>
                    {crop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Crop Metric Highlights */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-slate-50/70 p-4">
            <p className="text-xs text-muted-foreground">Current Weekly Demand</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatQty(currentCropMetrics.current)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Based on latest historical week</p>
          </div>
          <div className="rounded-lg border border-border bg-blue-50/60 p-4">
            <p className="text-xs text-blue-900 font-medium">Predicted Demand (Next Week)</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatQty(currentCropMetrics.predicted)}</p>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-blue-800">
              {currentCropMetrics.trend === "Increasing" ? (
                <span className="flex items-center text-amber-700 font-medium">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> Increasing demand
                </span>
              ) : currentCropMetrics.trend === "Decreasing" ? (
                <span className="flex items-center text-blue-700 font-medium">
                  <TrendingDown className="h-3.5 w-3.5 mr-1" /> Decreasing demand
                </span>
              ) : (
                <span className="text-green-700 font-medium">● Stable demand</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-emerald-50/60 p-4">
            <p className="text-xs text-emerald-900 font-medium">Suggested Supply Target</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatQty(currentCropSuggestedSupply)}</p>
            <p className="text-xs text-emerald-800 mt-0.5">Target production buffer: 85%</p>
          </div>
          <div className="rounded-lg border border-border bg-slate-50/70 p-4">
            <p className="text-xs text-muted-foreground">Model Forecast Error</p>
            <p className="mt-1 text-2xl font-bold text-purple-700">{currentCropMetrics.error.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Mean Absolute Percentage Error</p>
          </div>
        </div>

        {/* Visual Line Chart */}
        <div className="rounded-lg border border-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Demand Trajectory for {selectedCrop} (5-Week Historical & 3-Week Extrapolated)
          </h3>
          <DemandForecastChart data={currentCropSeries} crop={selectedCrop} />
        </div>
      </Card>

      {/* Comprehensive Demand Breakdown Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Crop-wise Demand Intelligence Summary</h2>
            <p className="text-xs text-muted-foreground">Marketplace consolidated supply and demand guidance across commodities</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-muted-foreground">
                <th className="pb-3">Crop Name</th>
                <th className="pb-3">Current Demand</th>
                <th className="pb-3">Predicted Demand</th>
                <th className="pb-3">Demand Trend</th>
                <th className="pb-3">Suggested Supply Target</th>
                <th className="pb-3">Model Accuracy (MAPE)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CROPS.map((crop) => {
                const m = forecastMetrics[crop];
                const suggested = forecastService.suggestedSupply(crop);
                return (
                  <tr key={crop} className="hover:bg-slate-50/60">
                    <td className="py-3 font-semibold text-foreground flex items-center gap-2">
                      <Sprout className="h-4 w-4 text-primary" />
                      {crop}
                    </td>
                    <td className="py-3 text-foreground font-medium">{formatQty(m.current)}</td>
                    <td className="py-3 font-bold text-primary">{formatQty(m.predicted)}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          m.trend === "Increasing"
                            ? "default"
                            : m.trend === "Decreasing"
                              ? "secondary"
                              : "outline"
                        }
                        className={m.trend === "Increasing" ? "bg-amber-600 hover:bg-amber-700" : ""}
                      >
                        {m.trend === "Increasing" ? "↑ Increasing" : m.trend === "Decreasing" ? "↓ Decreasing" : "● Stable"}
                      </Badge>
                    </td>
                    <td className="py-3 font-medium text-emerald-700">{formatQty(suggested)}</td>
                    <td className="py-3 text-muted-foreground">{m.error.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Regional Demand Activity */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Demand by Destination Hub (Volume & Orders)</h2>
        <div className="space-y-4">
          {Object.entries(regionalDemand)
            .sort(([, a], [, b]) => b.volume - a.volume)
            .map(([region, data]) => (
              <div key={region} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {region}
                  </span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{data.volume} kg</strong> ({data.orders} order{data.orders !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(data.volume / maxRegionalVolume) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Transparent Methodology Disclaimer */}
      <div className="rounded-lg border border-border bg-slate-50 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Prototype Forecasting Methodology & Notice</p>
          <p className="mt-0.5">
            This prototype implements a transparent, weighted moving average and seasonal trend extrapolation model computed on historical orders from Punjab and Haryana Mandis. For production deployment, this module connects directly to a Python FastAPI / Prophet service without modifying the frontend contract.
          </p>
        </div>
      </div>
    </div>
  );
}
