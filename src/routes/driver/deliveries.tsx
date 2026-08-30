import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MapPin, Navigation, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDemo } from "@/context/DemoStore";
import { formatDuration } from "@/services";
import type { BatchStatus } from "@/types";

export const Route = createFileRoute("/driver/deliveries")({
  head: () => ({
    meta: [{ title: "Assigned Deliveries — KHETSETU" }],
  }),
  component: DriverDeliveries,
});

function DriverDeliveries() {
  const { user, batches, orders, vehicles, setBatchStatus } = useDemo();

  if (!user) return null;

  const assignedBatches = batches.filter((b) => b.driverId === user.id);

  const batchesByStatus = {
    all: assignedBatches,
    assigned: assignedBatches.filter((b) => b.status === "Assigned"),
    "picked-up": assignedBatches.filter((b) => b.status === "Picked Up"),
    "in-transit": assignedBatches.filter((b) => b.status === "In Transit"),
    delivered: assignedBatches.filter((b) => b.status === "Delivered"),
  };

  const totalBatches = assignedBatches.length;
  const totalLoad = assignedBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
  const pendingCount = batchesByStatus.assigned.length + batchesByStatus["picked-up"].length + batchesByStatus["in-transit"].length;

  const handleStatusChange = (batchId: string, nextStatus: BatchStatus) => {
    setBatchStatus(batchId, nextStatus);
    if (nextStatus === "Picked Up") {
      toast.success(`Batch ${batchId} Picked Up`, {
        description: "Goods loaded from pickup location. Ready to start transit.",
      });
    } else if (nextStatus === "In Transit") {
      toast.success(`Batch ${batchId} In Transit`, {
        description: "Delivery trip started. Buyer order statuses updated to In Transit.",
      });
    } else if (nextStatus === "Delivered") {
      toast.success(`Batch ${batchId} Delivered!`, {
        description: "All orders in batch marked as Delivered. Driver and vehicle now available.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Assigned Deliveries</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your delivery batches and shipments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Batches</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalBatches}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Load</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalLoad} kg</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Deliveries</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{pendingCount}</p>
        </Card>
      </div>

      {totalBatches > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:inline-flex md:w-auto">
            <TabsTrigger value="all">All ({batchesByStatus.all.length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({batchesByStatus.assigned.length})</TabsTrigger>
            <TabsTrigger value="picked-up">Picked Up ({batchesByStatus["picked-up"].length})</TabsTrigger>
            <TabsTrigger value="in-transit">In Transit ({batchesByStatus["in-transit"].length})</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({batchesByStatus.delivered.length})</TabsTrigger>
          </TabsList>

          {(["all", "assigned", "picked-up", "in-transit", "delivered"] as const).map((tabKey) => {
            const list = batchesByStatus[tabKey];
            return (
              <TabsContent key={tabKey} value={tabKey} className="space-y-4">
                {list.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No {tabKey} batches at this time</p>
                  </Card>
                ) : (
                  list.map((batch) => {
                    const batchOrders = orders.filter((o) => batch.orderIds.includes(o.id));
                    const assignedVehicle = vehicles.find((v) => v.id === batch.vehicleId);

                    return (
                      <Card key={batch.id} className="p-6">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="font-mono text-lg font-semibold text-primary">{batch.id}</p>
                                <Badge variant={batch.status === "Delivered" ? "outline" : "default"}>
                                  {batch.status}
                                </Badge>
                                {assignedVehicle && (
                                  <span className="text-xs text-muted-foreground">
                                    • {assignedVehicle.name} ({assignedVehicle.registration})
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {batchOrders.length} order{batchOrders.length !== 1 ? "s" : ""} • {batch.totalQuantity} kg • {batch.distanceKm} km • {formatDuration(batch.etaMinutes)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link to="/driver/show-route">
                                <Button size="sm" variant="outline" className="gap-1.5">
                                  <Navigation className="h-3.5 w-3.5" />
                                  View Route
                                </Button>
                              </Link>

                              {batch.status === "Assigned" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(batch.id, "Picked Up")}
                                  className="gap-1.5"
                                >
                                  <PackageCheck className="h-3.5 w-3.5" />
                                  Mark Picked Up
                                </Button>
                              )}

                              {batch.status === "Picked Up" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(batch.id, "In Transit")}
                                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  Start Delivery
                                </Button>
                              )}

                              {batch.status === "In Transit" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(batch.id, "Delivered")}
                                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Mark Delivered
                                </Button>
                              )}

                              {batch.status === "Delivered" && (
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  ✓ Completed
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Pickup Location</p>
                              <p className="mt-1 font-medium text-foreground">{batch.pickup}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Stops Sequence</p>
                              <p className="mt-1 font-medium text-foreground">{batch.stops.join(" → ")}</p>
                            </div>
                          </div>

                          <div className="border-t border-border pt-4">
                            <p className="mb-2 text-sm font-medium text-foreground">Orders in this Batch</p>
                            <div className="space-y-2">
                              {batchOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between rounded bg-slate-50 p-2.5 text-xs sm:text-sm">
                                  <div>
                                    <span className="font-mono font-medium text-primary">{order.id}</span> — {order.product} ({order.quantity} kg) → <span className="font-medium">{order.delivery}</span>
                                    <span className="text-muted-foreground ml-2">({order.buyer})</span>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No deliveries assigned yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon for delivery assignments</p>
        </Card>
      )}
    </div>
  );
}
