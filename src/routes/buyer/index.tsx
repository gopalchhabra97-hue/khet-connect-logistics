import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShoppingCart, Truck, TrendingUp, Store } from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { OrderTable } from "@/components/common/OrderTable";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/context/DemoStore";
import { ordersService } from "@/services";

export const Route = createFileRoute("/buyer/")({
  head: () => ({
    meta: [
      { title: "Buyer Dashboard — KHETSETU" },
    ],
  }),
  component: BuyerDashboard,
});

function BuyerDashboard() {
  const { user, orders } = useDemo();

  if (!user) return null;

  // Get buyer's orders
  const buyerOrders = ordersService.byBuyer(orders, user.id);
  const activeOrders = buyerOrders.filter(
    (o) => o.status === "Pending" || o.status === "Accepted" || o.status === "Preparing" || o.status === "In Transit"
  );
  const deliveredOrders = ordersService.byStatus(buyerOrders, "Delivered");
  const totalSpent = ordersService.totalValue(buyerOrders);

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
          label="Total Orders"
          value={buyerOrders.length.toString()}
          icon={ShoppingCart}
        />
        <DashboardCard
          label="Active Orders"
          value={activeOrders.length.toString()}
          icon={Truck}
        />
        <DashboardCard
          label="Delivered"
          value={deliveredOrders.length.toString()}
          icon={TrendingUp}
        />
        <DashboardCard
          label="Total Spent"
          value={`₹${totalSpent.toLocaleString("en-IN")}`}
          icon={ShoppingCart}
        />
      </div>

      {/* Quick Actions */}
      <div className="surface-panel p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button asChild className="h-12">
            <Link to="/buyer/marketplace">
              <Store className="mr-2 size-4" />
              Browse Marketplace
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/buyer/orders">
              <ShoppingCart className="mr-2 size-4" />
              My Orders
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/buyer/tracking">
              <Truck className="mr-2 size-4" />
              Track Deliveries
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="surface-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Recent Orders
          </h3>
          <Button asChild variant="outline" size="sm">
            <Link to="/buyer/orders">View All</Link>
          </Button>
        </div>
        {buyerOrders.length > 0 ? (
          <OrderTable orders={buyerOrders.slice(0, 5)} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No orders yet. <Link to="/buyer/marketplace" className="font-medium text-primary hover:underline">Browse the marketplace</Link> to place your first order.
          </p>
        )}
      </div>
    </div>
  );
}
