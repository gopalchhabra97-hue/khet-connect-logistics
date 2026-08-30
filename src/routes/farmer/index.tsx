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
