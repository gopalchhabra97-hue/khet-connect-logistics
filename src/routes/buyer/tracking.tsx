import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/context/DemoStore";
import { ordersService } from "@/services";

export const Route = createFileRoute("/buyer/tracking")({
  head: () => ({
    meta: [
      { title: "Track Deliveries — KHETSETU" },
    ],
  }),
  component: BuyerTracking,
});

function BuyerTracking() {
  const { user, orders } = useDemo();

  if (!user) return null;

  const buyerOrders = ordersService.byBuyer(orders, user.id);
  const inTransitOrders = buyerOrders.filter(
    (o) => o.status === "Accepted" || o.status === "Preparing" || o.status === "In Transit"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Track Deliveries
        </h1>
        <p className="mt-1 text-muted-foreground">
          Follow the status of your ongoing orders
        </p>
      </div>

      {inTransitOrders.length > 0 ? (
        <div className="space-y-3">
          {inTransitOrders.map((order) => (
            <div
              key={order.id}
              className="surface-panel flex items-center justify-between p-5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  <span className="font-mono font-semibold text-foreground">{order.id}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.product} • {order.quantity} kg → {order.delivery}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Expected: {new Date(order.expectedDelivery).toLocaleDateString()}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to={`/buyer/orders/${order.id}`}>View Details</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-panel flex flex-col items-center justify-center py-12 text-center">
          <Package className="size-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-semibold text-foreground">No active deliveries</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your confirmed orders will appear here as they move through the delivery pipeline.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/buyer/marketplace">Continue Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
