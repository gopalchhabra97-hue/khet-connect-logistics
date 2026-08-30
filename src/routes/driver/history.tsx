import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/driver/history")({
  head: () => ({
    meta: [{ title: "Delivery History — KHETSETU" }],
  }),
  component: DriverHistory,
});

function DriverHistory() {
  const { user, batches } = useDemo();

  if (!user) return null;

  // Get completed batches for this driver
  const completedBatches = batches.filter((b) => b.driverId === user.id && b.status === "Completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Delivery History</h1>
        <p className="mt-1 text-sm text-muted-foreground">View your past deliveries</p>
      </div>

      {completedBatches.length > 0 ? (
        <div className="space-y-4">
          {completedBatches.map((batch) => (
            <Card key={batch.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-lg font-semibold text-primary">{batch.id}</p>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {batch.orders.length} order{batch.orders.length !== 1 ? "s" : ""} • {batch.load} kg
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                    <p className="mt-1 font-medium text-foreground">{batch.pickup}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Stops</p>
                    <p className="mt-1 font-medium text-foreground">{batch.stops.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Distance</p>
                    <p className="mt-1 font-medium text-foreground">—</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <p className="mt-1 font-medium text-green-600">Completed</p>
                  </div>
                </div>

                {/* Orders summary */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Orders</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {batch.orders.map((order, idx) => (
                      <p key={idx}>
                        • {order.product} ({order.quantity} kg) → {order.delivery}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No completed deliveries yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Your completed deliveries will appear here</p>
        </Card>
      )}
    </div>
  );
}
