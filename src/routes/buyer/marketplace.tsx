import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Truck,
  ShieldCheck,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/common/ProductCard";
import { useDemo } from "@/context/DemoStore";
import { productsService } from "@/services";
import { CATEGORIES, LOCATIONS } from "@/data/mockData";
import {
  matchingApi,
  type ApiMatchingResultItem,
  type ApiMatchingSearchRequest,
} from "@/services/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/buyer/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — KHETSETU" },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { products, user } = useDemo();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [priceRange, setPriceRange] = useState<"all" | "low" | "mid" | "high">("all");

  // Matching state
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [isSearchingMatches, setIsSearchingMatches] = useState(false);
  const [matchingResults, setMatchingResults] = useState<ApiMatchingResultItem[] | null>(null);

  const [matchForm, setMatchForm] = useState({
    commodity: "Tomato",
    quantity: "500",
    unit: "kg",
    maxPrice: "70",
    deliveryLocation: user?.location || "Chandigarh",
    requiredByDays: "2",
  });

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

  const handleSearchMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(matchForm.quantity);
    if (!matchForm.commodity.trim() || isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid crop name and quantity");
      return;
    }

    setIsSearchingMatches(true);
    try {
      const reqPayload: ApiMatchingSearchRequest = {
        commodity: matchForm.commodity.trim(),
        quantity: qty,
        unit: matchForm.unit,
        max_price: matchForm.maxPrice ? parseFloat(matchForm.maxPrice) : null,
        delivery_location: matchForm.deliveryLocation.trim() || null,
        required_by_days: matchForm.requiredByDays ? parseInt(matchForm.requiredByDays, 10) : null,
      };

      const res = await matchingApi.search(reqPayload);
      setMatchingResults(res.matches);
      setIsMatchingModalOpen(false);

      if (res.matches.length > 0) {
        toast.success(`Found ${res.matches.length} matching farmer listing(s)!`);
      } else {
        toast.info(`No active farmer listings found for ${matchForm.commodity}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to find matching farmers");
    } finally {
      setIsSearchingMatches(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Marketplace</h1>
          <p className="mt-1 text-muted-foreground">Browse and order fresh produce directly from farmers and FPOs</p>
        </div>
        <Button
          onClick={() => setIsMatchingModalOpen(true)}
          className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
        >
          <Sparkles className="size-4" />
          Find Best Matches
        </Button>
      </div>

      {/* Recommended Matches Banner / Active Matches Section */}
      {matchingResults !== null && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Intelligent Matches for {matchForm.commodity} ({matchForm.quantity} {matchForm.unit})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ranked by crop compatibility, fulfillment, price, mandi benchmark, and logistics
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMatchingResults(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 size-3.5" />
              Clear Recommendations
            </Button>
          </div>

          {matchingResults.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {matchingResults.map((item, idx) => (
                <div
                  key={item.product_id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3 transition-all hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Rank #{idx + 1}
                        </span>
                        {item.fulfillment === "full" ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Full Fulfillment
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            Partial Fulfillment
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground mt-1">{item.commodity}</h3>
                      <p className="text-xs text-muted-foreground">Farmer: {item.farmer_name} • {item.location}</p>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-extrabold text-primary">
                        MATCH: {item.match_score}/100
                      </div>
                      <p className="text-base font-bold text-foreground mt-1">₹{item.farmer_price}/{item.unit}</p>
                    </div>
                  </div>

                  {/* Why this matched explanations */}
                  <div className="rounded-md bg-muted/50 p-2.5 text-xs space-y-1 text-muted-foreground border border-border/40">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      Best match highlights:
                    </p>
                    <ul className="space-y-0.5 pl-4 list-disc text-[11px]">
                      {item.explanation.slice(0, 4).map((exp, i) => (
                        <li key={i}>{exp}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Score Breakdown Pills */}
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <div>Crop: <b className="text-foreground">{item.score_breakdown.commodity}</b>/30</div>
                    <div>Qty: <b className="text-foreground">{item.score_breakdown.quantity}</b>/20</div>
                    <div>Price: <b className="text-foreground">{item.score_breakdown.price}</b>/20</div>
                    <div>Location: <b className="text-foreground">{item.score_breakdown.location}</b>/15</div>
                    <div>Transit: <b className="text-foreground">{item.score_breakdown.delivery}</b>/10</div>
                    <div>Quality: <b className="text-foreground">{item.score_breakdown.quality}</b>/5</div>
                  </div>

                  {/* Action */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Avail: <b>{item.available_quantity} {item.unit}</b>
                    </span>
                    <Button asChild size="sm" className="gap-1">
                      <Link to={`/buyer/orders?product=${item.product_id}`}>
                        Order Now
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No active listings found matching "{matchForm.commodity}". Try adjusting your criteria.
            </div>
          )}
        </div>
      )}

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

      {/* Matching Search Dialog */}
      <Dialog open={isMatchingModalOpen} onOpenChange={setIsMatchingModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Find Best Matching Farmers
            </DialogTitle>
            <DialogDescription>
              Specify your crop needs. KHETSETU ranks available farmer supply based on compatibility, price, mandi rates, and highway logistics.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearchMatches} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="match-commodity">Crop / Commodity *</Label>
              <Input
                id="match-commodity"
                placeholder="e.g. Tomato, Wheat, Potato, Onion"
                value={matchForm.commodity}
                onChange={(e) => setMatchForm({ ...matchForm, commodity: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="match-qty">Required Quantity *</Label>
                <Input
                  id="match-qty"
                  type="number"
                  placeholder="500"
                  value={matchForm.quantity}
                  onChange={(e) => setMatchForm({ ...matchForm, quantity: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="match-unit">Unit</Label>
                <Select
                  value={matchForm.unit}
                  onValueChange={(val) => setMatchForm({ ...matchForm, unit: val })}
                >
                  <SelectTrigger id="match-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="quintal">Quintal (100 kg)</SelectItem>
                    <SelectItem value="ton">Metric Ton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="match-price">Target Max Budget per {matchForm.unit} (₹, optional)</Label>
              <Input
                id="match-price"
                type="number"
                placeholder="e.g. 70"
                value={matchForm.maxPrice}
                onChange={(e) => setMatchForm({ ...matchForm, maxPrice: e.target.value })}
                min="1"
                step="0.1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="match-loc">Delivery Location</Label>
                <Select
                  value={matchForm.deliveryLocation}
                  onValueChange={(val) => setMatchForm({ ...matchForm, deliveryLocation: val })}
                >
                  <SelectTrigger id="match-loc">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="match-days">Delivery Window (Days)</Label>
                <Input
                  id="match-days"
                  type="number"
                  placeholder="2"
                  value={matchForm.requiredByDays}
                  onChange={(e) => setMatchForm({ ...matchForm, requiredByDays: e.target.value })}
                  min="1"
                  max="30"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMatchingModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSearchingMatches} className="gap-2">
                {isSearchingMatches ? (
                  "Searching..."
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Find Ranked Matches
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
