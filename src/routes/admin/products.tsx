import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [{ title: "Products — KHETSETU" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { products } = useDemo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of all listed products</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{products.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{products.filter((p) => p.available).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Unlisted</p>
          <p className="mt-1 text-2xl font-bold text-gray-500">{products.filter((p) => !p.available).length}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-1 text-sm">
          <div className="grid grid-cols-6 gap-4 font-semibold text-foreground py-2 border-b">
            <div>Product</div>
            <div>Farmer</div>
            <div>Category</div>
            <div>Stock</div>
            <div>Price/kg</div>
            <div>Status</div>
          </div>
          {products.map((product) => (
            <div key={product.id} className="grid grid-cols-6 gap-4 py-3 border-b last:border-b-0 items-center">
              <div className="font-medium text-foreground">{product.name}</div>
              <div className="text-muted-foreground text-sm">{product.seller}</div>
              <div className="text-foreground text-sm">{product.category}</div>
              <div className="text-foreground">{product.quantity} {product.unit}</div>
              <div className="text-foreground">₹{product.price}</div>
              <div>
                <Badge variant={product.available ? "default" : "secondary"}>
                  {product.available ? "Available" : "Unlisted"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
