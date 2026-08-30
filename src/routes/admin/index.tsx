import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  Package,
  Route as RouteIcon,
  Store,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDemo } from "@/context/DemoStore";
import { formatDuration, formatINR, formatQty } from "@/services";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — KHETSETU" }],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, products, orders, batches, vehicles, drivers } = useDemo();

  if (!user) return null;

  // Derived counts from DemoStore
  const totalFarmers = new Set(products.map((p) => p.sellerId)).size;
  const totalBuyers = new Set(orders.map((o) => o.buyerId)).size;
  const totalProducts = products.length;
  const totalOrders = orders.length;

  const pendingApprovals = orders.filter((o) => o.status === "Pending").length;
  const acceptedOrders = orders.filter((o) => o.status === "Accepted").length;
  const logisticsOrders = orders.filter(
    (o) => o.status === "Preparing" || o.status === "In Transit",
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;

  const activeBatches = batches.filter((b) => b.status !== "Delivered");
  const activeBatchesCount = activeBatches.length;
  const activeBatchLoad = activeBatches.reduce((sum, b) => sum + b.totalQuantity, 0);

  const availableVehicles = vehicles.filter((v) => v.status === "Available").length;
  const activeVehicles = vehicles.filter((v) => v.status === "On Route").length;
  const availableDrivers = drivers.filter((d) => d.status === "Available").length;
  const activeDrivers = drivers.filter((d) => d.status === "Assigned" || d.status === "On Route").length;

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Admin Dashboard • Central Operations & Supply Chain Monitoring</p>
      </div>

      {/* Critical alerts */}
      {pendingApprovals > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{pendingApprovals}</strong> orders awaiting farmer approval.{" "}
            <Link to="/admin/orders" className="font-medium underline hover:no-underline">
              Review orders
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <DashboardCard
          label="Farmers / FPOs"
          value={totalFarmers}
          hint="Active regional producers"
          icon={Users}
          tone="leaf"
        />
        <DashboardCard
          label="Registered Buyers"
          value={totalBuyers}
          hint="Wholesale & retail buyers"
          icon={Store}
          tone="info"
        />
        <DashboardCard
          label="Listed Products"
          value={totalProducts}
          hint="Produce commodities"
          icon={Package}
          tone="primary"
        />
        <DashboardCard
          label="Total Orders"
          value={totalOrders}
          hint="All recorded transactions"
          icon={ClipboardList}
          tone="warning"
        />
      </div>

      {/* Secondary fleet & operations metric cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard
          label="Pending Approvals"
          value={pendingApprovals}
          hint="Awaiting farmer acceptance"
          icon={AlertCircle}
          tone="warning"
        />
        <DashboardCard
          label="Active Delivery Batches"
          value={activeBatchesCount}
          hint={`${activeBatchLoad} kg consolidated cargo`}
          icon={Boxes}
          tone="primary"
        />
        <DashboardCard
          label="Active Vehicles / Drivers"
          value={`${activeVehicles} / ${activeDrivers}`}
          hint={`${availableVehicles} vehicles available`}
          icon={Truck}
          tone="leaf"
        />
      </div>

      {/* Operations Overview Section */}
      <div className="surface-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Operations Overview</h2>
            <p className="text-xs text-muted-foreground">Live lifecycle state of all orders and logistics batches</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/logistics">Logistics Management</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-border bg-amber-50/60 p-3.5">
            <p className="text-xs font-semibold uppercase text-amber-800">Awaiting Approval</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{pendingApprovals}</p>
            <p className="mt-0.5 text-[11px] text-amber-700">Orders pending farmer</p>
          </div>

          <div className="rounded-lg border border-border bg-blue-50/60 p-3.5">
            <p className="text-xs font-semibold uppercase text-blue-800">Accepted Orders</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{acceptedOrders}</p>
            <p className="mt-0.5 text-[11px] text-blue-700">Ready for batching</p>
          </div>

          <div className="rounded-lg border border-border bg-purple-50/60 p-3.5">
            <p className="text-xs font-semibold uppercase text-purple-800">Orders in Logistics</p>
            <p className="mt-1 text-2xl font-bold text-purple-900">{logisticsOrders}</p>
            <p className="mt-0.5 text-[11px] text-purple-700">Preparing / In Transit</p>
          </div>

          <div className="rounded-lg border border-border bg-emerald-50/60 p-3.5">
            <p className="text-xs font-semibold uppercase text-emerald-800">Active Batches</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{activeBatchesCount}</p>
            <p className="mt-0.5 text-[11px] text-emerald-700">Dispatched & assigned</p>
          </div>

          <div className="rounded-lg border border-border bg-slate-50 p-3.5">
            <p className="text-xs font-semibold uppercase text-slate-700">Active Cargo Load</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{activeBatchLoad} kg</p>
            <p className="mt-0.5 text-[11px] text-slate-600">In active batches</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="surface-panel p-5 space-y-4">
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
            <Button variant="outline">Demand Analytics</Button>
          </Link>
        </div>
      </div>

      {/* System status */}
      <div className="surface-panel p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">System Status & Resource Utilization</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Drivers</span>
              <span className="font-medium text-foreground">{availableDrivers} / {drivers.length} ({activeDrivers} on route)</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${(availableDrivers / drivers.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Vehicles</span>
              <span className="font-medium text-foreground">{availableVehicles} / {vehicles.length} ({activeVehicles} on route)</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${(availableVehicles / vehicles.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Fulfillment Rate</span>
              <span className="font-medium text-foreground">{deliveredOrders + logisticsOrders} / {totalOrders}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: totalOrders > 0 ? `${((deliveredOrders + logisticsOrders) / totalOrders) * 100}%` : "0%" }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Action Pipeline</span>
              <span className="font-medium text-foreground">{pendingApprovals} orders awaiting approval</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: totalOrders > 0 ? `${(pendingApprovals / totalOrders) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
