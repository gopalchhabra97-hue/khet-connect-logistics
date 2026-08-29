import { BadgeCheck, MapPin, Sprout } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { formatINR, formatQty } from "@/services";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const CROP_TINT: Record<string, string> = {
  Vegetables: "from-leaf/30 to-primary/15",
  Fruits: "from-warning/30 to-leaf/15",
  Grains: "from-warning/25 to-primary/10",
  Pulses: "from-primary/20 to-leaf/20",
};

export function ProductCard({ product, footer }: { product: Product; footer?: React.ReactNode }) {
  return (
    <article className="surface-panel flex flex-col overflow-hidden">
      <div
        className={cn(
          "grid h-32 place-items-center bg-gradient-to-br",
          CROP_TINT[product.category] ?? "from-muted to-secondary",
        )}
        aria-hidden="true"
      >
        <Sprout className="size-10 text-primary/70" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.seller}</p>
          </div>
          {product.verified ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info"
              title="Demo verification indicator"
            >
              <BadgeCheck className="size-3.5" aria-hidden="true" /> Demo verified
            </span>
          ) : null}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" /> {product.location}
        </p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-xl font-semibold text-foreground">
            {formatINR(product.price)}
            <span className="text-sm font-normal text-muted-foreground">/{product.unit}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {formatQty(product.quantity, product.unit)} available
          </p>
        </div>
        <p className="mt-2 text-xs font-medium">
          {product.available ? (
            <span className="text-success">Available for ordering</span>
          ) : (
            <span className="text-muted-foreground">Currently unavailable</span>
          )}
        </p>
        <div className="mt-4 flex gap-2">
          {footer ?? (
            <Button asChild className="w-full">
              <Link to="/buyer/product/$productId" params={{ productId: product.id }}>
                View Details
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
