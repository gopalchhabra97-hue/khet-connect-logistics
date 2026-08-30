import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo } from "@/context/DemoStore";
import { productsService } from "@/services";
import { LOCATIONS } from "@/data/mockData";

interface PlaceOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PlaceOrderModal({ onClose, onSuccess }: PlaceOrderModalProps) {
  const { products, placeOrder } = useDemo();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const availableProducts = productsService.listAvailable(products);
  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId || !quantity || !deliveryLocation) {
      toast.error("Please fill in all fields");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (selectedProduct && qty > selectedProduct.quantity) {
      toast.error(
        `Only ${selectedProduct.quantity} kg available. Please reduce the quantity.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const order = placeOrder({
        productId: selectedProductId,
        quantity: qty,
        delivery: deliveryLocation,
      });

      if (order) {
        toast.success("Order placed successfully!", {
          description: `Order ${order.id} has been submitted to the farmer.`,
        });
        setSelectedProductId("");
        setQuantity("");
        setDeliveryLocation("");
        onSuccess();
      } else {
        toast.error("Failed to place order. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrice = selectedProduct
    ? Math.round(parseInt(quantity || "0", 10) * selectedProduct.price)
    : 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Place an Order</DialogTitle>
          <DialogDescription>
            Select a product, quantity, and delivery location to place your order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} — ₹{product.price}/kg ({product.quantity} kg) from {product.seller}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="rounded-lg border border-border bg-sidebar-accent/10 p-3">
              <p className="text-sm text-muted-foreground">
                <span className="block font-medium text-foreground">{selectedProduct.name}</span>
                <span className="text-xs">
                  {selectedProduct.seller} • {selectedProduct.location} • Harvested{" "}
                  {new Date(selectedProduct.harvestDate).toLocaleDateString()}
                </span>
              </p>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity (kg)
              {selectedProduct && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Available: {selectedProduct.quantity} kg
                </span>
              )}
            </Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter quantity in kg"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={selectedProduct?.quantity || 10000}
              disabled={!selectedProductId}
            />
          </div>

          {/* Delivery Location */}
          <div className="space-y-2">
            <Label htmlFor="delivery">Delivery Location</Label>
            <Select value={deliveryLocation} onValueChange={setDeliveryLocation}>
              <SelectTrigger id="delivery">
                <SelectValue placeholder="Select delivery location..." />
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

          {/* Order Summary */}
          {selectedProduct && quantity && (
            <div className="rounded-lg border border-border bg-sidebar-accent/20 p-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per kg</span>
                  <span className="font-medium text-foreground">₹{selectedProduct.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium text-foreground">
                    {parseInt(quantity, 10).toLocaleString("en-IN")} kg
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-primary">
                      ₹{totalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedProductId || !quantity || !deliveryLocation} className="flex-1">
              {isLoading ? "Placing..." : "Place Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
