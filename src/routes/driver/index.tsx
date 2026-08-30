import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  Package,
  PackageCheck,
  Route as RouteIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardCard } from "@/components/common/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDemo } from "@/context/DemoStore";
import { formatDuration } from "@/services";
import type { BatchStatus } from "@/types";

export const Route = createFileRoute("/driver/")({
  head: () => ({
    meta: [{ title: "Driver Dashboard — KHETSETU" }],
  }),
  component: DriverDashboard,
});

const STEPS: { status: BatchStatus; label: string; desc: string }[] = [
  { status: "Assigned", label: "Assigned", desc: "Vehicle & driver assigned" },
  { status: "Picked Up", label: "Picked Up", desc: "Cargo loaded from Mandi" },
  { status: "In Transit", label: "In Transit", desc: "On multi-stop highway route" },
  { status: "Delivered", label: "Delivered", desc: "All drops completed" },
];

function DriverDashboard() {
  const { user, batches, vehicles, drivers, orders, setBatchStatus } = useDemo();

  if (!user) return null;

  const assignedBatches = batches.filter((b) => b.driverId === user.id);
  const activeBatch =
    assignedBatches.find((b) => b.status !== "Delivered") || assignedBatches[0];

  const driverInfo = drivers.find((d) => d.id === user.id);
  const vehicleInfo = activeBatch?.vehicleId
    ? vehicles.find((v) => v.id === activeBatch.vehicleId)
    : driverInfo?.vehicleId
      ? vehicles.find((v) => v.id === driverInfo.vehicleId)
      : null;

  const totalAssignedLoad = assignedBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
  const todaysDeliveries = assignedBatches.flatMap((b) =>
    orders.filter((o) => b.orderIds.includes(o.id)),
  );

  const currentStepIndex = activeBatch
    ? STEPS.findIndex((s) => s.status === activeBatch.status)
    : -1;

  const handleStatusChange = (nextStatus: BatchStatus) => {
    if (!activeBatch) return;
    setBatchStatus(activeBatch.id, nextStatus);
    if (nextStatus === "Picked Up") {
      toast.success(`Batch ${activeBatch.id} Picked Up`, {
        description: "Cargo loaded from pickup Mandi. Ready for dispatch.",
      });
    } else if (nextStatus === "In Transit") {
      toast.success(`Batch ${activeBatch.id} In Transit`, {
        description: "Trip started. Buyer order statuses updated to In Transit.",
      });
    } else if (nextStatus === "Delivered") {
      toast.success(`Batch ${activeBatch.id} Delivered!`, {
        description: "All orders delivered. Vehicle and driver marked as available.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-4 text-primary shrink-0" />
            Base Hub: <strong className="text-foreground">{user.location} Mandi</strong> • ID: <span className="font-mono text-xs">{user.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={driverInfo?.status === "Available" ? "outline" : "default"}
            className={driverInfo?.status === "Available" ? "border-emerald-500 text-emerald-700 bg-emerald-50" : ""}
          >
            {driverInfo?.status === "Available" ? "● Driver Available" : `● ${driverInfo?.status || "Assigned"}`}
          </Badge>
        </div>
      </div>

      {assignedBatches.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No deliveries assigned yet. Check the{" "}
            <Link to="/driver/deliveries" className="font-medium underline hover:no-underline">
              assigned deliveries
            </Link>{" "}
            page for new batch dispatches.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Assigned Batches"
          value={assignedBatches.length}
          hint={activeBatch ? `Active: ${activeBatch.id}` : "No active batch"}
          icon={Boxes}
          tone="primary"
        />
        <DashboardCard
          label="Total Assigned Load"
          value={`${totalAssignedLoad} kg`}
          hint={vehicleInfo ? `Capacity: ${vehicleInfo.capacity} kg` : "Consolidated cargo"}
          icon={Package}
          tone="leaf"
        />
        <DashboardCard
          label="Active Deliveries"
          value={todaysDeliveries.length}
          hint={`${assignedBatches.flatMap((b) => b.stops).length} total drop stops`}
          icon={Clock}
          tone="warning"
        />
        <DashboardCard
          label="Assigned Vehicle"
          value={vehicleInfo ? vehicleInfo.name : "Unassigned"}
          hint={vehicleInfo ? `${vehicleInfo.registration} (${vehicleInfo.capacity} kg)` : "Awaiting assignment"}
          icon={Truck}
          tone="info"
        />
      </div>

      {/* Active Delivery Progress & Workflow Stepper */}
      {activeBatch && (
        <div className="surface-panel p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-primary">{activeBatch.id}</span>
                <Badge variant={activeBatch.status === "Delivered" ? "outline" : "default"}>
                  {activeBatch.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {activeBatch.totalQuantity} kg • {activeBatch.orderIds.length} orders
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Multi-stop corridor: <strong className="text-foreground">{activeBatch.pickup}</strong> →{" "}
                <strong className="text-foreground">{activeBatch.stops.join(" → ")}</strong> ({activeBatch.distanceKm} km • {formatDuration(activeBatch.etaMinutes)})
              </p>
            </div>

            {/* Lifecycle Action Buttons */}
            <div className="flex items-center gap-2">
              {activeBatch.status === "Assigned" && (
                <Button onClick={() => handleStatusChange("Picked Up")} className="gap-1.5 shadow-sm">
                  <PackageCheck className="h-4 w-4" />
                  Mark Picked Up
                </Button>
              )}

              {activeBatch.status === "Picked Up" && (
                <Button
                  onClick={() => handleStatusChange("In Transit")}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Truck className="h-4 w-4" />
                  Start Delivery
                </Button>
              )}

              {activeBatch.status === "In Transit" && (
                <Button
                  onClick={() => handleStatusChange("Delivered")}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Delivered
                </Button>
              )}

              {activeBatch.status === "Delivered" && (
                <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-emerald-700 px-3 py-1.5 font-semibold">
                  ✓ Delivery Completed
                </Badge>
              )}

              <Button asChild variant="outline" size="sm">
                <Link to="/driver/show-route">
                  <RouteIcon className="mr-1.5 size-3.5" />
                  View Route Map
                </Link>
              </Button>
            </div>
          </div>

          {/* Stepper Visual Workflow */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              Delivery Progress Workflow
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              {STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step.status}
                    className={`rounded-lg border p-3.5 transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                        : isPassed
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-border bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? "bg-primary text-white"
                            : isPassed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {isPassed && !isCurrent ? "✓" : idx + 1}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{step.label}</p>
                    <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/driver/deliveries">View Assigned Deliveries</Link>
        </Button>
        {assignedBatches.length > 0 && (
          <Button asChild variant="outline">
            <Link to="/driver/show-route">
              <RouteIcon className="mr-1.5 size-4" />
              Route Map
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/driver/history">Delivery History</Link>
        </Button>
      </div>

      {/* Assigned Batches Summary List */}
      {assignedBatches.length > 0 && (
        <div className="surface-panel p-5 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">All Assigned Delivery Batches ({assignedBatches.length})</h2>
          <div className="space-y-3">
            {assignedBatches.map((batch) => {
              const batchOrderCount = orders.filter((o) => batch.orderIds.includes(o.id)).length;
              const batchVehicle = vehicles.find((v) => v.id === batch.vehicleId);
              return (
                <div
                  key={batch.id}
                  className="flex flex-col gap-4 rounded-lg border border-border bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-base font-bold text-primary">{batch.id}</p>
                      <Badge variant={batch.status === "Delivered" ? "outline" : "default"}>{batch.status}</Badge>
                      {batchVehicle && (
                        <span className="text-xs text-muted-foreground">
                          • Vehicle: <strong className="font-medium text-foreground">{batchVehicle.name}</strong> ({batchVehicle.registration})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                      <div>
                        <p className="text-foreground/70">Total Load</p>
                        <p className="font-medium text-foreground">{batch.totalQuantity} kg ({batchOrderCount} orders)</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Pickup</p>
                        <p className="font-medium text-foreground">{batch.pickup}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Stops</p>
                        <p className="font-medium text-foreground">{batch.stops.join(" → ")}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Distance & ETA</p>
                        <p className="font-medium text-foreground">{batch.distanceKm} km • {formatDuration(batch.etaMinutes)}</p>
                      </div>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="sm:ml-4">
                    <Link to="/driver/show-route">
                      View Route
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned Vehicle Details */}
      {vehicleInfo && (
        <div className="surface-panel p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Assigned Vehicle Profile</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Vehicle Model & Registration</p>
              <p className="font-semibold text-foreground">{vehicleInfo.name}</p>
              <p className="text-xs font-mono text-muted-foreground">{vehicleInfo.registration}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Payload Capacity</p>
              <p className="font-semibold text-foreground">{vehicleInfo.capacity} kg</p>
              <p className="text-xs text-muted-foreground">Max rated weight</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Capacity Utilization</p>
              <p className="font-semibold text-primary">
                {activeBatch ? Math.round((activeBatch.totalQuantity / vehicleInfo.capacity) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">{activeBatch?.totalQuantity || 0} kg allocated</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
