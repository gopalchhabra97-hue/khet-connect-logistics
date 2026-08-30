import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { useDemo } from "@/context/DemoStore";
import { routeDistance } from "@/context/DemoStore";

export const Route = createFileRoute("/driver/show-route")({
  head: () => ({
    meta: [{ title: "Route — KHETSETU" }],
  }),
  component: DriverRoute,
});

function DriverRoute() {
  const { user, batches, drivers, vehicles, orders } = useDemo();

  if (!user) return null;

  const assignedBatch = batches.find((b) => b.driverId === user.id);
  const driverInfo = drivers.find((d) => d.id === user.id);
  const vehicleInfo = driverInfo?.vehicleId ? vehicles.find((v) => v.id === driverInfo.vehicleId) : null;

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
  const totalDistance = routeDistance(assignedBatch.pickup, assignedBatch.stops);
  const estimatedTime = Math.ceil(totalDistance / 60);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Route</h1>
        <p className="mt-1 text-sm text-muted-foreground">Delivery route for batch {assignedBatch.id}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Distance</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalDistance} km</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Estimated Time</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{estimatedTime} min</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Load</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{assignedBatch.totalQuantity} kg</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Stops</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{assignedBatch.stops.length}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Route Map</h2>
          
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
                      {idx === 0 ? "Pickup Location" : "Delivery Stop"}
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
        <h2 className="mb-4 text-lg font-semibold text-foreground">Batch Details</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Batch ID</p>
            <p className="mt-1 font-mono font-semibold text-primary">{assignedBatch.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="mt-1">
              <Badge>{assignedBatch.status}</Badge>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Driver</p>
            <p className="mt-1 font-medium text-foreground">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vehicle</p>
            <p className="mt-1 font-medium text-foreground">{vehicleInfo?.name || "—"}</p>
            {vehicleInfo && (
              <p className="text-xs text-muted-foreground">{vehicleInfo.registration}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Orders in Route</h2>
        <div className="space-y-3">
          {batchOrders.map((order, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-white/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{order.product}</p>
                    <Badge variant="secondary" className="text-xs">{order.quantity} kg</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    From: <span className="font-medium text-foreground">{order.pickup}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    To: <span className="font-medium text-foreground">{order.delivery}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buyer: {order.buyer}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">₹{order.quantity * (order.pricePerUnit ?? 0)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
