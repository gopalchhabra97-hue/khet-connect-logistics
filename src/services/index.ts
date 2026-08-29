/**
 * Service layer.
 *
 * These functions are pure and operate on the in-memory demo state provided by
 * `DemoStore`. Each one is a drop-in seam: swapping the body for a Supabase
 * query, a FastAPI `fetch`, or an OR-Tools call requires no UI changes.
 */
import { DISTANCE_MATRIX, forecastData, forecastMetrics } from "@/data/mockData";
import type { DeliveryBatch, Driver, Order, Product, Vehicle } from "@/types";

/* ---------------- products service ---------------- */
export const productsService = {
  listBySeller: (products: Product[], sellerId: string) =>
    products.filter((p) => p.sellerId === sellerId),
  listAvailable: (products: Product[]) => products.filter((p) => p.available),
  find: (products: Product[], id: string) => products.find((p) => p.id === id) ?? null,
};

/* ---------------- orders service ---------------- */
export const ordersService = {
  byStatus: (orders: Order[], status: Order["status"]) =>
    orders.filter((o) => o.status === status),
  byBuyer: (orders: Order[], buyerId: string) => orders.filter((o) => o.buyerId === buyerId),
  ungroupedAccepted: (orders: Order[]) =>
    orders.filter((o) => o.status === "Accepted" && !o.batchId),
  totalValue: (orders: Order[]) =>
    orders.reduce((sum, o) => sum + o.quantity * o.pricePerUnit, 0),
};

/* ---------------- logistics service ---------------- */
export interface MatchResult {
  vehicle: Vehicle | null;
  driver: Driver | null;
  reason: string;
}

/**
 * Transparent rule-based matching. Not machine learning.
 * Factors: vehicle capacity, driver availability, pickup proximity,
 * delivery compatibility.
 */
export const logisticsService = {
  recommend(batch: DeliveryBatch, vehicles: Vehicle[], drivers: Driver[]): MatchResult {
    const feasible = vehicles
      .filter((v) => v.status === "Available" && v.capacity >= batch.totalQuantity)
      .sort((a, b) => {
        const near = (v: Vehicle) => (v.base === batch.pickup ? 0 : 1);
        return near(a) - near(b) || a.capacity - b.capacity;
      });
    const vehicle = feasible[0] ?? null;

    const availableDrivers = drivers
      .filter((d) => d.status === "Available")
      .sort((a, b) => (a.base === batch.pickup ? 0 : 1) - (b.base === batch.pickup ? 0 : 1));
    const driver = availableDrivers[0] ?? null;

    if (!vehicle || !driver) {
      return {
        vehicle,
        driver,
        reason:
          "No vehicle or driver currently satisfies the capacity and availability rules for this batch.",
      };
    }
    return {
      vehicle,
      driver,
      reason: `Capacity is sufficient for the grouped ${batch.totalQuantity.toLocaleString("en-IN")} kg load and the vehicle is currently available near the pickup location (${batch.pickup}).`,
    };
  },
  routeLegs(pickup: string, stops: string[]) {
    const legs: { from: string; to: string; km: number }[] = [];
    let current = pickup;
    for (const stop of stops) {
      legs.push({ from: current, to: stop, km: DISTANCE_MATRIX[current]?.[stop] ?? 60 });
      current = stop;
    }
    return legs;
  },
};

/* ---------------- forecast service ---------------- */
export const forecastService = {
  series: (crop: string) => forecastData[crop] ?? [],
  metrics: (crop: string) =>
    forecastMetrics[crop] ?? { current: 0, predicted: 0, trend: "Stable" as const, error: 0 },
};

/* ---------------- notifications service ---------------- */
export const notificationsService = {
  unreadCount: (list: { role: string; read: boolean }[], role: string) =>
    list.filter((n) => n.role === role && !n.read).length,
};

export const formatINR = (value: number) => `₹${value.toLocaleString("en-IN")}`;
export const formatQty = (value: number, unit = "kg") =>
  `${value.toLocaleString("en-IN")} ${unit}`;
export const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
