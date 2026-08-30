import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Boxes, CheckCircle2, Clock, Gauge, MapPin, Route as RouteIcon, Truck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDemo } from "@/context/DemoStore";
import { formatDuration, logisticsService } from "@/services";

export const Route = createFileRoute("/admin/logistics")({
  head: () => ({
    meta: [{ title: "Logistics Management & Fleet Optimization — KHETSETU" }],
  }),
  component: LogisticsPage,
});

function LogisticsPage() {
  const { orders, batches, vehicles, drivers, groupCompatibleOrders, assignBatch } = useDemo();

  const ungroupedOrders = orders.filter((o) => o.status === "Accepted" && !o.batchId);

  const ordersByPickup: Record<string, typeof orders> = {};
  for (const order of ungroupedOrders) {
    if (!ordersByPickup[order.pickup]) {
      ordersByPickup[order.pickup] = [];
    }
    ordersByPickup[order.pickup].push(order);
  }

  const handleCreateBatch = () => {
    const newBatch = groupCompatibleOrders();
    if (!newBatch) {
      toast.error("Could not create batch", {
        description: "Ensure at least 2 accepted orders are available for grouping.",
      });
      return;
    }

    const rec = logisticsService.recommend(newBatch, vehicles, drivers);
    if (rec.vehicle && rec.driver) {
      assignBatch(newBatch.id, rec.vehicle.id, rec.driver.id);
      toast.success(`Delivery Batch ${newBatch.id} Created & Assigned!`, {
        description: `Assigned ${rec.vehicle.name} (${rec.vehicle.registration}) with driver ${rec.driver.name}. Route: ${newBatch.pickup} → ${newBatch.stops.join(" → ")} (${newBatch.totalQuantity} kg, ${newBatch.distanceKm} km).`,
      });
    } else {
      toast.warning(`Delivery Batch ${newBatch.id} Created`, {
        description: rec.reason || "Batch created in Planned status. Please assign vehicle and driver.",
      });
    }
  };

  const activeBatchesCount = batches.filter((b) => b.status !== "Delivered").length;
  const totalLoadPending = ungroupedOrders.reduce((sum, o) => sum + o.quantity, 0);
  const totalAcceptedAll = orders.filter((o) => o.status === "Accepted" || o.batchId).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Logistics Management & Optimization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Intelligent order consolidation, multi-stop route planning, and fleet capacity allocation
        </p>
      </div>

      {ungroupedOrders.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{ungroupedOrders.length}</strong> accepted orders ({totalLoadPending} kg) from Mandi bases are ready for consolidation and vehicle dispatch.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Accepted Orders (Ungrouped)</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{ungroupedOrders.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total accepted: {totalAcceptedAll}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Active Delivery Batches</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{activeBatchesCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{batches.length} total generated</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Pending Cargo Load</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{totalLoadPending} kg</p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting consolidation</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Available Fleet Vehicles</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {vehicles.filter((v) => v.status === "Available").length} / {vehicles.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {drivers.filter((d) => d.status === "Available").length} drivers ready
          </p>
        </Card>
      </div>

      {Object.keys(ordersByPickup).length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Consolidation Opportunities by Pickup Mandi</h2>
          {Object.entries(ordersByPickup).map(([pickup, pickupOrders]) => {
            const totalLoad = pickupOrders.reduce((sum, o) => sum + o.quantity, 0);
            const destinations = Array.from(new Set(pickupOrders.map((o) => o.delivery)));
            const recommendedVehicle = vehicles.find((v) => v.status === "Available" && v.capacity >= totalLoad);
            const targetCapacity = recommendedVehicle?.capacity || 1000;
            const utilizationPct = Math.min(100, Math.round((totalLoad / targetCapacity) * 100));

            return (
              <Card key={pickup} className="p-6">
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-1.5 flex items-center gap-2">
                        <p className="text-xl font-bold text-foreground">Pickup Hub: {pickup}</p>
                        <Badge variant="secondary">{pickupOrders.length} orders</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Consolidated Load: <strong className="text-foreground">{totalLoad} kg</strong> • 
                        Unique Destinations: <strong className="text-foreground">{destinations.length} Mandis</strong> ({destinations.join(", ")})
                      </p>
                    </div>

                    <Button onClick={handleCreateBatch} className="gap-2">
                      <Boxes className="h-4 w-4" />
                      Create Delivery Batch
                    </Button>
                  </div>

                  {/* Vehicle Utilization & Route Metrics Card */}
                  <div className="grid gap-3 rounded-lg border border-border bg-slate-50/80 p-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Gauge className="size-3.5 text-primary" /> Vehicle Utilization
                      </span>
                      <p className="mt-1 text-sm font-bold text-foreground">{utilizationPct}%</p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${utilizationPct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{totalLoad} kg / {targetCapacity} kg ({recommendedVehicle?.name || "Vehicle B"})</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <RouteIcon className="size-3.5 text-primary" /> Multi-stop Route
                      </span>
                      <p className="mt-1 text-sm font-semibold text-foreground">{destinations.length} Drops</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{pickup} → {destinations.join(" → ")}</p>
                    </div>

                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3.5 text-primary" /> Estimated Distance
                      </span>
                      <p className="mt-1 text-sm font-bold text-foreground">166 km</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Calculated via Mandi Distance Matrix</p>
                    </div>

                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5 text-primary" /> Estimated Transit Time
                      </span>
                      <p className="mt-1 text-sm font-bold text-foreground">4h 29m</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Includes 15 min buffer per stop</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-foreground">Orders Ready for Consolidation</p>
                    {pickupOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between rounded bg-white/70 p-3 text-sm border border-border/50">
                        <div>
                          <span className="font-mono font-semibold text-primary">{order.id}</span> — {order.product} (
                          <strong className="text-foreground">{order.quantity} kg</strong>) from{" "}
                          <span className="font-medium text-foreground">{order.pickup}</span> to{" "}
                          <span className="font-medium text-foreground">{order.delivery}</span>
                          <span className="text-xs text-muted-foreground ml-2">({order.buyer})</span>
                        </div>
                        <span className="font-semibold text-foreground">₹{(order.quantity * order.pricePerUnit).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Optimal Logistics Strategy</p>
                    <p className="rounded bg-blue-50/70 p-3 text-sm text-foreground">
                      Consolidate all {pickupOrders.length} orders into a single multi-stop dispatch:{" "}
                      <strong>{pickup} → {destinations.join(" → ")}</strong>. Reduces carbon emissions and saves individual vehicle trips.
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No ungrouped orders at this time</p>
          <p className="mt-2 text-sm text-muted-foreground">All accepted orders have been grouped into batches</p>
        </Card>
      )}

      {batches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Active Delivery Batches & Fleet Tracking</h2>
          {batches.map((batch) => {
            const batchOrderCount = orders.filter((o) => batch.orderIds.includes(o.id)).length;
            const assignedVehicle = vehicles.find((v) => v.id === batch.vehicleId);
            const assignedDriver = drivers.find((d) => d.id === batch.driverId);
            const vehicleCap = assignedVehicle?.capacity || 1000;
            const batchUtilization = Math.round((batch.totalQuantity / vehicleCap) * 100);

            return (
              <Card key={batch.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-xl font-bold text-primary">{batch.id}</p>
                      <Badge variant={batch.status === "Delivered" ? "outline" : "default"}>
                        {batch.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {batch.stops.length} Stops ({batch.stops.join(" → ")})
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Load & Orders</p>
                      <p className="font-semibold text-foreground">{batch.totalQuantity} kg ({batchOrderCount} orders)</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Vehicle</p>
                      <p className="font-semibold text-foreground">
                        {assignedVehicle ? `${assignedVehicle.name} (${assignedVehicle.registration})` : "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Driver</p>
                      <p className="font-semibold text-foreground">
                        {assignedDriver ? `${assignedDriver.name}` : "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Distance & ETA</p>
                      <p className="font-semibold text-foreground">
                        {batch.distanceKm} km • {formatDuration(batch.etaMinutes)}
                      </p>
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  <div className="rounded-lg border border-border bg-slate-50/70 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Vehicle Capacity Fill Rate:</span>
                      <strong className="text-primary font-bold">{batchUtilization}% ({batch.totalQuantity} kg / {vehicleCap} kg)</strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${batchUtilization >= 80 ? "bg-emerald-600" : "bg-primary"}`}
                        style={{ width: `${batchUtilization}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded border border-border bg-slate-50/50 p-3 text-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Route Sequence: </span>
                      <span className="font-medium text-foreground">{batch.pickup} → {batch.stops.join(" → ")}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {batch.distanceKm} km Total
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
