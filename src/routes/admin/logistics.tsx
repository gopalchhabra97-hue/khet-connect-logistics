import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Gauge,
  KeyRound,
  MapPin,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Trash2,
  Truck,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemo } from "@/context/DemoStore";
import { formatDuration } from "@/services";
import {
  deliveryBatchesApi,
  driversApi,
  vehiclesApi,
} from "@/services/api";
import type { BatchStatus, DeliveryBatch, Driver, Order, Vehicle } from "@/types";

export const Route = createFileRoute("/admin/logistics")({
  head: () => ({
    meta: [{ title: "Logistics Management & Fleet Optimization — KHETSETU" }],
  }),
  component: LogisticsPage,
});

export default function LogisticsPage() {
  const { user, isBackendConnected } = useDemo();

  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP view state
  const [otpDialogData, setOtpDialogData] = useState<{ batchId: string; otp: string; expiresAt: string } | null>(null);

  // Load data from live backend
  const loadData = async () => {
    setLoading(true);
    try {
      const [remoteBatches, remoteEligible, remoteVehicles, remoteDrivers] = await Promise.all([
        deliveryBatchesApi.list().catch(() => []),
        deliveryBatchesApi.getEligibleOrders().catch(() => []),
        vehiclesApi.list().catch(() => []),
        driversApi.list().catch(() => []),
      ]);

      setBatches(remoteBatches);
      setEligibleOrders(remoteEligible);
      setVehicles(remoteVehicles);
      setDrivers(remoteDrivers);
    } catch (err) {
      console.warn("Error loading live logistics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalLoadPending = eligibleOrders.reduce((sum, o) => sum + o.quantity, 0);
  const activeBatches = batches.filter((b) => b.status !== "Delivered" && b.status !== "Cancelled");
  const availableVehicles = vehicles.filter((v) => v.status === "Available");
  const availableDrivers = drivers.filter((d) => d.status === "Available");

  // Handle batch creation
  const handleCreateBatch = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error("Select at least one eligible order for this batch.");
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenOrders = eligibleOrders.filter((o) => selectedOrderIds.includes(o.id));
      const pickupLoc = chosenOrders[0]?.pickup || "Patiala";
      const stops = Array.from(new Set(chosenOrders.map((o) => o.delivery)));

      const created = await deliveryBatchesApi.create({
        orderIds: selectedOrderIds,
        pickupLocation: pickupLoc,
        deliveryStops: stops,
        vehicleId: selectedVehicleId || undefined,
        driverId: selectedDriverId || undefined,
      });

      toast.success(`Delivery Batch ${created.id} Created!`, {
        description: `Consolidated ${created.totalQuantity} kg cargo. Status: ${created.status}.`,
      });

      setCreateDialogOpen(false);
      setSelectedOrderIds([]);
      setSelectedVehicleId("");
      setSelectedDriverId("");
      loadData();
    } catch (err: any) {
      toast.error("Failed to create delivery batch", {
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle driver/vehicle assignment
  const handleAssignDriver = async (batchId: string, driverId: string) => {
    try {
      await deliveryBatchesApi.update(batchId, { driverId });
      toast.success(`Driver updated for batch ${batchId}`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to update driver", { description: err.message });
    }
  };

  const handleAssignVehicle = async (batchId: string, vehicleId: string) => {
    try {
      await deliveryBatchesApi.update(batchId, { vehicleId });
      toast.success(`Vehicle updated for batch ${batchId}`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to update vehicle", { description: err.message });
    }
  };

  // Handle batch status change
  const handleStatusChange = async (batchId: string, status: string) => {
    try {
      await deliveryBatchesApi.update(batchId, { status });
      toast.success(`Batch ${batchId} status updated to ${status}`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to update status", { description: err.message });
    }
  };

  // Generate pickup OTP
  const handleGeneratePickupOtp = async (batchId: string) => {
    try {
      const res = await deliveryBatchesApi.generatePickupOtp(batchId);
      setOtpDialogData({
        batchId: res.batch_id,
        otp: res.demo_otp,
        expiresAt: new Date(res.expires_at).toLocaleTimeString(),
      });
      toast.success(`Pickup OTP Generated for ${batchId}`, {
        description: `Code: ${res.demo_otp} (Valid until ${new Date(res.expires_at).toLocaleTimeString()})`,
      });
    } catch (err: any) {
      toast.error("Failed to generate Pickup OTP", { description: err.message });
    }
  };

  // Delete batch
  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm(`Are you sure you want to delete batch ${batchId}? Orders will be unlinked.`)) return;
    try {
      await deliveryBatchesApi.delete(batchId);
      toast.success(`Batch ${batchId} deleted and orders unlinked.`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete batch", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Logistics & Delivery Batch Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Intelligent order consolidation, multi-stop dispatch, driver-vehicle assignment & OTP verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-xs">
                <Plus className="h-4 w-4" />
                Create Delivery Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Delivery Batch</DialogTitle>
                <DialogDescription>
                  Consolidate eligible buyer orders, assign fleet vehicle and driver, and dispatch.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Orders Selection */}
                <div>
                  <Label className="text-sm font-semibold text-foreground">
                    Select Orders for Delivery ({selectedOrderIds.length} selected)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Orders currently in Accepted or Ready for Delivery status
                  </p>

                  {eligibleOrders.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No eligible orders currently available for batching.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2 bg-slate-50/50">
                      {eligibleOrders.map((order) => {
                        const isSelected = selectedOrderIds.includes(order.id);
                        return (
                          <div
                            key={order.id}
                            onClick={() => {
                              setSelectedOrderIds((prev) =>
                                isSelected ? prev.filter((id) => id !== order.id) : [...prev, order.id]
                              );
                            }}
                            className={`flex items-center justify-between p-2.5 rounded text-xs cursor-pointer border transition-colors ${
                              isSelected
                                ? "bg-primary/10 border-primary text-foreground font-medium"
                                : "bg-white border-border hover:bg-slate-100/80"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-slate-300 text-primary pointer-events-none"
                              />
                              <span className="font-mono font-bold text-primary">{order.id}</span>
                              <span>{order.product}</span>
                              <Badge variant="secondary" className="text-[10px] py-0">
                                {order.quantity} {order.unit}
                              </Badge>
                            </div>
                            <div className="text-right text-muted-foreground">
                              <span>{order.pickup} → {order.delivery}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Driver & Vehicle assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assign Driver</Label>
                    <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select available driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} ({d.id}) — {d.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assign Vehicle</Label>
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fleet vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.capacity} kg) — {v.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBatch}
                  disabled={isSubmitting || selectedOrderIds.length === 0}
                  className="gap-1.5"
                >
                  <Boxes className="h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Confirm & Create Batch"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Eligible Load Alert */}
      {eligibleOrders.length > 0 && (
        <Alert className="bg-blue-50/60 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>{eligibleOrders.length} orders</strong> ({totalLoadPending} kg cargo) are ready for delivery batching and dispatch.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Eligible Orders</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{eligibleOrders.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Ready for consolidation</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Active Delivery Batches</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{activeBatches.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{batches.length} total platform batches</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Pending Cargo Load</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{totalLoadPending} kg</p>
          <p className="mt-1 text-xs text-muted-foreground">Unassigned to batches</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Available Fleet</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">
            {availableVehicles.length} / {vehicles.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{availableDrivers.length} drivers available</p>
        </Card>
      </div>

      {/* Delivery Batches List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Delivery Batches & Active Dispatches</h2>
          <Badge variant="outline" className="font-mono text-xs">
            {batches.length} Batches Total
          </Badge>
        </div>

        {batches.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Boxes className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="font-medium text-foreground">No Delivery Batches Generated</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Create Delivery Batch&quot; to consolidate orders and assign a driver and vehicle.
            </p>
          </Card>
        ) : (
          batches.map((batch) => {
            const assignedVehicle = vehicles.find((v) => v.id === batch.vehicleId);
            const assignedDriver = drivers.find((d) => d.id === batch.driverId);
            const vehicleCap = assignedVehicle?.capacity || 1000;
            const batchUtilization = Math.round((batch.totalQuantity / vehicleCap) * 100);

            return (
              <Card key={batch.id} className="p-6 shadow-xs border-border/80">
                <div className="space-y-5">
                  {/* Top Bar */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-mono text-xl font-bold text-primary">{batch.id}</span>
                      <Badge
                        variant={batch.status === "Delivered" ? "outline" : "default"}
                        className={
                          batch.status === "Delivered"
                            ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                            : batch.status === "In Transit" || batch.status === "Picked Up"
                              ? "bg-blue-600 text-white"
                              : ""
                        }
                      >
                        {batch.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {batch.stops.length} Stop{batch.stops.length !== 1 ? "s" : ""} ({batch.stops.join(" → ")})
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGeneratePickupOtp(batch.id)}
                        className="gap-1 text-xs"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Pickup OTP
                      </Button>

                      {["Planned", "Assigned"].includes(batch.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="text-destructive hover:bg-destructive/10 h-8 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Batch Details Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground uppercase font-medium text-[10px]">Load & Orders</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {batch.totalQuantity} kg ({batch.orderIds.length} orders)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        IDs: {batch.orderIds.join(", ")}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground uppercase font-medium text-[10px]">Pickup Hub</p>
                      <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="size-3.5 text-primary shrink-0" />
                        {batch.pickup}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Dest: {batch.deliveryLocation || batch.stops.join(", ")}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground uppercase font-medium text-[10px]">Route & Freight Charge</p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        ₹{batch.transportationCharge ? batch.transportationCharge.toLocaleString("en-IN") : "600"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {batch.distanceKm} km • {formatDuration(batch.etaMinutes)}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground uppercase font-medium text-[10px]">Scheduled Date</p>
                      <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="size-3.5 text-primary shrink-0" />
                        {batch.scheduledAt ? new Date(batch.scheduledAt).toLocaleDateString() : "Immediate"}
                      </p>
                    </div>
                  </div>

                  {/* Resource Assignments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg border border-border bg-slate-50/60 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground">Assigned Driver:</span>
                        <p className="font-semibold text-foreground">
                          {assignedDriver ? `${assignedDriver.name} (${assignedDriver.id})` : "Unassigned"}
                        </p>
                      </div>
                      {batch.status !== "Delivered" && (
                        <Select
                          value={batch.driverId || ""}
                          onValueChange={(val) => handleAssignDriver(batch.id, val)}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue placeholder="Assign driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} ({d.status})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground">Assigned Vehicle:</span>
                        <p className="font-semibold text-foreground">
                          {assignedVehicle ? `${assignedVehicle.name} (${assignedVehicle.registration})` : "Unassigned"}
                        </p>
                      </div>
                      {batch.status !== "Delivered" && (
                        <Select
                          value={batch.vehicleId || ""}
                          onValueChange={(val) => handleAssignVehicle(batch.id, val)}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue placeholder="Assign vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name} ({v.capacity}kg)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Fill Rate Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Vehicle Capacity Utilization:</span>
                      <strong className="text-foreground">
                        {batchUtilization}% ({batch.totalQuantity} / {vehicleCap} kg)
                      </strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${batchUtilization >= 80 ? "bg-emerald-600" : "bg-primary"}`}
                        style={{ width: `${Math.min(batchUtilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pickup OTP Display Dialog */}
      {otpDialogData && (
        <Dialog open={!!otpDialogData} onOpenChange={(open) => !open && setOtpDialogData(null)}>
          <DialogContent className="max-w-md text-center">
            <DialogHeader>
              <DialogTitle className="text-center">Pickup OTP Generated</DialogTitle>
              <DialogDescription className="text-center">
                Mandi manager or farmer must provide this OTP to the driver upon cargo pickup.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 p-6 rounded-lg bg-primary/10 border border-primary/20 text-center space-y-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Batch {otpDialogData.batchId} Pickup Code
              </span>
              <p className="font-mono text-4xl font-extrabold tracking-widest text-primary">
                {otpDialogData.otp}
              </p>
              <p className="text-xs text-muted-foreground">Expires at {otpDialogData.expiresAt}</p>
            </div>

            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setOtpDialogData(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
