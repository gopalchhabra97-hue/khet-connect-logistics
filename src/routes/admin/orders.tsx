import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [{ title: "Orders — KHETSETU" }],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { orders } = useDemo();

  const statusCounts = {
    pending: orders.filter((o) => o.status === "Pending").length,
    accepted: orders.filter((o) => o.status === "Accepted").length,
    preparing: orders.filter((o) => o.status === "Preparing").length,
    "in-transit": orders.filter((o) => o.status === "In Transit").length,
    delivered: orders.filter((o) => o.status === "Delivered").length,
    rejected: orders.filter((o) => o.status === "Rejected").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "secondary";
      case "Accepted":
      case "Preparing":
      case "In Transit":
        return "default";
      case "Delivered":
        return "outline";
      case "Rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide order management</p>
      </div>

      {/* Status breakdown */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">All</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{orders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{statusCounts.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Accepted</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{statusCounts.accepted}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">In Transit</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{statusCounts["in-transit"]}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Delivered</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{statusCounts.delivered}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
        </Card>
      </div>

      {/* Orders list */}
      <Card className="p-4">
        <div className="grid gap-1 text-sm">
          <div className="grid grid-cols-6 gap-4 font-semibold text-foreground py-2 border-b">
            <div>Order ID</div>
            <div>Product</div>
            <div>Buyer</div>
            <div>Quantity</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          {orders.map((order) => (
            <div key={order.id} className="grid grid-cols-6 gap-4 py-3 border-b last:border-b-0 items-center">
              <div className="font-mono font-semibold text-primary text-sm">{order.id}</div>
              <div className="text-foreground text-sm">{order.product}</div>
              <div className="text-muted-foreground text-sm">{order.buyer}</div>
              <div className="text-foreground">{order.quantity} {order.unit}</div>
              <div className="text-foreground font-medium">₹{(order.quantity * order.pricePerUnit).toLocaleString()}</div>
              <div>
                <Badge variant={getStatusColor(order.status) as any}>{order.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
