import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Package, Clipboard, Leaf, TrendingUp } from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { OrderTable } from "@/components/common/OrderTable";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/context/DemoStore";
import { productsService, ordersService } from "@/services";

export const Route = createFileRoute("/farmer/")({
  head: () => ({
    meta: [
      { title: "Farmer Dashboard — KHETSETU" },
    ],
  }),
  component: FarmerDashboard,
});

function FarmerDashboard() {
  const { user, products, orders } = useDemo();

  if (!user) return null;

  // Get farmer's products
  const farmerProducts = productsService.listBySeller(products, user.id);
  const totalQuantity = farmerProducts.reduce((sum, p) => sum + p.quantity, 0);
  const availableQuantity = farmerProducts.reduce((sum, p) => (p.available ? sum + p.quantity : 0), 0);

  // Get pending and accepted orders for this farmer's products
  const farmerOrderIds = new Set(farmerProducts.map(p => p.id));
  const farmerOrders = orders.filter(o => farmerOrderIds.has(o.productId));
  const pendingOrders = ordersService.byStatus(farmerOrders, "Pending");
  const acceptedOrders = ordersService.byStatus(farmerOrders, "Accepted");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome, {user.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {user.org} • {user.location}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Total Products"
          value={farmerProducts.length.toString()}
          icon={Package}
        />
        <DashboardCard
          label="Available Quantity"
          value={`${availableQuantity.toLocaleString("en-IN")} kg`}
          icon={Leaf}
        />
        <DashboardCard
          label="Pending Orders"
          value={pendingOrders.length.toString()}
          icon={Clipboard}
        />
        <DashboardCard
          label="Accepted Orders"
          value={acceptedOrders.length.toString()}
          icon={TrendingUp}
        />
      </div>

      {/* Quick Actions */}
      <div className="surface-panel p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild className="h-12">
            <Link to="/farmer/products/new">
              <Plus className="mr-2 size-4" />
              Add Product
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/farmer/products">
              <Package className="mr-2 size-4" />
              My Products
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/farmer/orders">
              <Clipboard className="mr-2 size-4" />
              Orders
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/farmer/forecast">
              <TrendingUp className="mr-2 size-4" />
              Forecast
            </Link>
          </Button>
        </div>
      </div>

      {/* Demand-Driven Farmer Insight */}
      <div className="surface-panel p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Market Demand Insights & Supply Guidance</h3>
              <p className="text-xs text-muted-foreground">Demand forecast signals from regional buyers in Punjab & Haryana</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/farmer/forecast">View Full Forecast</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-amber-800">High Demand Alert</span>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">↑ +16.7%</span>
            </div>
            <p className="text-lg font-bold text-foreground">Tomato (Patiala / Chandigarh)</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Expected Weekly Demand: <strong className="text-foreground">1,050 kg</strong></p>
              <p>Recommended Supply: <strong className="text-emerald-700 font-semibold">800–900 kg</strong></p>
              <p className="text-amber-800 font-medium pt-1">Trend: ↑ Increasing (High Buyer Inquiries)</p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-blue-800">Steady Market Demand</span>
              <span className="rounded-full bg-blue-200/80 px-2 py-0.5 text-[10px] font-bold text-blue-900">Stable</span>
            </div>
            <p className="text-lg font-bold text-foreground">Wheat & Grain Mandis</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Expected Weekly Demand: <strong className="text-foreground">3,110 kg</strong></p>
              <p>Recommended Supply: <strong className="text-emerald-700 font-semibold">2,600–2,800 kg</strong></p>
              <p className="text-blue-800 font-medium pt-1">Trend: ● Stable (Long Shelf-Life Buffer)</p>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-emerald-800">Supply Opportunity</span>
              <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">High Margin</span>
            </div>
            <p className="text-lg font-bold text-foreground">Guava & Fresh Fruits</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Buyer Inquiries: <strong className="text-foreground">420 kg requested</strong></p>
              <p>Recommended Supply: <strong className="text-emerald-700 font-semibold">350–400 kg</strong></p>
              <p className="text-emerald-800 font-medium pt-1">Trend: ↑ Premium Fresh Produce</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Orders */}
      <div className="surface-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Pending Orders
          </h3>
          <Button asChild variant="outline" size="sm">
            <Link to="/farmer/orders">View All</Link>
          </Button>
        </div>
        {pendingOrders.length > 0 ? (
          <OrderTable orders={pendingOrders} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No pending orders yet
          </p>
        )}
      </div>
    </div>
  );
}
