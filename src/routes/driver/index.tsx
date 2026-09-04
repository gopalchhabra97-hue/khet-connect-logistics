import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock,
  Coins,
  KeyRound,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardCard } from "@/components/common/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useDemo } from "@/context/DemoStore";
import { formatDuration } from "@/services";
import {
  deliveryBatchesApi,
  driversApi,
  ordersApi,
  vehiclesApi,
} from "@/services/api";
import type { BatchStatus, DeliveryBatch, Driver, Order, Vehicle } from "@/types";

export const Route = createFileRoute("/driver/")({
  head: () => ({
    meta: [{ title: "Driver Dashboard — KHETSETU" }],
  }),
  component: DriverDashboard,
});

const STEPS: { status: BatchStatus; label: string; desc: string }[] = [
  { status: "Assigned", label: "Assigned", desc: "Vehicle & driver assigned" },
  { status: "Pickup", label: "Pickup", desc: "Proceeding to pickup Mandi" },
  { status: "Picked Up", label: "Picked Up", desc: "Pickup OTP verified & loaded" },
  { status: "In Transit", label: "In Transit", desc: "On multi-stop highway route" },
  { status: "Out for Delivery", label: "Out for Delivery", desc: "Arrived at buyer location" },
  { status: "Delivered", label: "Delivered", desc: "Delivery OTP verified & completed" },
];

