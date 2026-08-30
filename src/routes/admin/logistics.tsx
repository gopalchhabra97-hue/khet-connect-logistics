import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/logistics")({
  head: () => ({
    meta: [{ title: "Logistics Management — KHETSETU" }],
  }),
  component: LogisticsPage,
});

function LogisticsPage() {
  const { orders, batches } = useDemo();

  const ungroupedOrders = orders.filter((o) => o.status === "Accepted");
  
  const ordersByPickup: Record<string, typeof orders> = {};
  for (const order of ungroupedOrders) {
    if (!ordersByPickup[order.pickup]) {
      ordersByPickup[order.pickup] = [];
    }
    ordersByPickup[order.pickup].push(order);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Logistics Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Order grouping and delivery batch planning</p>
      </div>

      {ungroupedOrders.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{ungroupedOrders.length}</strong> accepted orders are ready for grouping and batch assignment.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Accepted Orders</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{ungroupedOrders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Batches</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{batches.filter(b => b.status !== "Completed").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Load Pending</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{ungroupedOrders.reduce((sum, o) => sum + o.quantity, 0)} kg</p>
        </Card>
      </div>

      {Object.keys(ordersByPickup).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(ordersByPickup).map(([pickup, pickupOrders]) => {
            const totalLoad = pickupOrders.reduce((sum, o) => sum + o.quantity, 0);
            const destinations = new Set(pickupOrders.map((o) => o.delivery));

            return (
              <Card key={pickup} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-lg text-foreground">Pickup: {pickup}</p>
                        <Badge variant="secondary">{pickupOrders.length} orders</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Load: <span className="font-medium text-foreground">{totalLoad} kg</span> • 
                        Destinations: <span className="font-medium text-foreground">{Array.from(destinations).join(", ")}</span>
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Orders</p>
                    {pickupOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between bg-white/50 rounded p-3 text-sm">
                        <div>
                          <span className="font-mono font-medium text-primary">{order.id}</span> — {order.product} ({order.quantity} kg) from{" "}
                          <span className="font-medium">{order.pickup}</span> to{" "}
                          <span className="font-medium">{order.delivery}</span> (Buyer: {order.buyer})
                        </div>
                        <span className="font-medium text-foreground">₹{order.quantity * order.pricePerUnit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">RECOMMENDATION</p>
                    <p className="text-sm text-foreground bg-blue-50/50 rounded p-3">
                      {Array.from(destinations).length === 1
                        ? `All orders → ${Array.from(destinations)[0]}. One vehicle sufficient.`
                        : `Multi-stop route: ${Array.from(destinations)
                            .join(" → ")}. Use one vehicle with ${Array.from(destinations).length} stops.`}
                    </p>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      In production: Click "Create Batch" to generate a delivery batch with automatic vehicle and driver assignment.
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
          <h2 className="text-lg font-semibold text-foreground">Active Delivery Batches</h2>
          {batches.map((batch) => {
            const batchOrderCount = orders.filter((o) => batch.orderIds.includes(o.id)).length;
            return (
            <Card key={batch.id} className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="font-mono font-semibold text-primary text-lg">{batch.id}</p>
                    <Badge>{batch.status}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Load</p>
                    <p className="font-medium text-foreground">{batch.totalQuantity} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Route</p>
                    <p className="font-medium text-foreground">{batch.pickup} → {batch.stops.join(" → ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Orders</p>
                    <p className="font-medium text-foreground">{batchOrderCount}</p>
                  </div>
                </div>
              </div>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
