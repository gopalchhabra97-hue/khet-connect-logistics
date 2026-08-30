import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { DemandForecastChart } from "@/components/common/DemandForecastChart";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — KHETSETU" }],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { orders, products } = useDemo();

  // Calculate basic metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.quantity * o.pricePerUnit, 0);
  const avgOrderValue = totalRevenue / totalOrders;
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
  const acceptedOrders = orders.filter((o) => o.status === "Accepted").length;

  // Orders over time (by date)
  const ordersByDate: Record<string, number> = {};
  orders.forEach((o) => {
    const date = o.orderDate;
    ordersByDate[date] = (ordersByDate[date] || 0) + 1;
  });

  // Crop demand
  const cropDemand: Record<string, number> = {};
  orders.forEach((o) => {
    const product = products.find((p) => p.id === o.productId);
    if (product) {
      cropDemand[product.name] = (cropDemand[product.name] || 0) + o.quantity;
    }
  });

  // Regional activity
  const regionalOrders: Record<string, number> = {};
  orders.forEach((o) => {
    regionalOrders[o.delivery] = (regionalOrders[o.delivery] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Demand Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Order trends and market insights</p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg Order Value</p>
          <p className="mt-1 text-2xl font-bold text-foreground">₹{Math.round(avgOrderValue).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Fulfillment Rate</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {totalOrders > 0 ? Math.round((acceptedOrders / totalOrders) * 100) : 0}%
          </p>
        </Card>
      </div>

      {/* Crop demand breakdown */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Crop Demand (by quantity)</h2>
        <div className="space-y-3">
          {Object.entries(cropDemand)
            .sort(([, a], [, b]) => b - a)
            .map(([crop, demand]) => (
              <div key={crop}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{crop}</span>
                  <span className="text-sm text-muted-foreground">{demand} kg</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${
                        Object.values(cropDemand).length > 0
                          ? (demand / Math.max(...Object.values(cropDemand))) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Regional activity */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Regional Activity (by orders)</h2>
        <div className="space-y-3">
          {Object.entries(regionalOrders)
            .sort(([, a], [, b]) => b - a)
            .map(([region, count]) => (
              <div key={region}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{region}</span>
                  <span className="text-sm text-muted-foreground">{count} orders</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{
                      width: `${
                        Object.values(regionalOrders).length > 0
                          ? (count / Math.max(...Object.values(regionalOrders))) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Forecast chart */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Demand Forecast — Tomato</h2>
        <DemandForecastChart crop="Tomato" />
      </Card>

      {/* Order status distribution */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Order Status Distribution</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          {[
            { status: "Pending", count: orders.filter((o) => o.status === "Pending").length, color: "bg-amber-100" },
            { status: "Accepted", count: orders.filter((o) => o.status === "Accepted").length, color: "bg-blue-100" },
            { status: "In Transit", count: orders.filter((o) => o.status === "In Transit").length, color: "bg-purple-100" },
            { status: "Delivered", count: orders.filter((o) => o.status === "Delivered").length, color: "bg-green-100" },
            { status: "Preparing", count: orders.filter((o) => o.status === "Preparing").length, color: "bg-sky-100" },
            { status: "Rejected", count: orders.filter((o) => o.status === "Rejected").length, color: "bg-red-100" },
          ].map(({ status, count, color }) => (
            <div key={status} className={`rounded-lg ${color} p-4 text-center`}>
              <p className="text-xs font-medium text-muted-foreground uppercase">{status}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
