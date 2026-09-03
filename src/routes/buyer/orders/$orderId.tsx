import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Package,
  CreditCard,
  Download,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/common/OrderTimeline";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useDemo } from "@/context/DemoStore";
import { toast } from "sonner";
import {
  paymentsApi,
  type ApiTransportationCharge,
  type ApiAdvancePaymentResponse,
  type ApiFinalPaymentResponse,
  type ApiDeliveryOTPGenerate,
} from "@/services/api";

export const Route = createFileRoute("/buyer/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Details — KHETSETU" },
    ],
  }),
  component: BuyerOrderDetail,
});

function BuyerOrderDetail() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { orders, products, syncFromBackend } = useDemo();

  const [transportInfo, setTransportInfo] = useState<ApiTransportationCharge | null>(null);
  const [advancePaid, setAdvancePaid] = useState<boolean>(false);
  const [advanceTxn, setAdvanceTxn] = useState<string | null>(null);
  const [finalPaid, setFinalPaid] = useState<boolean>(false);
  const [finalTxn, setFinalTxn] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<ApiDeliveryOTPGenerate | null>(null);
  const [isPayingAdvance, setIsPayingAdvance] = useState(false);
  const [isPayingFinal, setIsPayingFinal] = useState(false);
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);

  const order = orders.find((o) => o.id === orderId);
  const product = products.find((p) => p.id === order?.productId);

  // Fetch transportation charge calculation on mount
  useEffect(() => {
    if (!orderId) return;
    let mounted = true;
    const fetchTransport = async () => {
      try {
        const res = await paymentsApi.getTransportationCharge(orderId);
        if (mounted) setTransportInfo(res);
      } catch (err) {
        console.warn("Could not fetch remote transportation charge:", err);
      }
    };
    void fetchTransport();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  if (!order || !product) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: "/buyer/orders" })}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Orders
        </Button>
        <div className="surface-panel py-12 text-center">
          <p className="text-lg font-semibold text-foreground">Order not found</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/buyer/orders">View All Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = order.quantity * order.pricePerUnit;
  const advanceAmount = Math.round(subtotal * 0.30);
  const remainingProductAmount = Math.round(subtotal * 0.70);
  const transportCharge = transportInfo ? transportInfo.transportation_charge : 600;
  const finalAmount = remainingProductAmount + transportCharge;
  const totalPayable = subtotal + transportCharge;

  // Handle simulated advance payment
  const handlePayAdvance = async () => {
    setIsPayingAdvance(true);
    try {
      const res = await paymentsApi.payAdvance(order.id);
      setAdvancePaid(true);
      setAdvanceTxn(res.transaction_reference);
      toast.success("Advance payment successful!", {
        description: `₹${res.advance_amount.toLocaleString("en-IN")} paid. Ref: ${res.transaction_reference}`,
      });
      void syncFromBackend();
    } catch (err: any) {
      const msg = err.message || "Failed to process advance payment.";
      const cleanMsg = msg.includes("]: ") ? msg.split("]: ")[1] : msg;
      // Fallback for prototype testing if backend rejected
      if (cleanMsg.includes("already been completed")) {
        setAdvancePaid(true);
      }
      toast.info(cleanMsg);
    } finally {
      setIsPayingAdvance(false);
    }
  };

  // Handle simulated final settlement payment
  const handlePayFinal = async () => {
    setIsPayingFinal(true);
    try {
      const res = await paymentsApi.payFinal(order.id);
      setFinalPaid(true);
      setFinalTxn(res.transaction_reference);
      toast.success("Final settlement successful!", {
        description: `₹${res.final_payment_amount.toLocaleString("en-IN")} settled. Ref: ${res.transaction_reference}`,
      });
      void syncFromBackend();
    } catch (err: any) {
      const msg = err.message || "Failed to process final payment.";
      const cleanMsg = msg.includes("]: ") ? msg.split("]: ")[1] : msg;
      if (cleanMsg.includes("already been settled")) {
        setFinalPaid(true);
      }
      toast.info(cleanMsg);
    } finally {
      setIsPayingFinal(false);
    }
  };

  // Handle Delivery OTP Generation
  const handleGenerateOtp = async () => {
    setIsGeneratingOtp(true);
    try {
      const res = await paymentsApi.generateOtp(order.id);
      setOtpInfo(res);
      toast.success("Delivery OTP generated", {
        description: `Provide OTP ${res.demo_otp} to driver to confirm delivery.`,
      });
    } catch (err: any) {
      const msg = err.message || "Failed to generate delivery OTP.";
      toast.error(msg);
    } finally {
      setIsGeneratingOtp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate({ to: "/buyer/orders" })}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Orders
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            window.open(paymentsApi.getInvoiceUrl(order.id), "_blank");
          }}
        >
          <Download className="size-4" />
          Download Tax Invoice (PDF)
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Header */}
          <div className="surface-panel p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {order.id}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Order placed on {new Date(order.orderDate).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected Delivery</span>
                <span className="font-medium text-foreground">
                  {new Date(order.expectedDelivery).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Crop Value</span>
                <span className="font-bold text-foreground">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Settlement & Financial Breakdown Card */}
          <div className="surface-panel p-5 border border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Financial Settlement</h3>
              </div>
              {finalPaid || order.status === "Delivered" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  ● Fully Settled
                </span>
              ) : advancePaid ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-info/40 bg-info/10 px-2.5 py-0.5 text-xs font-semibold text-info">
                  ● 30% Advance Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                  ● Advance Pending
                </span>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Subtotal</span>
                <span className="font-semibold text-foreground">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  (-) Advance Payment (30%):
                  {advancePaid && <span className="ml-1 text-success font-medium">✓ Paid</span>}
                </span>
                <span className="font-medium text-foreground">₹{advanceAmount.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Remaining Product Value (70%):</span>
                <span className="font-medium text-foreground">₹{remainingProductAmount.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-dashed border-border pt-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="size-3.5 text-primary" />
                  (+) Transportation Charge:
                  <span className="text-[10px] text-muted-foreground/75">(Kept separate from crop price)</span>
                </span>
                <span className="font-bold text-primary">₹{transportCharge.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center border-t border-border pt-2.5 text-base font-bold">
                <span className="text-foreground">Total Transaction Value</span>
                <span className="text-foreground">₹{totalPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Action Buttons for Settlement */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <Button
                variant={advancePaid ? "secondary" : "default"}
                disabled={advancePaid || isPayingAdvance}
                onClick={handlePayAdvance}
                className="w-full gap-2"
              >
                {advancePaid ? (
                  <>
                    <CheckCircle2 className="size-4 text-success" />
                    Advance Paid (₹{advanceAmount.toLocaleString("en-IN")})
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" />
                    {isPayingAdvance ? "Processing…" : `Pay 30% Advance (₹${advanceAmount.toLocaleString("en-IN")})`}
                  </>
                )}
              </Button>

              <Button
                variant={finalPaid ? "secondary" : "default"}
                disabled={finalPaid || !advancePaid || order.status !== "Delivered" || isPayingFinal}
                onClick={handlePayFinal}
                className="w-full gap-2"
              >
                {finalPaid ? (
                  <>
                    <CheckCircle2 className="size-4 text-success" />
                    Final Settled (₹{finalAmount.toLocaleString("en-IN")})
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    {isPayingFinal ? "Settling…" : `Pay Final (₹${finalAmount.toLocaleString("en-IN")})`}
                  </>
                )}
              </Button>
            </div>

            {order.status !== "Delivered" && (
              <p className="text-xs text-muted-foreground italic">
                * Note: Final settlement (remaining 70% produce + freight) is unlocked after delivery OTP confirmation.
              </p>
            )}

            {advanceTxn && (
              <p className="text-[11px] text-muted-foreground">
                Advance Txn Ref: <code className="bg-muted px-1.5 py-0.5 rounded">{advanceTxn}</code>
              </p>
            )}
            {finalTxn && (
              <p className="text-[11px] text-muted-foreground">
                Final Settlement Txn Ref: <code className="bg-muted px-1.5 py-0.5 rounded">{finalTxn}</code>
              </p>
            )}
          </div>

          {/* Product Information */}
          <div className="surface-panel p-5">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Product</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{product.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{product.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantity Ordered</span>
                <span className="font-medium text-foreground">
                  {order.quantity.toLocaleString("en-IN")} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price per kg</span>
                <span className="font-medium text-foreground">₹{order.pricePerUnit}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total Cost</span>
                <span className="font-bold text-primary">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="surface-panel p-5">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Seller Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Farmer / FPO</p>
                  <p className="font-medium text-foreground">{order.seller}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Pickup Location</p>
                  <p className="font-medium text-foreground">{order.pickup}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Harvest Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(product.harvestDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Delivery & OTP */}
        <div className="space-y-4">
          {/* Delivery Location & Transportation */}
          <div className="surface-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Delivery Route &amp; Freight</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                <MapPin className="size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Destination Hub</p>
                  <span className="font-semibold text-foreground">{order.delivery}</span>
                </div>
              </div>

              {transportInfo && (
                <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Distance:</span>
                    <span className="font-medium text-foreground">{transportInfo.distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Freight Rate:</span>
                    <span className="font-medium text-foreground">₹{transportInfo.rate_per_km}/km</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 font-semibold">
                    <span>Transportation:</span>
                    <span className="text-primary">₹{transportInfo.transportation_charge}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Confirmation OTP Section */}
          <div className="surface-panel p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Delivery Verification (OTP)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              To confirm physical handover, generate a secure 6-digit OTP and provide it to the driver upon delivery.
            </p>

            {otpInfo ? (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-center space-y-1">
                <p className="text-xs text-muted-foreground">Your 6-Digit Delivery OTP:</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-primary">
                  {otpInfo.demo_otp}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Valid for 30 minutes. Share only upon physical receipt of produce.
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 text-xs"
                disabled={isGeneratingOtp}
                onClick={handleGenerateOtp}
              >
                <Sparkles className="size-3.5" />
                {isGeneratingOtp ? "Generating…" : "Generate Delivery OTP"}
              </Button>
            )}
          </div>

          {/* Harvest Badge */}
          {product.verified && (
            <div className="surface-panel p-5">
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Status</p>
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-sm font-semibold text-green-900">✓ Verified Farmer</p>
                <p className="mt-1 text-xs text-green-800">
                  This farmer has been verified by the platform
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="surface-panel p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Order Timeline</h3>
        <OrderTimeline status={order.status} orderDate={order.orderDate} />
      </div>
    </div>
  );
}
