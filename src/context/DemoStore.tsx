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
import {
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
import { productsApi, ordersApi, authApi, tokenStorage } from "@/services/api";

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
  isBackendConnected: boolean;
  isAuthLoading: boolean;
  syncFromBackend: () => Promise<void>;
  login: (email: string, passwordOrRole?: string | Role, fallbackRole?: Role) => Promise<User>;
  logout: () => void;
  addProduct: (p: Omit<Product, "id" | "sellerId" | "seller" | "verified">) => Promise<Product | void> | void;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<Product | void> | void;
  deleteProduct: (id: string) => Promise<void> | void;
  toggleAvailability: (id: string) => Promise<void> | void;
  placeOrder: (input: {
    productId: string;
    quantity: number;
    delivery: string;
  }) => Promise<Order | null> | Order | null;
  setOrderStatus: (id: string, status: Order["status"]) => Promise<void> | void;
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
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const syncFromBackend = useCallback(async () => {
    try {
      const [remoteProducts, remoteOrders] = await Promise.all([
        productsApi.list(),
        ordersApi.list(),
      ]);
      setState((s) => ({
        ...s,
        products: remoteProducts,
        orders: remoteOrders,
      }));
      setIsBackendConnected(true);
    } catch (err) {
      console.warn("FastAPI backend unavailable, using demo state fallback.", err);
      setIsBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    let rawState: DemoState | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) rawState = JSON.parse(raw) as DemoState;
    } catch {
      /* ignore corrupt demo state */
    }

    if (rawState) {
      setState(rawState);
    }
    setHydrated(true);

    // Verify stored JWT and restore user if token exists
    const initAuth = async () => {
      const token = tokenStorage.get();
      if (token) {
        try {
          const user = await authApi.getCurrentUser();
          setState((s) => ({ ...s, user }));
          setIsBackendConnected(true);
        } catch (err) {
          console.warn("Stored JWT token invalid or expired. Clearing auth token.", err);
          tokenStorage.clear();
          setState((s) => ({ ...s, user: null }));
        }
      } else {
        // If no JWT stored, start unauthenticated
        setState((s) => ({ ...s, user: null }));
      }
      setIsAuthLoading(false);
    };

    void initAuth();
    void syncFromBackend();
  }, [syncFromBackend]);

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

  const login = useCallback(
    async (email: string, passwordOrRole?: string | Role, fallbackRole?: Role): Promise<User> => {
      const isRole = passwordOrRole && ["farmer", "buyer", "driver", "admin"].includes(passwordOrRole);
      const password = isRole ? "demo123" : (passwordOrRole as string) || "demo123";
      const roleHint = isRole ? (passwordOrRole as Role) : fallbackRole;

      try {
        const { user } = await authApi.login({
          email: email.trim(),
          password,
        });
        setState((s) => ({ ...s, user }));
        setIsBackendConnected(true);
        return user;
      } catch (err) {
        // If the server explicitly rejected the credentials, raise error to the caller
        if (err instanceof Error && (err.message.includes("401") || err.message.includes("400"))) {
          throw err;
        }

        // Otherwise if backend is offline, fall back to demo accounts
        console.warn("Backend auth unavailable, falling back to demo account:", err);
        const role = roleHint || "farmer";
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
      }
    },
    [],
  );

  const logout = useCallback(() => {
    authApi.logout();
    setState((s) => ({ ...s, user: null }));
  }, []);

  const addProduct: DemoContextValue["addProduct"] = useCallback(
    async (p) => {
      const sellerId = state.user?.id || "U-F1";
      const sellerName = state.user?.org || state.user?.name || "Green Valley FPO";

      try {
        const created = await productsApi.create({
          ...p,
          sellerId,
          seller: sellerName,
        });
        setState((s) => ({
          ...s,
          products: [created, ...s.products.filter((item) => item.id !== created.id)],
        }));
        setIsBackendConnected(true);
        return created;
      } catch (err) {
        console.warn("Backend addProduct failed, falling back to local state:", err);
        const id = `P-${state.counter + 1}`;
        const fallback: Product = {
          ...p,
          id,
          sellerId,
          seller: sellerName,
          verified: false,
        };
        setState((s) => ({
          ...s,
          counter: s.counter + 1,
          products: [fallback, ...s.products],
        }));
        return fallback;
      }
    },
    [state.user, state.counter],
  );

  const updateProduct: DemoContextValue["updateProduct"] = useCallback(
    async (id, patch) => {
      try {
        const updated = await productsApi.update(id, patch);
        setState((s) => ({
          ...s,
          products: s.products.map((p) => (p.id === id ? updated : p)),
        }));
        setIsBackendConnected(true);
        return updated;
      } catch (err) {
        console.warn("Backend updateProduct failed, updating local state:", err);
        setState((s) => ({
          ...s,
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      }
    },
    [],
  );

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await productsApi.delete(id);
      setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
      setIsBackendConnected(true);
    } catch (err: any) {
      console.warn("Backend deleteProduct failed:", err);
      toast.error(err.message || "Failed to delete product from database");
      setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
    }
  }, []);

  const toggleAvailability = useCallback(
    async (id: string) => {
      const current = state.products.find((p) => p.id === id);
      if (!current) return;
      const nextAvailable = !current.available;

      try {
        const updated = await productsApi.update(id, { available: nextAvailable });
        setState((s) => ({
          ...s,
          products: s.products.map((p) => (p.id === id ? updated : p)),
        }));
        setIsBackendConnected(true);
      } catch (err) {
        console.warn("Backend toggleAvailability failed, updating local state:", err);
        setState((s) => ({
          ...s,
          products: s.products.map((p) => (p.id === id ? { ...p, available: nextAvailable } : p)),
        }));
      }
    },
    [state.products],
  );

  const placeOrder: DemoContextValue["placeOrder"] = useCallback(
    async ({ productId, quantity, delivery }) => {
      const product = state.products.find((p) => p.id === productId);
      if (!product) return null;

      const buyerId = state.user?.id || "U-B1";
      const buyerName = state.user?.org || state.user?.name || "FreshMart Retail";

      try {
        const created = await ordersApi.create({
          buyerId,
          buyerName,
          productId,
          quantity,
          delivery,
          unit: product.unit,
          pricePerUnit: product.price,
          pickup: product.location,
        });

        setState((s) => ({
          ...s,
          orders: [created, ...s.orders.filter((o) => o.id !== created.id)],
        }));
        setIsBackendConnected(true);

        pushNotification(
          "farmer",
          "New order received",
          `A buyer ordered ${quantity} ${product.unit} for ${delivery}. Awaiting your approval.`,
          "info",
        );
        return created;
      } catch (err) {
        console.warn("Backend placeOrder failed, falling back to local order:", err);
        const id = `#${state.counter + 1}`;
        const localOrder: Order = {
          id,
          buyer: buyerName,
          buyerId,
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

        setState((s) => ({
          ...s,
          counter: s.counter + 1,
          orders: [localOrder, ...s.orders],
        }));

        pushNotification(
          "farmer",
          "New order received",
          `A buyer ordered ${quantity} kg for ${delivery}. Awaiting your approval.`,
          "info",
        );
        return localOrder;
      }
    },
    [state.products, state.user, state.counter, pushNotification],
  );

  const setOrderStatus = useCallback(
    async (id: string, status: Order["status"]) => {
      try {
        const updated = await ordersApi.updateStatus(id, status);
        setState((s) => ({
          ...s,
          orders: s.orders.map((o) => (o.id === id ? updated : o)),
        }));
        setIsBackendConnected(true);
      } catch (err) {
        console.warn("Backend setOrderStatus failed, updating local state:", err);
        setState((s) => ({
          ...s,
          orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
        }));
      }

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
      isBackendConnected,
      isAuthLoading,
      syncFromBackend,
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
      isBackendConnected,
      isAuthLoading,
      syncFromBackend,
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
