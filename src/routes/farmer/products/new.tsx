import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo } from "@/context/DemoStore";
import { CATEGORIES, LOCATIONS } from "@/data/mockData";

export const Route = createFileRoute("/farmer/products/new")({
  head: () => ({
    meta: [
      { title: "Add Product — KHETSETU" },
    ],
  }),
  component: AddProduct,
});

function AddProduct() {
  const navigate = useNavigate();
  const { user, addProduct } = useDemo();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "kg",
    price: "",
    location: user?.location || "",
    harvestDate: new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.quantity || parseInt(formData.quantity) <= 0)
      newErrors.quantity = "Valid quantity is required";
    if (!formData.price || parseFloat(formData.price) <= 0)
      newErrors.price = "Valid price is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.harvestDate) newErrors.harvestDate = "Harvest date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setIsLoading(true);

    try {
      await addProduct({
        name: formData.name,
        category: formData.category as any,
        quantity: parseInt(formData.quantity, 10),
        unit: formData.unit,
        price: parseFloat(formData.price),
        location: formData.location,
        harvestDate: formData.harvestDate,
        available: true,
      });

      toast.success("Product added successfully!", {
        description: `${formData.name} has been listed on the marketplace.`,
      });

      void navigate({ to: "/farmer/products" });
    } catch {
      toast.error("Failed to add product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate({ to: "/farmer/products" })}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Products
      </Button>

      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Add a New Product</h1>
          <p className="mt-1 text-muted-foreground">
            List your produce on the marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="surface-panel mt-6 space-y-6 p-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Tomato, Potato, Wheat"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category" aria-invalid={!!errors.category}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                min="1"
                aria-invalid={!!errors.quantity}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="quintal">Quintal (100 kg)</SelectItem>
                  <SelectItem value="ton">Metric Ton (1000 kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price per {formData.unit} (₹) *</Label>
            <Input
              id="price"
              type="number"
              placeholder="Enter price"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              min="0"
              step="0.01"
              aria-invalid={!!errors.price}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Select
              value={formData.location}
              onValueChange={(value) => setFormData({ ...formData, location: value })}
            >
              <SelectTrigger id="location" aria-invalid={!!errors.location}>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.location && (
              <p className="text-xs text-destructive">{errors.location}</p>
            )}
          </div>

          {/* Harvest Date */}
          <div className="space-y-2">
            <Label htmlFor="harvestDate">Harvest Date *</Label>
            <Input
              id="harvestDate"
              type="date"
              value={formData.harvestDate}
              onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
              aria-invalid={!!errors.harvestDate}
            />
            {errors.harvestDate && (
              <p className="text-xs text-destructive">{errors.harvestDate}</p>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-info/50 bg-info/15 p-4">
            <p className="text-sm text-info-foreground">
              <span className="font-semibold">💡 Tip:</span> Fresh produce with recent harvest dates typically
              attracts more buyers. Be accurate about your harvest date and quantity.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/farmer/products" })}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
