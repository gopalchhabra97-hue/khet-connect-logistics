import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/common/ProductCard";
import { useDemo } from "@/context/DemoStore";
import { productsService } from "@/services";
import { CATEGORIES, LOCATIONS } from "@/data/mockData";

export const Route = createFileRoute("/buyer/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — KHETSETU" },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { products } = useDemo();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [priceRange, setPriceRange] = useState<"all" | "low" | "mid" | "high">("all");

  // Filter available products only
  const availableProducts = productsService.listAvailable(products);

  // Apply filters
  const filtered = useMemo(() => {
    let result = availableProducts;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.seller.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term)
      );
    }

    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (selectedLocation && selectedLocation !== "all") {
      result = result.filter((p) => p.location === selectedLocation);
    }

    if (priceRange !== "all") {
      result = result.filter((p) => {
        if (priceRange === "low") return p.price < 25;
        if (priceRange === "mid") return p.price >= 25 && p.price < 50;
        if (priceRange === "high") return p.price >= 50;
        return true;
      });
    }

    return result.sort((a, b) => a.price - b.price);
  }, [availableProducts, search, selectedCategory, selectedLocation, priceRange]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Marketplace</h1>
        <p className="mt-1 text-muted-foreground">Browse and order fresh produce directly from farmers and FPOs</p>
      </div>

      {/* Filters */}
      <div className="surface-panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Product or farmer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-foreground">
              Category
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium text-foreground">
              Location
            </label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All locations</SelectItem>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium text-foreground">
              Price Range
            </label>
            <Select value={priceRange} onValueChange={(v) => setPriceRange(v as typeof priceRange)}>
              <SelectTrigger id="price">
                <SelectValue placeholder="All prices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All prices</SelectItem>
                <SelectItem value="low">₹ 0 - 24</SelectItem>
                <SelectItem value="mid">₹ 25 - 49</SelectItem>
                <SelectItem value="high">₹ 50+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {availableProducts.length} products
      </p>

      {/* Product Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              action={
                <Button asChild size="sm" className="w-full">
                  <Link to={`/buyer/orders?product=${product.id}`}>
                    Order Now
                  </Link>
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <div className="surface-panel flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-semibold text-foreground">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters or search term
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearch("");
              setSelectedCategory("");
              setSelectedLocation("");
              setPriceRange("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
