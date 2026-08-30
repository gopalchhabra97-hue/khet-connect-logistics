import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Store, Package, ClipboardList, AlertCircle, Truck } from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — KHETSETU" }],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, products, orders, vehicles, drivers } = useDemo();

  if (!user) return null;

  // Count metrics
  const totalFarmers = new Set(products.map((p) => p.sellerId)).size;
  const totalBuyers = new Set(orders.map((o) => o.buyerId)).size;
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const acceptedOrders = orders.filter((o) => o.status === "Accepted").length;
  const availableVehicles = vehicles.filter((v) => v.status === "Available").length;
  const availableDrivers = drivers.filter((d) => d.status === "Available").length;

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Admin Dashboard • Platform Overview</p>
      </div>

      {/* Critical alerts */}
      {pendingOrders > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{pendingOrders}</strong> orders are awaiting farmer approval.{" "}
            <Link to="/admin/orders" className="font-medium underline hover:no-underline">
              Review orders
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Farmers/FPOs"
          value={totalFarmers.toString()}
          icon={Users}
          tint="green"
        />
        <DashboardCard
          title="Buyers"
          value={totalBuyers.toString()}
          icon={Store}
          tint="blue"
        />
        <DashboardCard
          title="Products"
          value={totalProducts.toString()}
          icon={Package}
          tint="purple"
        />
        <DashboardCard
          title="Orders"
          value={totalOrders.toString()}
          icon={ClipboardList}
          tint="amber"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Pending Orders"
          value={pendingOrders.toString()}
          icon={AlertCircle}
          tint="orange"
        />
        <DashboardCard
          title="Accepted Orders"
          value={acceptedOrders.toString()}
          icon={ClipboardList}
          tint="green"
        />
        <DashboardCard
          title="Available Vehicles"
          value={availableVehicles.toString()}
          icon={Truck}
          tint="blue"
        />
      </div>

      {/* Quick actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/farmers">
            <Button variant="outline">Manage Farmers</Button>
          </Link>
          <Link to="/admin/buyers">
            <Button variant="outline">Manage Buyers</Button>
          </Link>
          <Link to="/admin/products">
            <Button variant="outline">View Products</Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="outline">Manage Orders</Button>
          </Link>
          <Link to="/admin/logistics">
            <Button variant="outline">Logistics Dashboard</Button>
          </Link>
          <Link to="/admin/fleet">
            <Button variant="outline">Fleet Management</Button>
          </Link>
          <Link to="/admin/analytics">
            <Button variant="outline">View Analytics</Button>
          </Link>
        </div>
      </div>

      {/* System status */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">System Status</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Drivers</span>
              <span className="font-medium text-foreground">{availableDrivers} / {drivers.length}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${(availableDrivers / drivers.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Vehicles</span>
              <span className="font-medium text-foreground">{availableVehicles} / {vehicles.length}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${(availableVehicles / vehicles.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Fulfillment</span>
              <span className="font-medium text-foreground">{acceptedOrders} / {totalOrders}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: totalOrders > 0 ? `${(acceptedOrders / totalOrders) * 100}%` : "0%" }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Action</span>
              <span className="font-medium text-foreground">{pendingOrders} orders</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: totalOrders > 0 ? `${(pendingOrders / totalOrders) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
