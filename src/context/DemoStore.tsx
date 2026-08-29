import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  DEMO_USERS,
  DISTANCE_MATRIX,
  seedBatches,
  seedDrivers,
  seedNotifications,
  seedOrders,
  seedProducts,
  seedVehicles,
} from "@/data/mockData";
import type {
  AppNotification,
  BatchStatus,
  DeliveryBatch,
  Driver,
  Order,
  Product,
  Role,
  User,
  Vehicle,
} from "@/types";

const STORAGE_KEY = "khetsetu-demo-state-v1";

interface DemoState {
  user: User | null;
  products: Product[];
  orders: Order[];
  vehicles: Vehicle[];
  drivers: Driver[];
  batches: DeliveryBatch[];
  notifications: AppNotification[];
  counter: number;
}

function initialState(): DemoState {
  return {
    user: null,
    products: structuredClone(seedProducts),
    orders: structuredClone(seedOrders),
    vehicles: structuredClone(seedVehicles),
    drivers: structuredClone(seedDrivers),
    batches: structuredClone(seedBatches),
    notifications: structuredClone(seedNotifications),
    counter: 1006,
  };
}

export function routeDistance(pickup: string, stops: string[]): number {
  let total = 0;
  let current = pickup;
  for (const stop of stops) {
    total += DISTANCE_MATRIX[current]?.[stop] ?? 60;
    current = stop;
  }
  return total;
}