export default function DriverDashboard() {
  const { user } = useDemo();

  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  // OTP Dialog States
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);

  const loadDriverData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Driver list call is automatically scoped to driver's own assigned batches on backend
      const [remoteBatches, remoteOrders, remoteVehicles, remoteDrivers] = await Promise.all([
        deliveryBatchesApi.list({ driver_id: user.id }).catch(() => []),
        ordersApi.list().catch(() => []),
        vehiclesApi.list().catch(() => []),
        driversApi.list().catch(() => []),
      ]);

      setBatches(remoteBatches);
      setOrders(remoteOrders);
      setVehicles(remoteVehicles);
      const matchedDriver = remoteDrivers.find((d) => d.id === user.id) || null;
      setDriverInfo(matchedDriver);
    } catch (err) {
      console.warn("Failed to load live driver data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
  }, [user]);

  if (!user) return null;

  const assignedBatches = batches.filter((b) => b.driverId === user.id || !b.driverId);
  const activeBatch =
    assignedBatches.find((b) => b.status !== "Delivered" && b.status !== "Cancelled") ||
    assignedBatches[0];

  const vehicleInfo = activeBatch?.vehicleId
    ? vehicles.find((v) => v.id === activeBatch.vehicleId)
    : driverInfo?.vehicleId
      ? vehicles.find((v) => v.id === driverInfo.vehicleId)
      : null;

  const totalAssignedLoad = assignedBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
  const totalFreightEarned = assignedBatches.reduce(
    (sum, b) => sum + (b.transportationCharge || 600),
    0
  );
  const batchOrders = activeBatch
    ? orders.filter((o) => activeBatch.orderIds.includes(o.id))
    : [];

  const currentStepIndex = activeBatch
    ? STEPS.findIndex((s) => s.status === activeBatch.status)
    : -1;

  // Progression handler for simple status moves (Assigned -> Pickup, Picked Up -> In Transit, In Transit -> Out for Delivery)
  const handleProgressStatus = async (batchId: string, nextStatus: string) => {
    try {
      await deliveryBatchesApi.update(batchId, { status: nextStatus });
      toast.success(`Batch status updated to ${nextStatus}`, {
        description: `Trip progress synchronized with dispatch system.`,
      });
      loadDriverData();
    } catch (err: any) {
      toast.error("Status update failed", { description: err.message });
    }
  };

  // Open Pickup OTP Modal
  const openPickupOtpModal = (batchId: string) => {
    setTargetBatchId(batchId);
    setEnteredOtp("");
    setPickupDialogOpen(true);
  };

  // Verify Pickup OTP
  const handleVerifyPickupOtp = async () => {
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit pickup OTP.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await deliveryBatchesApi.verifyPickupOtp(targetBatchId, enteredOtp.trim());
      toast.success("Pickup OTP Verified Successfully!", {
        description: `Cargo custody transferred. Batch status is now ${res.status}.`,
      });
      setPickupDialogOpen(false);
      setEnteredOtp("");
      loadDriverData();
    } catch (err: any) {
      toast.error("Pickup OTP Verification Failed", {
        description: err.message || "Invalid or expired OTP entered.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Open Delivery OTP Modal
  const openDeliveryOtpModal = (batchId: string) => {
    setTargetBatchId(batchId);
    setEnteredOtp("");
    setDeliveryDialogOpen(true);
  };

  // Verify Delivery OTP
  const handleVerifyDeliveryOtp = async () => {
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit delivery OTP from the buyer.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await deliveryBatchesApi.verifyDeliveryOtp(targetBatchId, enteredOtp.trim());
      toast.success("Delivery Confirmed Successfully!", {
        description: `Batch and orders marked Delivered. Payout of ₹${activeBatch?.transportationCharge || 600} is now payable!`,
      });
      setDeliveryDialogOpen(false);
      setEnteredOtp("");
      loadDriverData();
    } catch (err: any) {
      toast.error("Delivery OTP Verification Failed", {
        description: err.message || "Invalid delivery OTP. Please verify with buyer.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-4 text-primary shrink-0" />
            Base Hub: <strong className="text-foreground">{user.location || "Patiala"} Mandi</strong> • Driver ID:{" "}
            <span className="font-mono text-xs font-bold text-primary">{user.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDriverData} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Badge
            variant={driverInfo?.status === "Available" ? "outline" : "default"}
            className={
              driverInfo?.status === "Available"
                ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                : "bg-blue-600 text-white"
            }
          >
            ● {driverInfo?.status || "Assigned"}
          </Badge>
        </div>
      </div>

      {assignedBatches.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No deliveries assigned to your driver ID at this time. When administrator creates a batch and assigns you, it will appear here.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Assigned Batches"
          value={assignedBatches.length}
          hint={activeBatch ? `Active: ${activeBatch.id}` : "No active batch"}
          icon={Boxes}
          tone="primary"
        />
        <DashboardCard
          label="Total Cargo Load"
          value={`${totalAssignedLoad} kg`}
          hint={vehicleInfo ? `Vehicle Cap: ${vehicleInfo.capacity} kg` : "Consolidated cargo"}
          icon={Package}
          tone="leaf"
        />
        <DashboardCard
          label="Total Freight Earned"
          value={`₹${totalFreightEarned.toLocaleString("en-IN")}`}
          hint="Transportation payouts"
          icon={Coins}
          tone="warning"
        />
        <DashboardCard
          label="Assigned Vehicle"
          value={vehicleInfo ? vehicleInfo.name : "Unassigned"}
          hint={vehicleInfo ? `${vehicleInfo.registration}` : "Awaiting assignment"}
          icon={Truck}
          tone="info"
        />
      </div>

      {/* Active Delivery Progress & Workflow Stepper */}
      {activeBatch && (
        <div className="surface-panel p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xl font-bold text-primary">{activeBatch.id}</span>
                <Badge
                  variant={activeBatch.status === "Delivered" ? "outline" : "default"}
                  className={
                    activeBatch.status === "Delivered"
                      ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                      : "bg-blue-600 text-white"
                  }
                >
                  {activeBatch.status}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Freight: ₹{(activeBatch.transportationCharge || 600).toLocaleString("en-IN")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {activeBatch.totalQuantity} kg • {activeBatch.orderIds.length} orders
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Route Corridor: <strong className="text-foreground">{activeBatch.pickup}</strong> →{" "}
                <strong className="text-foreground">{activeBatch.stops.join(" → ")}</strong> ({activeBatch.distanceKm} km • {formatDuration(activeBatch.etaMinutes)})
              </p>
            </div>

            {/* Lifecycle Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {activeBatch.status === "Assigned" && (
                <Button
                  onClick={() => handleProgressStatus(activeBatch.id, "Pickup")}
                  className="gap-1.5 shadow-xs"
                >
                  <Truck className="h-4 w-4" />
                  Proceed to Pickup
                </Button>
              )}

              {activeBatch.status === "Pickup" && (
                <Button
                  onClick={() => openPickupOtpModal(activeBatch.id)}
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  <KeyRound className="h-4 w-4" />
                  Enter Pickup OTP
                </Button>
              )}

              {activeBatch.status === "Picked Up" && (
                <Button
                  onClick={() => handleProgressStatus(activeBatch.id, "In Transit")}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <Truck className="h-4 w-4" />
                  Start Transit
                </Button>
              )}

              {activeBatch.status === "In Transit" && (
                <Button
                  onClick={() => handleProgressStatus(activeBatch.id, "Out for Delivery")}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  <PackageCheck className="h-4 w-4" />
                  Out for Delivery
                </Button>
              )}

              {activeBatch.status === "Out for Delivery" && (
                <Button
                  onClick={() => openDeliveryOtpModal(activeBatch.id)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Enter Buyer Delivery OTP
                </Button>
              )}

              {activeBatch.status === "Delivered" && (
                <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-emerald-700 px-3 py-1.5 font-semibold">
                  ✓ Delivery Completed & Payout Payable
                </Badge>
              )}

              <Button asChild variant="outline" size="sm">
                <Link to="/driver/show-route">
                  <RouteIcon className="mr-1.5 size-3.5" />
                  Route Map
                </Link>
              </Button>
            </div>
          </div>

          {/* Stepper Visual Workflow */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              Delivery Progress Workflow (Chain of Custody)
            </p>
            <div className="grid gap-2 sm:grid-cols-6">
              {STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={step.status}
                    className={`rounded-lg border p-3 transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                        : isPassed
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-border bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex size-5 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? "bg-primary text-white"
                            : isPassed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {isPassed && !isCurrent ? "✓" : idx + 1}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-foreground">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orders in Active Batch */}
          {batchOrders.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Orders Included in This Batch ({batchOrders.length})
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {batchOrders.map((o) => (
                  <div key={o.id} className="p-3 rounded-md border bg-white text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-primary">{o.id}</span> — {o.product} ({o.quantity} {o.unit})
                      <p className="text-muted-foreground mt-0.5">Drop: {o.delivery} • Buyer: {o.buyer}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{o.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/driver/deliveries">View All Assigned Deliveries</Link>
        </Button>
        {assignedBatches.length > 0 && (
          <Button asChild variant="outline">
            <Link to="/driver/show-route">
              <RouteIcon className="mr-1.5 size-4" />
              Route Corridor Map
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/driver/history">Delivery History</Link>
        </Button>
      </div>

      {/* Assigned Batches List */}
      {assignedBatches.length > 0 && (
        <div className="surface-panel p-5 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            All Assigned Delivery Batches ({assignedBatches.length})
          </h2>
          <div className="space-y-3">
            {assignedBatches.map((batch) => {
              const batchVehicle = vehicles.find((v) => v.id === batch.vehicleId);
              return (
                <div
                  key={batch.id}
                  className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-base font-bold text-primary">{batch.id}</p>
                      <Badge variant={batch.status === "Delivered" ? "outline" : "default"}>
                        {batch.status}
                      </Badge>
                      {batchVehicle && (
                        <span className="text-xs text-muted-foreground">
                          • Vehicle: <strong className="font-medium text-foreground">{batchVehicle.name}</strong> ({batchVehicle.registration})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                      <div>
                        <p className="text-foreground/70">Total Load</p>
                        <p className="font-medium text-foreground">{batch.totalQuantity} kg ({batch.orderIds.length} orders)</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Pickup</p>
                        <p className="font-medium text-foreground">{batch.pickup}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Stops</p>
                        <p className="font-medium text-foreground">{batch.stops.join(" → ")}</p>
                      </div>
                      <div>
                        <p className="text-foreground/70">Freight Earnings</p>
                        <p className="font-bold text-foreground">₹{(batch.transportationCharge || 600).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {batch.status === "Pickup" && (
                      <Button size="sm" onClick={() => openPickupOtpModal(batch.id)} className="gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                        <KeyRound className="h-3.5 w-3.5" />
                        Pickup OTP
                      </Button>
                    )}
                    {batch.status === "Out for Delivery" && (
                      <Button size="sm" onClick={() => openDeliveryOtpModal(batch.id)} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Delivery OTP
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link to="/driver/show-route">View Route</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pickup OTP Verification Modal */}
      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-purple-600" />
              Verify Mandi Pickup OTP
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit verification OTP provided by the farmer or Mandi dispatch supervisor upon cargo loading.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Label className="text-xs font-semibold">6-Digit Pickup OTP</Label>
            <Input
              type="text"
              maxLength={6}
              placeholder="e.g. 123456"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-center text-2xl tracking-widest h-12"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Batch: <strong className="font-mono">{targetBatchId}</strong> • Custody transfer verification
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyPickupOtp}
              disabled={isVerifying || enteredOtp.length !== 6}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isVerifying ? "Verifying..." : "Confirm Pickup OTP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery OTP Verification Modal */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Verify Buyer Delivery OTP
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit confirmation OTP provided by the receiving buyer upon handover of produce.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Label className="text-xs font-semibold">6-Digit Buyer Delivery OTP</Label>
            <Input
              type="text"
              maxLength={6}
              placeholder="e.g. 654321"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-center text-2xl tracking-widest h-12"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Batch: <strong className="font-mono">{targetBatchId}</strong> • Verifying final delivery & triggering transportation payout
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyDeliveryOtp}
              disabled={isVerifying || enteredOtp.length !== 6}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isVerifying ? "Verifying..." : "Confirm Final Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
