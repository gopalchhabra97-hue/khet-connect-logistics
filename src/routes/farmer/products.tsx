import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { Plus, Trash2, Edit2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/context/DemoStore";
import { productsService } from "@/services";

export const Route = createFileRoute("/farmer/products")({
  head: () => ({
    meta: [
      { title: "My Products — KHETSETU" },
    ],
  }),
  component: FarmerProducts,
});

function FarmerProducts() {
  const { user, products, deleteProduct, toggleAvailability } = useDemo();
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const matches = useMatches();

  if (!user) return null;

  // If a child route is active (new or edit), render it instead of the list
  const isChildRouteActive = matches.some(
    (m) =>
      m.routeId === "/farmer/products/new" ||
      m.routeId === "/farmer/products/$productId/edit",
  );

  if (isChildRouteActive) {
    return <Outlet />;
  }

  const farmerProducts = productsService.listBySeller(products, user.id);

  const handleToggleAvailability = (productId: string) => {
    toggleAvailability(productId);
    const product = farmerProducts.find((p) => p.id === productId);
    if (product) {
      toast.success(product.available ? "Product unlisted" : "Product listed", {
        description: product.available ? "This product is no longer available for purchase." : "This product is now available for purchase.",
      });
    }
  };

  const handleDelete = (productId: string) => {
    deleteProduct(productId);
    toast.success("Product deleted", {
      description: "Your product has been removed from the catalog.",
    });
    setDeletingProductId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Products</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your produce listings and inventory
          </p>
        </div>
        <Button asChild>
          <Link to="/farmer/products/new">
            <Plus className="mr-2 size-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Products Grid */}
      <div>
        {farmerProducts.length > 0 ? (
          <div className="space-y-3">
            {farmerProducts.map((product) => (
              <div
                key={product.id}
                className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                    <Badge variant={product.available ? "default" : "secondary"}>
                      {product.available ? "Available" : "Unlisted"}
                    </Badge>
                    {product.verified && (
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium text-foreground">{product.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      <p className="font-medium text-foreground">
                        {product.quantity.toLocaleString("en-IN")} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium text-foreground">₹{product.price}/kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">{product.location}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Harvested {new Date(product.harvestDate).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAvailability(product.id)}
                    className="gap-1.5"
                    title={product.available ? "Unlist" : "List"}
                  >
                    {product.available ? (
                      <>
                        <EyeOff className="size-4" />
                        <span className="hidden sm:inline">Unlist</span>
                      </>
                    ) : (
                      <>
                        <Eye className="size-4" />
                        <span className="hidden sm:inline">List</span>
                      </>
                    )}
                  </Button>

                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link to={`/farmer/products/${product.id}/edit`}>
                      <Edit2 className="size-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Link>
                  </Button>

                  <Dialog open={deletingProductId === product.id} onOpenChange={(open) => !open && setDeletingProductId(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingProductId(product.id)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Product?</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete {product.name}? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="rounded-lg bg-sidebar-accent/20 p-4">
                          <p className="text-sm font-semibold text-foreground">{product.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {product.quantity} kg • ₹{product.price}/kg
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setDeletingProductId(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            Yes, Delete
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-panel flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-semibold text-foreground">No products yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started by adding your first product.
            </p>
            <Button asChild className="mt-4">
              <Link to="/farmer/products/new">
                <Plus className="mr-2 size-4" />
                Add Your First Product
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
