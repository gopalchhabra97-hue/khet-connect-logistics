import { BadgeCheck, Clock, Flame, MapPin, ShieldCheck, Sprout, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, formatQty, marketplaceIntelligence } from "@/services";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const CROP_TINT: Record<string, string> = {
  Vegetables: "from-emerald-500/20 to-primary/15",
  Fruits: "from-amber-500/25 to-emerald-500/15",
  Grains: "from-amber-400/20 to-primary/10",
  Pulses: "from-primary/20 to-emerald-500/20",
};

export function ProductCard({
  product,
  footer,
  action,
}: {
  product: Product;
  footer?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const perishability = marketplaceIntelligence.perishability(product.name, product.category);
  const demandBadge = marketplaceIntelligence.demandBadge(product.name);

  return (
    <article className="surface-panel flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <div
        className={cn(
          "relative grid h-32 place-items-center bg-gradient-to-br",
          CROP_TINT[product.category] ?? "from-muted to-secondary",
        )}
        aria-hidden="true"
      >
        <Sprout className="size-10 text-primary/70" />
        
        {/* Demand Intelligence Badge */}
        <div className="absolute top-2.5 right-2.5">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-semibold backdrop-blur-md",
              demandBadge.tone === "warning"
                ? "bg-amber-100/90 text-amber-900 border-amber-300"
                : "bg-white/90 text-foreground border-border",
            )}
          >
            {demandBadge.tone === "warning" && <Flame className="mr-1 h-3 w-3 text-amber-600 fill-amber-600" />}
            {demandBadge.label} {demandBadge.trend !== "Balanced" ? `(${demandBadge.trend})` : ""}
          </Badge>
        </div>

        {/* Category Tag */}
        <div className="absolute bottom-2 left-2.5">
          <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {product.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground text-base">{product.name}</h3>
            <p className="text-xs text-muted-foreground">{product.seller}</p>
          </div>
          {product.verified ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
              title="Verified Farmer/FPO"
            >
              <BadgeCheck className="size-3 text-emerald-700" aria-hidden="true" /> Verified
            </span>
          ) : null}
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 text-primary shrink-0" aria-hidden="true" /> {product.location}
        </p>

        {/* Perishability Indicator */}
        <div className="mt-2.5 rounded-md border border-border bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-muted-foreground shrink-0" />
            <span>Perishability: <strong className="font-medium text-foreground">{perishability.level}</strong></span>
          </span>
          <span className="text-[10px] text-foreground/80 font-medium">({perishability.shelfLife})</span>
        </div>

        <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-xl font-bold text-foreground">
              {formatINR(product.price)}
              <span className="text-xs font-normal text-muted-foreground">/{product.unit}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Available Stock</p>
            <p className="text-sm font-semibold text-foreground">
              {formatQty(product.quantity, product.unit)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {action ?? footer ?? (
            <Button asChild className="w-full" size="sm">
              <Link to="/buyer/orders">
                Order Produce
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
