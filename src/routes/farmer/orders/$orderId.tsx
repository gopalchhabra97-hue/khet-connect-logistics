import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Calendar, Users, Package, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/common/OrderTimeline";
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

export const Route = createFileRoute("/farmer/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Details — KHETSETU" },
    ],
  }),
  component: FarmerOrderDetail,
});

function FarmerOrderDetail() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { orders, products, setOrderStatus } = useDemo();
  const [rejectConfirm, setRejectConfirm] = useState(false);

  const order = orders.find((o) => o.id === orderId);
  const product = products.find((p) => p.id === order?.productId);

  if (!order || !product) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: "/farmer/orders" })}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Orders
        </Button>
        <div className="surface-panel py-12 text-center">
          <p className="text-lg font-semibold text-foreground">Order not found</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/farmer/orders">View All Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleAccept = () => {
    setOrderStatus(order.id, "Accepted");
    toast.success("Order accepted!", {
      description: `Order ${order.id} has been confirmed.`,
    });
  };

  const handleReject = () => {
    setOrderStatus(order.id, "Rejected");
    toast.success("Order rejected", {
      description: `Order ${order.id} has been declined.`,
    });
    setRejectConfirm(false);
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate({ to: "/farmer/orders" })}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Orders
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Header */}
          <div className="surface-panel p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {order.id}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Received on {new Date(order.orderDate).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected Delivery</span>
                <span className="font-medium text-foreground">
                  {new Date(order.expectedDelivery).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order Value</span>
                <span className="font-bold text-foreground">
                  ₹{(order.quantity * order.pricePerUnit).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="surface-panel p-5">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Product Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product Name</span>
                <span className="font-medium text-foreground">{product.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{product.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantity Ordered</span>
                <span className="font-medium text-foreground">
                  {order.quantity.toLocaleString("en-IN")} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Available Stock</span>
                <span className="font-medium text-foreground">
                  {product.quantity.toLocaleString("en-IN")} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price per kg</span>
                <span className="font-medium text-foreground">₹{order.pricePerUnit}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total Revenue</span>
                <span className="font-bold text-primary">
                  ₹{(order.quantity * order.pricePerUnit).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="surface-panel p-5">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Buyer Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Buyer</p>
                  <p className="font-medium text-foreground">{order.buyer}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Location</p>
                  <p className="font-medium text-foreground">{order.delivery}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Actions & Info */}
        <div className="space-y-4">
          {/* Pickup Location */}
          <div className="surface-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Pickup Location</h3>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
              <MapPin className="size-4 text-primary" />
              <span className="font-semibold text-foreground">{order.pickup}</span>
            </div>
          </div>

          {/* Actions */}
          {order.status === "Pending" && (
            <div className="surface-panel space-y-3 p-5">
              <h3 className="text-sm font-semibold text-foreground">Actions</h3>
              <Button onClick={handleAccept} className="w-full gap-2">
                <CheckCircle2 className="size-4" />
                Accept Order
              </Button>
              <Dialog open={rejectConfirm} onOpenChange={setRejectConfirm}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <XCircle className="size-4" />
                    Reject Order
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject this order?</DialogTitle>
                    <DialogDescription>
                      The buyer will be notified and cannot proceed with this order. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-sidebar-accent/20 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        {order.id} — {order.product}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order.quantity} kg from {order.buyer}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setRejectConfirm(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleReject}>
                        Yes, Reject Order
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {order.status === "Accepted" && (
            <div className="surface-panel border-l-4 border-l-green-500 bg-green-50 p-5">
              <p className="flex items-center gap-2 font-semibold text-green-900">
                <CheckCircle2 className="size-5" />
                Order Accepted
              </p>
              <p className="mt-2 text-sm text-green-800">
                This order has been confirmed and is ready for logistics planning.
              </p>
            </div>
          )}

          {order.status === "Rejected" && (
            <div className="surface-panel border-l-4 border-l-red-500 bg-red-50 p-5">
              <p className="flex items-center gap-2 font-semibold text-red-900">
                <XCircle className="size-5" />
                Order Rejected
              </p>
              <p className="mt-2 text-sm text-red-800">
                This order has been declined and the buyer has been notified.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="surface-panel p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Order Timeline</h3>
        <OrderTimeline status={order.status} orderDate={order.orderDate} />
      </div>
    </div>
  );
}