interface DemoContextValue extends DemoState {
  login: (email: string, role: Role) => User;
  logout: () => void;
  addProduct: (p: Omit<Product, "id" | "sellerId" | "seller" | "verified">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleAvailability: (id: string) => void;
  placeOrder: (input: {
    productId: string;
    quantity: number;
    delivery: string;
  }) => Order | null;
  setOrderStatus: (id: string, status: Order["status"]) => void;
  groupCompatibleOrders: () => DeliveryBatch | null;
  assignBatch: (batchId: string, vehicleId: string, driverId: string) => void;
  setBatchStatus: (batchId: string, status: BatchStatus) => void;
  markNotificationsRead: (role: Role) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as DemoState);
    } catch {
      /* ignore corrupt demo state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable in demo */
    }
  }, [state, hydrated]);

  const pushNotification = useCallback(
    (role: Role, title: string, body: string, tone: AppNotification["tone"]) => {
      setState((s) => ({
        ...s,
        notifications: [
          {
            id: `N-${Math.random().toString(36).slice(2, 8)}`,
            role,
            title,
            body,
            time: "Just now",
            read: false,
            tone,
          },
          ...s.notifications,
        ],
      }));
    },
    [],
  );

  const login = useCallback((email: string, role: Role): User => {
    const known = DEMO_USERS[email.trim().toLowerCase()];
    const user: User =
      known && known.role === role
        ? known
        : {
            id: `U-${role.toUpperCase()}-DEMO`,
            name:
              role === "farmer"
                ? "Rajesh Kumar"
                : role === "buyer"
                  ? "Anita Sharma"
                  : role === "driver"
                    ? "Amit Kumar"
                    : "Priya Nair",
            email: email.trim() || `${role}@demo.com`,
            role,
            org: role === "farmer" ? "Green Valley FPO" : undefined,
            location: role === "buyer" ? "Chandigarh" : "Patiala",
          };
    setState((s) => ({ ...s, user }));
    return user;
  }, []);

  const logout = useCallback(() => setState((s) => ({ ...s, user: null })), []);

  const addProduct: DemoContextValue["addProduct"] = useCallback((p) => {
    setState((s) => {
      const id = `P-${s.counter + 1}`;
      return {
        ...s,
        counter: s.counter + 1,
        products: [
          {
            ...p,
            id,
            sellerId: s.user?.id ?? "U-F1",
            seller: s.user?.org ?? "Green Valley FPO",
            verified: false,
          },
          ...s.products,
        ],
      };
    });
  }, []);

  const updateProduct: DemoContextValue["updateProduct"] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  }, []);

  const toggleAvailability = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, available: !p.available } : p)),
    }));
  }, []);

  const placeOrder: DemoContextValue["placeOrder"] = useCallback(
    ({ productId, quantity, delivery }) => {
      let created: Order | null = null;
      setState((s) => {
        const product = s.products.find((p) => p.id === productId);
        if (!product) return s;
        const id = `#${s.counter + 1}`;
        const order: Order = {
          id,
          buyer: s.user?.org ?? s.user?.name ?? "FreshMart Retail",
          buyerId: s.user?.id ?? "U-B1",
          productId,
          product: product.name,
          quantity,
          unit: product.unit,
          pricePerUnit: product.price,
          pickup: product.location,
          delivery,
          orderDate: new Date().toISOString().slice(0, 10),
          expectedDelivery: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
          status: "Pending",
        };
        created = order;
        return { ...s, counter: s.counter + 1, orders: [order, ...s.orders] };
      });
      pushNotification(
        "farmer",
        "New order received",
        `A buyer ordered ${quantity} kg for ${delivery}. Awaiting your approval.`,
        "info",
      );
      return created;
    },
    [pushNotification],
  );

  const setOrderStatus = useCallback(
    (id: string, status: Order["status"]) => {
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
      }));
      if (status === "Accepted") {
        pushNotification("buyer", "Order accepted", `Order ${id} was accepted by the farmer.`, "success");
      }
      if (status === "Rejected") {
        pushNotification("buyer", "Order rejected", `Order ${id} was rejected by the farmer.`, "warning");
      }
    },
    [pushNotification],
  );

  const groupCompatibleOrders: DemoContextValue["groupCompatibleOrders"] = useCallback(() => {
    let batch: DeliveryBatch | null = null;
    setState((s) => {
      const candidates = s.orders.filter((o) => o.status === "Accepted" && !o.batchId);
      if (candidates.length < 2) return s;
      const pickup = candidates[0]!.pickup;
      const samePickup = candidates.filter((o) => o.pickup === pickup);
      const capacity = Math.max(...s.vehicles.map((v) => v.capacity));
      const chosen: Order[] = [];
      let load = 0;
      for (const order of samePickup) {
        if (load + order.quantity > capacity) continue;
        chosen.push(order);
        load += order.quantity;
      }
      if (chosen.length < 2) return s;
      const id = `#DB-${String(s.batches.length + 1).padStart(3, "0")}`;
      const stops = [...new Set(chosen.map((o) => o.delivery))];
      const distanceKm = routeDistance(pickup, stops);
      const newBatch: DeliveryBatch = {
        id,
        orderIds: chosen.map((o) => o.id),
        pickup,
        stops,
        totalQuantity: load,
        status: "Planned",
        distanceKm,
        etaMinutes: Math.round(distanceKm * 1.35) + stops.length * 15,
        createdAt: new Date().toISOString(),
      };
      batch = newBatch;
      return {
        ...s,
        batches: [newBatch, ...s.batches],
        orders: s.orders.map((o) =>
          newBatch.orderIds.includes(o.id) ? { ...o, batchId: id, status: "Preparing" } : o,
        ),
      };
    });
    return batch;
  }, []);

  const assignBatch: DemoContextValue["assignBatch"] = useCallback(
    (batchId, vehicleId, driverId) => {
      setState((s) => ({
        ...s,
        batches: s.batches.map((b) =>
          b.id === batchId ? { ...b, vehicleId, driverId, status: "Assigned" } : b,
        ),
        vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, status: "On Route" } : v)),
        drivers: s.drivers.map((d) =>
          d.id === driverId ? { ...d, status: "Assigned", vehicleId } : d,
        ),
      }));
      pushNotification("driver", "New delivery assigned", `Batch ${batchId} was assigned to you.`, "info");
    },
    [pushNotification],
  );

  const setBatchStatus: DemoContextValue["setBatchStatus"] = useCallback(
    (batchId, status) => {
      setState((s) => {
        const batch = s.batches.find((b) => b.id === batchId);
        const orderStatus: Order["status"] | null =
          status === "In Transit" ? "In Transit" : status === "Delivered" ? "Delivered" : null;
        return {
          ...s,
          batches: s.batches.map((b) => (b.id === batchId ? { ...b, status } : b)),
          orders:
            batch && orderStatus
              ? s.orders.map((o) =>
                  batch.orderIds.includes(o.id) ? { ...o, status: orderStatus } : o,
                )
              : s.orders,
          drivers:
            batch && batch.driverId
              ? s.drivers.map((d) =>
                  d.id === batch.driverId
                    ? {
                        ...d,
                        status:
                          status === "Delivered"
                            ? "Available"
                            : status === "In Transit" || status === "Picked Up"
                              ? "On Route"
                              : "Assigned",
                      }
                    : d,
                )
              : s.drivers,
          vehicles:
            batch && batch.vehicleId && status === "Delivered"
              ? s.vehicles.map((v) => (v.id === batch.vehicleId ? { ...v, status: "Available" } : v))
              : s.vehicles,
        };
      });
      if (status === "Delivered") {
        pushNotification("buyer", "Order delivered", `Batch ${batchId} was delivered.`, "success");
      } else if (status === "In Transit") {
        pushNotification("buyer", "Order dispatched", `Batch ${batchId} is in transit.`, "info");
      }
    },
    [pushNotification],
  );

  const markNotificationsRead = useCallback((role: Role) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.role === role ? { ...n, read: true } : n)),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setState((s) => ({ ...initialState(), user: s.user }));
    toast.success("Demo data reset", { description: "All mock records restored to seed values." });
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      login,
      logout,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleAvailability,
      placeOrder,
      setOrderStatus,
      groupCompatibleOrders,
      assignBatch,
      setBatchStatus,
      markNotificationsRead,
      resetDemo,
    }),
    [
      state,
      login,
      logout,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleAvailability,
      placeOrder,
      setOrderStatus,
      groupCompatibleOrders,
      assignBatch,
      setBatchStatus,
      markNotificationsRead,
      resetDemo,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
