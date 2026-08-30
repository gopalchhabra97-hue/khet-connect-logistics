import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/buyers")({
  head: () => ({
    meta: [{ title: "Buyers — KHETSETU" }],
  }),
  component: BuyersPage,
});

function BuyersPage() {
  const { orders } = useDemo();

  // Extract unique buyers from orders
  const buyers = Array.from(
    new Map(orders.map((o) => [o.buyerId, o])).values()
  ).map((o) => ({
    id: o.buyerId,
    name: o.buyer,
    orders: orders.filter((or) => or.buyerId === o.buyerId).length,
    totalValue: orders
      .filter((or) => or.buyerId === o.buyerId)
      .reduce((sum, or) => sum + or.quantity * or.pricePerUnit, 0),
    lastOrder: orders
      .filter((or) => or.buyerId === o.buyerId)
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0]?.orderDate || "—",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Buyers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage registered buyers</p>
      </div>

      <Card className="p-4">
        <div className="grid gap-1 text-sm">
          <div className="grid grid-cols-5 gap-4 font-semibold text-foreground py-2 border-b">
            <div>Buyer</div>
            <div>Orders</div>
            <div>Total Spent</div>
            <div>Last Order</div>
            <div>Status</div>
          </div>
          {buyers.map((buyer) => (
            <div key={buyer.id} className="grid grid-cols-5 gap-4 py-3 border-b last:border-b-0 items-center">
              <div className="font-medium text-foreground">{buyer.name}</div>
              <div className="text-foreground">{buyer.orders}</div>
              <div className="text-foreground">₹{buyer.totalValue.toLocaleString()}</div>
              <div className="text-muted-foreground text-xs">{buyer.lastOrder}</div>
              <div>
                <Badge>Active</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
