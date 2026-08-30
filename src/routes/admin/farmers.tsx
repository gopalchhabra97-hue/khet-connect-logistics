import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/farmers")({
  head: () => ({
    meta: [{ title: "Farmers/FPOs — KHETSETU" }],
  }),
  component: FarmersPage,
});

function FarmersPage() {
  const { products } = useDemo();

  // Extract unique farmers from products
  const farmers = Array.from(
    new Map(products.map((p) => [p.sellerId, p])).values()
  ).map((p) => ({
    id: p.sellerId,
    name: p.seller,
    location: p.location,
    verified: p.verified,
    products: products.filter((pr) => pr.sellerId === p.sellerId).length,
    totalStock: products.filter((pr) => pr.sellerId === p.sellerId).reduce((sum, pr) => sum + pr.quantity, 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Farmers & FPOs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage registered farmers and FPOs</p>
      </div>

      <Card className="p-4">
        <div className="grid gap-1 text-sm">
          <div className="grid grid-cols-5 gap-4 font-semibold text-foreground py-2 border-b">
            <div>Farmer/FPO</div>
            <div>Location</div>
            <div>Products</div>
            <div>Total Stock</div>
            <div>Status</div>
          </div>
          {farmers.map((farmer) => (
            <div key={farmer.id} className="grid grid-cols-5 gap-4 py-3 border-b last:border-b-0 items-center">
              <div className="font-medium text-foreground">{farmer.name}</div>
              <div className="text-muted-foreground">{farmer.location}</div>
              <div className="text-foreground">{farmer.products}</div>
              <div className="text-foreground">{farmer.totalStock} kg</div>
              <div>
                <Badge variant={farmer.verified ? "default" : "secondary"}>
                  {farmer.verified ? "Verified" : "Pending"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
