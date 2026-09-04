import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import { useDemo } from "@/context/DemoStore";
import { QualityGradingModal, getGradeColor } from "@/components/common/QualityGradingModal";
import type { Product } from "@/types";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [{ title: "Products — KHETSETU" }],
  }),
  component: ProductsPage,
});

const SEED_QUALITY_SUMMARY: Record<string, { grade: string; score: number }> = {
  tomato: { grade: "A", score: 87 },
  potato: { grade: "A+", score: 92 },
  onion: { grade: "B", score: 76 },
  wheat: { grade: "A", score: 84 },
  rice: { grade: "A", score: 88 },
  "green peas": { grade: "B", score: 72 },
  guava: { grade: "A+", score: 94 },
};

function ProductsPage() {
  const { products } = useDemo();
  const [selectedQualityProduct, setSelectedQualityProduct] = useState<Product | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of all listed products and certified quality assessments</p>
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

      <Card className="p-4 overflow-x-auto">
        <div className="min-w-[750px] grid gap-1 text-sm">
          <div className="grid grid-cols-7 gap-4 font-semibold text-foreground py-2 border-b">
            <div>Product</div>
            <div>Farmer</div>
            <div>Category</div>
            <div>Stock</div>
            <div>Price/kg</div>
            <div>Quality Assessment</div>
            <div>Status</div>
          </div>
          {products.map((product) => {
            const cropKey = product.name.trim().toLowerCase();
            const quality = SEED_QUALITY_SUMMARY[cropKey] || { grade: "A", score: 85 };

            return (
              <div key={product.id} className="grid grid-cols-7 gap-4 py-3 border-b last:border-b-0 items-center">
                <div className="font-medium text-foreground">{product.name}</div>
                <div className="text-muted-foreground text-sm">{product.seller}</div>
                <div className="text-foreground text-sm">{product.category}</div>
                <div className="text-foreground">{product.quantity} {product.unit}</div>
                <div className="text-foreground">₹{product.price}</div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQualityProduct(product)}
                    className={`h-7 px-2 text-xs font-semibold gap-1.5 border ${getGradeColor(quality.grade)}`}
                    title="Inspect Quality Grading"
                  >
                    <Award className="size-3.5" />
                    <span>Grade {quality.grade} ({quality.score}/100)</span>
                  </Button>
                </div>
                <div>
                  <Badge variant={product.available ? "default" : "secondary"}>
                    {product.available ? "Available" : "Unlisted"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedQualityProduct && (
        <QualityGradingModal
          product={selectedQualityProduct}
          isOpen={Boolean(selectedQualityProduct)}
          onOpenChange={(open) => !open && setSelectedQualityProduct(null)}
          canUpload={true}
        />
      )}
    </div>
  );
}

