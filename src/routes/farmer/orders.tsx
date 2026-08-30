import { createFileRoute, Link } from "@tanstack/react-router";
import { Clipboard, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDemo } from "@/context/DemoStore";
import { productsService, ordersService } from "@/services";

export const Route = createFileRoute("/farmer/orders")({
  head: () => ({
    meta: [
      { title: "Orders — KHETSETU" },
    ],
  }),
  component: FarmerOrders,
});

function FarmerOrders() {
  const { user, products, orders, setOrderStatus } = useDemo();
  const [selectedTab, setSelectedTab] = useState<"pending" | "accepted" | "rejected">("pending");
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);

  if (!user) return null;

  // Get farmer's products
  const farmerProducts = productsService.listBySeller(products, user.id);
  const farmerProductIds = new Set(farmerProducts.map((p) => p.id));

  // Get orders for farmer's products
  const farmerOrders = orders.filter((o) => farmerProductIds.has(o.productId));

  const pendingOrders = ordersService.byStatus(farmerOrders, "Pending");
  const acceptedOrders = ordersService.byStatus(farmerOrders, "Accepted");
  const rejectedOrders = ordersService.byStatus(farmerOrders, "Rejected");

  const displayedOrders =
    selectedTab === "pending"
      ? pendingOrders
      : selectedTab === "accepted"
        ? acceptedOrders
        : rejectedOrders;

  const handleAccept = (orderId: string) => {
    setOrderStatus(orderId, "Accepted");
    toast.success("Order accepted!", {
      description: `Order ${orderId} is now confirmed.`,
    });
  };

  const handleReject = (orderId: string) => {
    setOrderStatus(orderId, "Rejected");
    toast.success("Order rejected", {
      description: `Order ${orderId} has been declined.`,
    });
    setRejectingOrderId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Orders</h1>
        <p className="mt-1 text-muted-foreground">
          Manage incoming orders from buyers
        </p>
      </div>

      {/* Alert for pending orders */}
      {pendingOrders.length > 0 && selectedTab !== "pending" && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/15 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning-foreground">
              You have {pendingOrders.length} pending order{pendingOrders.length !== 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-sm text-warning-foreground/80">
              Review and approve pending orders to proceed with logistics planning.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="surface-panel flex gap-2 overflow-x-auto p-3">
        {(["pending", "accepted", "rejected"] as const).map((tab) => {
          const count =
            tab === "pending"
              ? pendingOrders.length
              : tab === "accepted"
                ? acceptedOrders.length
                : rejectedOrders.length;

          return (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                selectedTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-sidebar-accent/20 text-foreground hover:bg-sidebar-accent/40"
              }`}
            >
              {tab === "pending" && "Pending "}
              {tab === "accepted" && "Accepted "}
              {tab === "rejected" && "Rejected "}
              ({count})
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {displayedOrders.length > 0 ? (
          displayedOrders.map((order) => {
            const product = farmerProducts.find((p) => p.id === order.productId);
            return (
              <div
                key={order.id}
                className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/farmer/orders/${order.id}`}
                      className="font-mono font-semibold text-primary hover:underline"
                    >
                      {order.id}
                    </Link>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Product</p>
                      <p className="font-medium text-foreground">{order.product}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      <p className="font-medium text-foreground">
                        {order.quantity.toLocaleString("en-IN")} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Buyer</p>
                      <p className="font-medium text-foreground">{order.buyer}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Delivery To</p>
                      <p className="font-medium text-foreground">{order.delivery}</p>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground">
                    <p>Order Date: {new Date(order.orderDate).toLocaleDateString()}</p>
                    <p>Expected Delivery: {new Date(order.expectedDelivery).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Order Value */}
                <div className="flex flex-col items-end gap-3 sm:flex-col">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Order Value</p>
                    <p className="text-xl font-bold text-primary">
                      ₹{(order.quantity * order.pricePerUnit).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Actions */}
                  {order.status === "Pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(order.id)}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="size-4" />
                        <span className="hidden sm:inline">Accept</span>
                      </Button>
                      <Dialog open={rejectingOrderId === order.id} onOpenChange={(open) => !open && setRejectingOrderId(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectingOrderId(order.id)}
                            className="gap-1.5"
                          >
                            <XCircle className="size-4" />
                            <span className="hidden sm:inline">Reject</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Order {order.id}?</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to reject this order? The buyer will be notified.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="rounded-lg bg-sidebar-accent/20 p-4">
                              <p className="text-sm text-foreground">
                                <span className="font-semibold">{order.quantity} kg</span> of{" "}
                                <span className="font-semibold">{order.product}</span> from{" "}
                                <span className="font-semibold">{order.buyer}</span>
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                onClick={() => setRejectingOrderId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleReject(order.id)}
                              >
                                Yes, Reject
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="surface-panel flex flex-col items-center justify-center py-12 text-center">
            <Clipboard className="size-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              No {selectedTab} orders
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedTab === "pending"
                ? "You're all caught up! No pending orders at the moment."
                : selectedTab === "accepted"
                  ? "You haven't accepted any orders yet."
                  : "No rejected orders."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
