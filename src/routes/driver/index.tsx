import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Truck, MapPin, Clock, Package } from "lucide-react";
import { DashboardCard } from "@/components/common/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/driver/")({
  head: () => ({
    meta: [{ title: "Driver Dashboard — KHETSETU" }],
  }),
  component: DriverDashboard,
});

function DriverDashboard() {
  const { user, batches, vehicles, drivers } = useDemo();

  if (!user) return null;

  // Get assigned batches for this driver
  const assignedBatches = batches.filter((b) => b.driverId === user.id);

  // Get driver info
  const driverInfo = drivers.find((d) => d.id === user.id);
  const vehicleInfo = driverInfo?.vehicleId ? vehicles.find((v) => v.id === driverInfo.vehicleId) : null;

  // Today's deliveries (first 3 orders in assigned batches)
  const todaysDeliveries = assignedBatches.flatMap((b) => b.orders).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Based in <strong>{user.location}</strong>
        </p>
      </div>

      {/* Status alert */}
      {assignedBatches.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No deliveries assigned yet. Check the{" "}
            <Link to="/driver/deliveries" className="font-medium underline hover:no-underline">
              assigned deliveries
            </Link>{" "}
            page for updates.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Availability"
          value={driverInfo?.status === "Available" ? "Available" : "Assigned"}
          icon={Truck}
          tint={driverInfo?.status === "Available" ? "green" : "blue"}
        />
        <DashboardCard
          title="Assigned Batches"
          value={assignedBatches.length.toString()}
          icon={Package}
          tint="blue"
        />
        <DashboardCard
          title="Today's Deliveries"
          value={todaysDeliveries.length.toString()}
          icon={Clock}
          tint="amber"
        />
        <DashboardCard
          title="Vehicle Capacity"
          value={vehicleInfo ? `${vehicleInfo.capacity} kg` : "—"}
          icon={MapPin}
          tint="purple"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/driver/deliveries">
          <Button>View Assigned Deliveries</Button>
        </Link>
        {assignedBatches.length > 0 && (
          <Link to="/driver/route">
            <Button variant="outline">View Route</Button>
          </Link>
        )}
        <Link to="/driver/history">
          <Button variant="outline">Delivery History</Button>
        </Link>
      </div>

      {/* Assigned batches section */}
      {assignedBatches.length > 0 && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Assigned Batches</h2>
          <div className="space-y-3">
            {assignedBatches.map((batch) => (
              <div key={batch.id} className="flex items-start justify-between rounded-lg border border-border bg-white/50 p-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-medium text-primary">{batch.id}</p>
                    <Badge variant="secondary">{batch.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                    <div>
                      <p className="text-foreground/70">Load</p>
                      <p className="font-medium text-foreground">{batch.load} kg</p>
                    </div>
                    <div>
                      <p className="text-foreground/70">Stops</p>
                      <p className="font-medium text-foreground">{batch.stops.length}</p>
                    </div>
                    <div>
                      <p className="text-foreground/70">Orders</p>
                      <p className="font-medium text-foreground">{batch.orders.length}</p>
                    </div>
                  </div>
                </div>
                <Link to={`/driver/route`} className="ml-4">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle info */}
      {vehicleInfo && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Assigned Vehicle</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Vehicle</p>
              <p className="font-medium text-foreground">{vehicleInfo.name}</p>
              <p className="text-xs text-muted-foreground">{vehicleInfo.registration}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="font-medium text-foreground">{vehicleInfo.capacity} kg</p>
              <p className="text-xs text-muted-foreground">Utilization: {assignedBatches.length > 0 ? Math.round((assignedBatches[0]?.load ?? 0) / vehicleInfo.capacity * 100) : 0}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
