import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderTable } from "@/components/common/OrderTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PlaceOrderModal } from "@/components/common/PlaceOrderModal";
import { useDemo } from "@/context/DemoStore";
import { ordersService } from "@/services";

export const Route = createFileRoute("/buyer/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — KHETSETU" },
    ],
  }),
  component: BuyerOrders,
});

function BuyerOrders() {
  const { user, orders } = useDemo();
  const [showPlaceOrder, setShowPlaceOrder] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"all" | "pending" | "accepted" | "delivered" | "rejected">("all");

  if (!user) return null;

  const buyerOrders = ordersService.byBuyer(orders, user.id);

  const filteredOrders = (() => {
    switch (selectedTab) {
      case "pending":
        return ordersService.byStatus(buyerOrders, "Pending");
      case "accepted":
        return ordersService.byStatus(buyerOrders, "Accepted");
      case "delivered":
        return ordersService.byStatus(buyerOrders, "Delivered");
      case "rejected":
        return ordersService.byStatus(buyerOrders, "Rejected");
      default:
        return buyerOrders;
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Orders</h1>
          <p className="mt-1 text-muted-foreground">Manage and track your orders</p>
        </div>
        <Button onClick={() => setShowPlaceOrder(true)} className="gap-2">
          <Plus className="size-4" />
          New Order
        </Button>
      </div>

      {showPlaceOrder && (
        <PlaceOrderModal
          onClose={() => setShowPlaceOrder(false)}
          onSuccess={() => setShowPlaceOrder(false)}
        />
      )}

      {/* Filter Tabs */}
      <div className="surface-panel flex gap-2 overflow-x-auto p-3">
        {(["all", "pending", "accepted", "delivered", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              selectedTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-sidebar-accent/20 text-foreground hover:bg-sidebar-accent/40"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({
              tab === "all"
                ? buyerOrders.length
                : tab === "pending"
                  ? ordersService.byStatus(buyerOrders, "Pending").length
                  : tab === "accepted"
                    ? ordersService.byStatus(buyerOrders, "Accepted").length
                    : tab === "delivered"
                      ? ordersService.byStatus(buyerOrders, "Delivered").length
                      : ordersService.byStatus(buyerOrders, "Rejected").length
            })
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="surface-panel p-5">
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                to={`/buyer/orders/${order.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-sidebar-accent/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground">{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-foreground">
                    {order.quantity.toLocaleString("en-IN")} kg of {order.product} from {order.seller}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.orderDate).toLocaleDateString()} • ₹
                    {(order.quantity * order.pricePerUnit).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <span className="text-sm font-medium text-foreground">
                    To: {order.delivery}
                  </span>
                  <ShoppingCart className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <ShoppingCart className="mx-auto size-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-semibold text-foreground">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedTab === "all"
                ? "Start by browsing the marketplace and placing your first order."
                : `No ${selectedTab} orders at this time.`}
            </p>
            {selectedTab === "all" && (
              <Button asChild className="mt-4">
                <Link to="/buyer/marketplace">Browse Marketplace</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
