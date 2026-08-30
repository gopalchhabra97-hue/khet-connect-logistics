import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/driver/deliveries")({
  head: () => ({
    meta: [{ title: "Assigned Deliveries — KHETSETU" }],
  }),
  component: DriverDeliveries,
});

function DriverDeliveries() {
  const { user, batches, orders } = useDemo();

  if (!user) return null;

  const assignedBatches = batches.filter((b) => b.driverId === user.id);
  
  const batchesByStatus = {
    assigned: assignedBatches.filter((b) => b.status === "Assigned"),
    loading: assignedBatches.filter((b) => b.status === "Loading"),
    "in-transit": assignedBatches.filter((b) => b.status === "In Transit"),
    completed: assignedBatches.filter((b) => b.status === "Completed"),
  };

  const totalBatches = assignedBatches.length;
  const totalLoad = assignedBatches.reduce((sum, b) => sum + b.totalQuantity, 0);

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
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{batchesByStatus.assigned.length}</p>
        </Card>
      </div>

      {totalBatches > 0 ? (
        <Tabs defaultValue="assigned" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assigned">Assigned ({batchesByStatus.assigned.length})</TabsTrigger>
            <TabsTrigger value="loading">Loading ({batchesByStatus.loading.length})</TabsTrigger>
            <TabsTrigger value="in-transit">In Transit ({batchesByStatus["in-transit"].length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({batchesByStatus.completed.length})</TabsTrigger>
          </TabsList>

          {["assigned", "loading", "in-transit", "completed"].map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {batchesByStatus[status as keyof typeof batchesByStatus].length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No {status} batches</p>
                </Card>
              ) : (
                batchesByStatus[status as keyof typeof batchesByStatus].map((batch) => {
                  const batchOrders = orders.filter((o) => batch.orderIds.includes(o.id));
                  return (
                  <Card key={batch.id} className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-mono text-lg font-semibold text-primary">{batch.id}</p>
                            <Badge>{batch.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {batchOrders.length} order{batchOrders.length !== 1 ? "s" : ""} • {batch.totalQuantity} kg
                          </p>
                        </div>
                        <Link to="/driver/route">
                          <Button size="sm" variant="outline">
                            View Route
                          </Button>
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                          <p className="mt-1 font-medium text-foreground">{batch.pickup}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Stops</p>
                          <p className="mt-1 font-medium text-foreground">{batch.stops.join(" → ")}</p>
                        </div>
                      </div>

                      <div className="border-t border-border pt-4">
                        <p className="text-sm font-medium text-foreground mb-2">Orders</p>
                        <div className="space-y-2">
                          {batchOrders.slice(0, 3).map((order, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                              <span>{order.product} (from {order.pickup})</span>
                              <span className="font-medium text-foreground">{order.quantity} kg</span>
                            </div>
                          ))}
                          {batchOrders.length > 3 && (
                            <p className="text-xs text-muted-foreground pt-2">
                              +{batchOrders.length - 3} more order{batchOrders.length - 3 !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )})
              )}
            </TabsContent>
          ))}
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
