import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo } from "@/context/DemoStore";
import { CATEGORIES, LOCATIONS } from "@/data/mockData";
import { mandiApi, type ApiMandiReference } from "@/services/api";
import { TrendingUp, ShieldCheck, AlertCircle } from "lucide-react";

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

  const [mandiRef, setMandiRef] = useState<ApiMandiReference | null>(null);
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query Mandi reference price when commodity or location changes
  useEffect(() => {
    if (!formData.name || formData.name.trim().length < 2) {
      setMandiRef(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLoadingRef(true);
      try {
        const ref = await mandiApi.getReferencePrice(formData.name.trim(), formData.location);
        if (isMounted) setMandiRef(ref);
      } catch (err) {
        console.warn("Could not fetch mandi reference price:", err);
      } finally {
        if (isMounted) setIsLoadingRef(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.name, formData.location]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.quantity || parseInt(formData.quantity) <= 0)
      newErrors.quantity = "Valid quantity is required";
    
    const priceVal = parseFloat(formData.price);
    if (!formData.price || priceVal <= 0) {
      newErrors.price = "Valid price is required";
    } else if (mandiRef && priceVal > mandiRef.max_allowed_price) {
      newErrors.price = `Price exceeds maximum allowed price of ₹${mandiRef.max_allowed_price.toFixed(2)}/kg (+${mandiRef.max_markup_percent}% limit over ${mandiRef.status} mandi rate).`;
    }

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
    } catch (err: any) {
      const msg = err.message || "Failed to add product. Please try again.";
      const cleanMsg = msg.includes("]: ") ? msg.split("]: ")[1] : msg;
      toast.error(cleanMsg);
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
            <div className="flex items-center justify-between">
              <Label htmlFor="price">Price per {formData.unit} (₹) *</Label>
              {mandiRef && (
                <span className="text-xs text-muted-foreground">
                  Max allowed: <b className="text-foreground">₹{mandiRef.max_allowed_price.toFixed(2)}</b>/{formData.unit}
                </span>
              )}
            </div>
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

            {/* Mandi Reference & Controlled Markup Indicator */}
            {mandiRef && (
              <div className="mt-3 rounded-lg border border-border bg-card/60 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <TrendingUp className="size-3.5 text-primary" />
                    <span>Mandi Reference Price</span>
                  </div>
                  {mandiRef.status === "live" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      ● Live Mandi Rate
                    </span>
                  ) : mandiRef.status === "stale" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      ● Stale Mandi Rate
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                      ● Demo Benchmark
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground">Market Modal Rate:</span>
                    <p className="font-semibold text-foreground">
                      ₹{mandiRef.price_per_kg.toFixed(2)}/kg
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">
                        (₹{mandiRef.modal_price.toFixed(0)}/{mandiRef.unit})
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Controlled Price Ceiling:</span>
                    <p className="font-bold text-primary">
                      ₹{mandiRef.max_allowed_price.toFixed(2)}/kg
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">
                        (+{mandiRef.max_markup_percent}%)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-dashed border-border/50">
                  <span>
                    Source: {mandiRef.market} Mandi, {mandiRef.state} ({mandiRef.price_date})
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, price: String(mandiRef.price_per_kg) })}
                    className="text-primary hover:underline font-medium"
                  >
                    Use Mandi Rate
                  </button>
                </div>
              </div>
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
