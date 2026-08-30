import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Calendar, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/common/OrderTimeline";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/buyer/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Details — KHETSETU" },
    ],
  }),
  component: BuyerOrderDetail,
});

function BuyerOrderDetail() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { orders, products } = useDemo();

  const order = orders.find((o) => o.id === orderId);
  const product = products.find((p) => p.id === order?.productId);

  if (!order || !product) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: "/buyer/orders" })}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Orders
        </Button>
        <div className="surface-panel py-12 text-center">
          <p className="text-lg font-semibold text-foreground">Order not found</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/buyer/orders">View All Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate({ to: "/buyer/orders" })}>
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
                  Order placed on {new Date(order.orderDate).toLocaleDateString()}
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
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-bold text-foreground">
                  ₹{(order.quantity * order.pricePerUnit).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="surface-panel p-5">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Product</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
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
                <span className="text-muted-foreground">Price per kg</span>
                <span className="font-medium text-foreground">₹{order.pricePerUnit}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total Cost</span>
                <span className="font-bold text-primary">
                  ₹{(order.quantity * order.pricePerUnit).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="surface-panel p-5">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Seller Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Farmer / FPO</p>
                  <p className="font-medium text-foreground">{order.seller}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Pickup Location</p>
                  <p className="font-medium text-foreground">{order.pickup}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Harvest Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(product.harvestDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Delivery Info */}
        <div className="space-y-4">
          {/* Delivery Location */}
          <div className="surface-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Delivery Location</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                <MapPin className="size-4 text-primary" />
                <span className="font-semibold text-foreground">{order.delivery}</span>
              </div>
            </div>
          </div>

          {/* Harvest Badge */}
          {product.verified && (
            <div className="surface-panel p-5">
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Status</p>
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-sm font-semibold text-green-900">✓ Verified Farmer</p>
                <p className="mt-1 text-xs text-green-800">
                  This farmer has been verified by the platform
                </p>
              </div>
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
