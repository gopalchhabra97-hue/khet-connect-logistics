import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, MapPin, Navigation, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RouteMap } from "@/components/common/RouteMap";
import { routeDistance, useDemo } from "@/context/DemoStore";
import { formatDuration } from "@/services";
import type { BatchStatus } from "@/types";

export const Route = createFileRoute("/driver/show-route")({
  head: () => ({
    meta: [{ title: "Route — KHETSETU" }],
  }),
  component: DriverRoute,
});

function DriverRoute() {
  const { user, batches, drivers, vehicles, orders, setBatchStatus } = useDemo();

  if (!user) return null;

  const assignedBatch = batches.find((b) => b.driverId === user.id && b.status !== "Delivered") ||
    batches.find((b) => b.driverId === user.id);
  const driverInfo = drivers.find((d) => d.id === user.id);
  const vehicleInfo = assignedBatch?.vehicleId
    ? vehicles.find((v) => v.id === assignedBatch.vehicleId)
    : driverInfo?.vehicleId
      ? vehicles.find((v) => v.id === driverInfo.vehicleId)
      : null;

  if (!assignedBatch) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Route</h1>
          <p className="mt-1 text-sm text-muted-foreground">No active route assigned</p>
        </div>
        <Card className="p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No delivery batches assigned yet</p>
        </Card>
      </div>
    );
  }

  const batchOrders = orders.filter((o) => assignedBatch.orderIds.includes(o.id));
  const allStops = [assignedBatch.pickup, ...assignedBatch.stops];
  const totalDistance = assignedBatch.distanceKm || routeDistance(assignedBatch.pickup, assignedBatch.stops);
  const estimatedTime = assignedBatch.etaMinutes || Math.ceil(totalDistance / 60);

  const handleStatusChange = (nextStatus: BatchStatus) => {
    setBatchStatus(assignedBatch.id, nextStatus);
    if (nextStatus === "Picked Up") {
      toast.success(`Batch ${assignedBatch.id} Picked Up`, {
        description: "Goods loaded from pickup location. Ready to start transit.",
      });
    } else if (nextStatus === "In Transit") {
      toast.success(`Batch ${assignedBatch.id} In Transit`, {
        description: "Delivery trip started. Buyer order statuses updated to In Transit.",
      });
    } else if (nextStatus === "Delivered") {
      toast.success(`Batch ${assignedBatch.id} Delivered!`, {
        description: "All orders in batch marked as Delivered. Driver and vehicle now available.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Delivery Route</h1>
          <p className="mt-1 text-sm text-muted-foreground">Active route for batch {assignedBatch.id}</p>
        </div>

        <div className="flex items-center gap-2">
          {assignedBatch.status === "Assigned" && (
            <Button
              onClick={() => handleStatusChange("Picked Up")}
              className="gap-1.5"
            >
              <PackageCheck className="h-4 w-4" />
              Mark Picked Up
            </Button>
          )}

          {assignedBatch.status === "Picked Up" && (
            <Button
              onClick={() => handleStatusChange("In Transit")}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Truck className="h-4 w-4" />
              Start Delivery
            </Button>
          )}

          {assignedBatch.status === "In Transit" && (
            <Button
              onClick={() => handleStatusChange("Delivered")}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Delivered
            </Button>
          )}

          {assignedBatch.status === "Delivered" && (
            <Badge variant="outline" className="text-green-600 border-green-300 py-1.5 px-3">
              ✓ Delivery Completed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Distance</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalDistance} km</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Estimated Time</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatDuration(estimatedTime)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Load</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{assignedBatch.totalQuantity} kg</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Delivery Stops</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{assignedBatch.stops.length}</p>
        </Card>
      </div>

      {/* Visual GIS Map Visualizer */}
      <RouteMap
        pickup={assignedBatch.pickup}
        stops={assignedBatch.stops}
        batchId={assignedBatch.id}
        distanceKm={totalDistance}
        etaMinutes={estimatedTime}
      />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Route Sequence & Waypoints</h2>
          
          <div className="space-y-4">
            {allStops.map((stop, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{stop}</p>
                    <p className="text-sm text-muted-foreground">
                      {idx === 0 ? "Pickup Location (Mandi Base)" : `Delivery Stop #${idx} (Buyer Terminal)`}
                    </p>
                  </div>
                </div>
                {idx < allStops.length - 1 && (
                  <div className="ml-5 border-l-2 border-dashed border-primary/30 py-2 pl-4">
                    <p className="text-xs text-muted-foreground">
                      ~{routeDistance(allStops[idx], [allStops[idx + 1]])} km
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Batch & Vehicle Details</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Batch ID</p>
            <p className="mt-1 font-mono font-semibold text-primary">{assignedBatch.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="mt-1">
              <Badge variant={assignedBatch.status === "Delivered" ? "outline" : "default"}>
                {assignedBatch.status}
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Driver</p>
            <p className="mt-1 font-medium text-foreground">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Assigned Vehicle</p>
            <p className="mt-1 font-medium text-foreground">{vehicleInfo?.name || "—"}</p>
            {vehicleInfo && (
              <p className="text-xs text-muted-foreground">{vehicleInfo.registration} ({vehicleInfo.capacity} kg)</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Orders in Route ({batchOrders.length})</h2>
        <div className="space-y-3">
          {batchOrders.map((order, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-white/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">{order.id}</span>
                    <p className="font-medium text-foreground">{order.product}</p>
                    <Badge variant="secondary" className="text-xs">{order.quantity} kg</Badge>
                    <Badge variant="outline" className="text-xs">{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    From: <span className="font-medium text-foreground">{order.pickup}</span> → To: <span className="font-medium text-foreground">{order.delivery}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buyer: {order.buyer}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">₹{(order.quantity * (order.pricePerUnit ?? 0)).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
