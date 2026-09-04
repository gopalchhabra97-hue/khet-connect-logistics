import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Coins,
  KeyRound,
  MapPin,
  Navigation,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDemo } from "@/context/DemoStore";
import { formatDuration } from "@/services";
import {
  deliveryBatchesApi,
  ordersApi,
  vehiclesApi,
} from "@/services/api";
import type { BatchStatus, DeliveryBatch, Order, Vehicle } from "@/types";

export const Route = createFileRoute("/driver/deliveries")({
  head: () => ({
    meta: [{ title: "Assigned Deliveries — KHETSETU" }],
  }),
  component: DriverDeliveries,
});

export default function DriverDeliveries() {
  const { user } = useDemo();

  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // OTP Dialogs
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [remoteBatches, remoteOrders, remoteVehicles] = await Promise.all([
        deliveryBatchesApi.list({ driver_id: user.id }).catch(() => []),
        ordersApi.list().catch(() => []),
        vehiclesApi.list().catch(() => []),
      ]);

      setBatches(remoteBatches);
      setOrders(remoteOrders);
      setVehicles(remoteVehicles);
    } catch (err) {
      console.warn("Failed to load driver deliveries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (!user) return null;

  const assignedBatches = batches.filter((b) => b.driverId === user.id || !b.driverId);

  const batchesByStatus = {
    all: assignedBatches,
    assigned: assignedBatches.filter((b) => b.status === "Assigned" || b.status === "Pickup"),
    "picked-up": assignedBatches.filter((b) => b.status === "Picked Up"),
    "in-transit": assignedBatches.filter((b) => b.status === "In Transit" || b.status === "Out for Delivery"),
    delivered: assignedBatches.filter((b) => b.status === "Delivered"),
  };

  const totalBatches = assignedBatches.length;
  const totalLoad = assignedBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
  const totalEarnings = assignedBatches.reduce((sum, b) => sum + (b.transportationCharge || 600), 0);
  const activeCount = batchesByStatus.assigned.length + batchesByStatus["picked-up"].length + batchesByStatus["in-transit"].length;

  const handleStatusChange = async (batchId: string, nextStatus: string) => {
    try {
      await deliveryBatchesApi.update(batchId, { status: nextStatus });
      toast.success(`Batch ${batchId} updated to ${nextStatus}`);
      loadData();
    } catch (err: any) {
      toast.error("Status update failed", { description: err.message });
    }
  };

  const handleVerifyPickupOtp = async () => {
    if (enteredOtp.length !== 6) {
      toast.error("Enter a 6-digit pickup OTP.");
      return;
    }
    setIsVerifying(true);
    try {
      await deliveryBatchesApi.verifyPickupOtp(targetBatchId, enteredOtp);
      toast.success("Pickup OTP Verified!", { description: "Batch status updated to Picked Up." });
      setPickupDialogOpen(false);
      setEnteredOtp("");
      loadData();
    } catch (err: any) {
      toast.error("Pickup OTP verification failed", { description: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyDeliveryOtp = async () => {
    if (enteredOtp.length !== 6) {
      toast.error("Enter a 6-digit delivery OTP.");
      return;
    }
    setIsVerifying(true);
    try {
      await deliveryBatchesApi.verifyDeliveryOtp(targetBatchId, enteredOtp);
      toast.success("Delivery OTP Verified!", { description: "Batch and orders marked Delivered. Payout is payable." });
      setDeliveryDialogOpen(false);
      setEnteredOtp("");
      loadData();
    } catch (err: any) {
      toast.error("Delivery OTP verification failed", { description: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Assigned Deliveries</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your delivery batches and shipments</p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Assigned Batches</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalBatches}</p>
          <p className="mt-1 text-xs text-muted-foreground">{activeCount} active in progress</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Cargo Load</p>
          <p className="mt-1 text-2xl font-bold text-primary">{totalLoad} kg</p>
          <p className="mt-1 text-xs text-muted-foreground">Assigned produce weight</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total Freight Earnings</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">₹{totalEarnings.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-muted-foreground">From completed and active routes</p>
        </Card>
      </div>

      {totalBatches > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:inline-flex md:w-auto">
            <TabsTrigger value="all">All ({batchesByStatus.all.length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned & Pickup ({batchesByStatus.assigned.length})</TabsTrigger>
            <TabsTrigger value="picked-up">Picked Up ({batchesByStatus["picked-up"].length})</TabsTrigger>
            <TabsTrigger value="in-transit">In Transit ({batchesByStatus["in-transit"].length})</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({batchesByStatus.delivered.length})</TabsTrigger>
          </TabsList>

          {(["all", "assigned", "picked-up", "in-transit", "delivered"] as const).map((tabKey) => {
            const list = batchesByStatus[tabKey];
            return (
              <TabsContent key={tabKey} value={tabKey} className="space-y-4">
                {list.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <p className="text-muted-foreground">No {tabKey} batches at this time</p>
                  </Card>
                ) : (
                  list.map((batch) => {
                    const batchOrders = orders.filter((o) => batch.orderIds.includes(o.id));
                    const assignedVehicle = vehicles.find((v) => v.id === batch.vehicleId);

                    return (
                      <Card key={batch.id} className="p-6 shadow-xs">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b pb-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="font-mono text-lg font-bold text-primary">{batch.id}</p>
                                <Badge
                                  variant={batch.status === "Delivered" ? "outline" : "default"}
                                  className={
                                    batch.status === "Delivered"
                                      ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                                      : "bg-blue-600 text-white"
                                  }
                                >
                                  {batch.status}
                                </Badge>
                                {assignedVehicle && (
                                  <span className="text-xs text-muted-foreground">
                                    • {assignedVehicle.name} ({assignedVehicle.registration})
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {batchOrders.length} order{batchOrders.length !== 1 ? "s" : ""} • {batch.totalQuantity} kg • {batch.distanceKm} km • {formatDuration(batch.etaMinutes)} • Freight: <strong className="text-foreground">₹{(batch.transportationCharge || 600).toLocaleString("en-IN")}</strong>
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button asChild size="sm" variant="outline" className="gap-1.5">
                                <Link to="/driver/show-route">
                                  <Navigation className="h-3.5 w-3.5" />
                                  Route
                                </Link>
                              </Button>

                              {batch.status === "Assigned" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(batch.id, "Pickup")}
                                  className="gap-1.5"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  Go to Pickup
                                </Button>
                              )}

                              {batch.status === "Pickup" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setTargetBatchId(batch.id);
                                    setEnteredOtp("");
                                    setPickupDialogOpen(true);
                                  }}
                                  className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                  Enter Pickup OTP
                                </Button>
                              )}

                              {batch.status === "Picked Up" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(batch.id, "In Transit")}
                                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  Start Transit
                                </Button>
                              )}

                              {batch.status === "In Transit" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(batch.id, "Out for Delivery")}
                                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  <PackageCheck className="h-3.5 w-3.5" />
                                  Out for Delivery
                                </Button>
                              )}

                              {batch.status === "Out for Delivery" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setTargetBatchId(batch.id);
                                    setEnteredOtp("");
                                    setDeliveryDialogOpen(true);
                                  }}
                                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Enter Delivery OTP
                                </Button>
                              )}

                              {batch.status === "Delivered" && (
                                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                                  ✓ Completed
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-muted-foreground uppercase">Pickup Location</p>
                              <p className="mt-1 font-medium text-foreground">{batch.pickup}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground uppercase">Delivery Stops</p>
                              <p className="mt-1 font-medium text-foreground">{batch.stops.join(" → ")}</p>
                            </div>
                          </div>

                          {batchOrders.length > 0 && (
                            <div className="border-t border-border pt-3">
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Orders in this Batch</p>
                              <div className="space-y-1.5">
                                {batchOrders.map((order) => (
                                  <div key={order.id} className="flex items-center justify-between rounded bg-slate-50 p-2 text-xs">
                                    <div>
                                      <span className="font-mono font-bold text-primary">{order.id}</span> — {order.product} ({order.quantity} {order.unit}) → <span className="font-medium">{order.delivery}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px]">{order.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">No deliveries assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Check back soon for new dispatches assigned by dispatch admin.</p>
        </Card>
      )}

      {/* Pickup OTP Dialog */}
      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Mandi Pickup OTP</DialogTitle>
            <DialogDescription>
              Provide the 6-digit OTP given by the mandi supervisor or farmer upon loading.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Label className="text-xs font-semibold">6-Digit Code</Label>
            <Input
              type="text"
              maxLength={6}
              placeholder="e.g. 123456"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-center text-2xl tracking-widest h-12"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVerifyPickupOtp} disabled={isVerifying || enteredOtp.length !== 6}>
              {isVerifying ? "Verifying..." : "Confirm Pickup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery OTP Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Buyer Delivery OTP</DialogTitle>
            <DialogDescription>
              Enter the 6-digit confirmation OTP received by the buyer upon produce delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Label className="text-xs font-semibold">6-Digit Code</Label>
            <Input
              type="text"
              maxLength={6}
              placeholder="e.g. 654321"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-center text-2xl tracking-widest h-12"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVerifyDeliveryOtp} disabled={isVerifying || enteredOtp.length !== 6} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isVerifying ? "Verifying..." : "Confirm Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
