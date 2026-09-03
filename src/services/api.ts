/**
 * REST API Client for KHETSETU FastAPI Backend.
 *
 * Provides bidirectional DTO mapping between FastAPI models (snake_case)
 * and Frontend TypeScript models (camelCase).
 */

import type { Order, OrderStatus, Product, Role, User } from "@/types";

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "khetsetu_auth_token";

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set: (token: string): void => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear: (): void => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

/* ---------------- API DTO Interfaces (Backend Format) ---------------- */

export interface ApiProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  location: string;
  seller_id: string;
  seller_name: string | null;
  available: boolean;
  harvest_date: string | null;
  verified: boolean;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiOrder {
  id: string;
  buyer_id: string;
  buyer_name: string | null;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit: string;
  price_per_unit: number;
  pickup_location: string;
  delivery_location: string;
  order_date: string;
  expected_delivery: string | null;
  status: string;
  batch_id: string | null;
  created_at?: string;
  updated_at?: string;
}

/* ---------------- Bidirectional Mappers ---------------- */

export function mapApiProductToFrontend(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    category: p.category as Product["category"],
    quantity: p.quantity,
    unit: p.unit,
    price: p.price,
    location: p.location,
    seller: p.seller_name || "Mandi Farmer",
    sellerId: p.seller_id,
    available: p.available,
    harvestDate: p.harvest_date || new Date().toISOString().slice(0, 10),
    verified: p.verified,
    image: p.image || undefined,
  };
}

export function mapFrontendProductToApi(p: Partial<Product>): Partial<ApiProduct> {
  const result: Record<string, unknown> = {};
  if (p.name !== undefined) result.name = p.name;
  if (p.category !== undefined) result.category = p.category;
  if (p.quantity !== undefined) result.quantity = p.quantity;
  if (p.unit !== undefined) result.unit = p.unit;
  if (p.price !== undefined) result.price = p.price;
  if (p.location !== undefined) result.location = p.location;
  if (p.sellerId !== undefined) result.seller_id = p.sellerId;
  if (p.seller !== undefined) result.seller_name = p.seller;
  if (p.available !== undefined) result.available = p.available;
  if (p.harvestDate !== undefined) result.harvest_date = p.harvestDate;
  if (p.verified !== undefined) result.verified = p.verified;
  if (p.image !== undefined) result.image = p.image;
  return result as Partial<ApiProduct>;
}

export function mapApiOrderToFrontend(o: ApiOrder): Order {
  return {
    id: o.id,
    buyer: o.buyer_name || "Mandi Buyer",
    buyerId: o.buyer_id,
    productId: o.product_id,
    product: o.product_name || "Agricultural Commodity",
    quantity: o.quantity,
    unit: o.unit || "kg",
    pricePerUnit: o.price_per_unit,
    pickup: o.pickup_location,
    delivery: o.delivery_location,
    orderDate: o.order_date,
    expectedDelivery: o.expected_delivery || o.order_date,
    status: (o.status as OrderStatus) || "Pending",
    batchId: o.batch_id || undefined,
  };
}

/* ---------------- Core Fetch Wrapper ---------------- */

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || JSON.stringify(errorJson);
    } catch {
      // ignore json parse error on non-json response
    }
    throw new Error(`API ${options.method || "GET"} ${path} [${response.status}]: ${errorDetail}`);
  }

  // If 204 No Content, return null
  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json() as Promise<T>;
}

/* ---------------- Products API ---------------- */

export interface ProductFilterParams {
  category?: string;
  location?: string;
  seller_id?: string;
  available?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
}

export const productsApi = {
  async list(params?: ProductFilterParams): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.location) query.set("location", params.location);
    if (params?.seller_id) query.set("seller_id", params.seller_id);
    if (params?.available !== undefined) query.set("available", String(params.available));
    if (params?.min_price !== undefined) query.set("min_price", String(params.min_price));
    if (params?.max_price !== undefined) query.set("max_price", String(params.max_price));
    if (params?.search) query.set("search", params.search);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const apiProducts = await request<ApiProduct[]>(`/products${queryString}`);
    return apiProducts.map(mapApiProductToFrontend);
  },

  async get(id: string): Promise<Product> {
    const apiProduct = await request<ApiProduct>(`/products/${encodeURIComponent(id)}`);
    return mapApiProductToFrontend(apiProduct);
  },

  async create(input: {
    id?: string;
    name: string;
    category: Product["category"];
    quantity: number;
    unit: string;
    price: number;
    location: string;
    sellerId: string;
    seller?: string;
    available?: boolean;
    harvestDate?: string;
    verified?: boolean;
    image?: string;
  }): Promise<Product> {
    const payload = {
      id: input.id,
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      price: input.price,
      location: input.location,
      seller_id: input.sellerId,
      seller_name: input.seller,
      available: input.available !== undefined ? input.available : true,
      harvest_date: input.harvestDate || new Date().toISOString().slice(0, 10),
      verified: input.verified || false,
      image: input.image,
    };

    const created = await request<ApiProduct>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapApiProductToFrontend(created);
  },

  async update(id: string, patch: Partial<Product>): Promise<Product> {
    const payload = mapFrontendProductToApi(patch);
    const updated = await request<ApiProduct>(`/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return mapApiProductToFrontend(updated);
  },

  async delete(id: string): Promise<void> {
    await request<void>(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

/* ---------------- Orders API ---------------- */

export interface OrderFilterParams {
  buyer_id?: string;
  product_id?: string;
  status?: string;
  batch_id?: string;
  pickup_location?: string;
  delivery_location?: string;
}

export const ordersApi = {
  async list(params?: OrderFilterParams): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.buyer_id) query.set("buyer_id", params.buyer_id);
    if (params?.product_id) query.set("product_id", params.product_id);
    if (params?.status) query.set("status", params.status);
    if (params?.batch_id) query.set("batch_id", params.batch_id);
    if (params?.pickup_location) query.set("pickup_location", params.pickup_location);
    if (params?.delivery_location) query.set("delivery_location", params.delivery_location);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const apiOrders = await request<ApiOrder[]>(`/orders${queryString}`);
    return apiOrders.map(mapApiOrderToFrontend);
  },

  async get(id: string): Promise<Order> {
    const apiOrder = await request<ApiOrder>(`/orders/${encodeURIComponent(id)}`);
    return mapApiOrderToFrontend(apiOrder);
  },

  async create(input: {
    buyerId: string;
    buyerName?: string;
    productId: string;
    quantity: number;
    delivery: string;
    unit?: string;
    pricePerUnit?: number;
    pickup?: string;
  }): Promise<Order> {
    const payload = {
      buyer_id: input.buyerId,
      buyer_name: input.buyerName,
      product_id: input.productId,
      quantity: input.quantity,
      delivery_location: input.delivery,
      unit: input.unit,
      price_per_unit: input.pricePerUnit,
      pickup_location: input.pickup,
      status: "Pending",
    };

    const created = await request<ApiOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapApiOrderToFrontend(created);
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const updated = await request<ApiOrder>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapApiOrderToFrontend(updated);
  },
};

/* ---------------- Authentication API ---------------- */

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: "farmer" | "buyer" | "driver";
  org?: string;
  location?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    org?: string;
    location?: string;
    created_at: string;
    updated_at: string;
  };
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<User> {
    const res = await request<TokenResponse["user"]>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      id: res.id,
      name: res.name,
      email: res.email,
      role: res.role as Role,
      org: res.org,
      location: res.location,
    };
  },

  async login(payload: LoginPayload): Promise<{ token: string; user: User }> {
    const res = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    tokenStorage.set(res.access_token);
    const user: User = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      role: res.user.role as Role,
      org: res.user.org,
      location: res.user.location,
    };
    return { token: res.access_token, user };
  },

  async getCurrentUser(): Promise<User> {
    const res = await request<TokenResponse["user"]>("/auth/me");
    return {
      id: res.id,
      name: res.name,
      email: res.email,
      role: res.role as Role,
      org: res.org,
      location: res.location,
    };
  },

  logout(): void {
    tokenStorage.clear();
  },
};

/* ---------------- Forecast API ---------------- */

export interface ApiForecastPoint {
  period: string;
  historical: number | null;
  predicted: number | null;
}

export interface ApiForecastResponse {
  product_id: string | null;
  product_name: string;
  series: ApiForecastPoint[];
  current_demand: number;
  predicted_demand: number;
  available_supply: number;
  safety_buffer_pct: number;
  recommended_supply: number;
  recommendation_text: string;
  trend: "Increasing" | "Decreasing" | "Stable";
  error_metric: number;
  status: "live" | "demo";
  reason: string;
  model: string;
  generated_at: string;
}

export const forecastApi = {
  async list(params?: {
    productId?: string;
    cropName?: string;
    safetyBufferPct?: number;
    forecastDays?: number;
  }): Promise<ApiForecastResponse[]> {
    const query = new URLSearchParams();
    if (params?.productId) query.set("product_id", params.productId);
    if (params?.cropName) query.set("crop_name", params.cropName);
    if (params?.safetyBufferPct !== undefined) query.set("safety_buffer_pct", String(params.safetyBufferPct));
    if (params?.forecastDays !== undefined) query.set("forecast_days", String(params.forecastDays));

    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<ApiForecastResponse[]>(`/forecast${qs}`);
  },

  async get(productId: string): Promise<ApiForecastResponse> {
    return request<ApiForecastResponse>(`/forecast/${encodeURIComponent(productId)}`);
  },
};

/* ---------------- Payments & Settlement API ---------------- */

export interface ApiPayment {
  id: string;
  order_id: string;
  buyer_id: string;
  payment_type: string;
  amount: number;
  status: string;
  payment_method: string;
  transaction_reference: string;
  created_at: string;
  paid_at?: string | null;
}

export interface ApiAdvancePaymentResponse {
  order_id: string;
  product_subtotal: number;
  advance_percentage: number;
  advance_amount: number;
  advance_payment_status: string;
  payment_status: string;
  transaction_reference: string;
  payment: ApiPayment;
  message: string;
}

export interface ApiFinalPaymentResponse {
  order_id: string;
  product_subtotal: number;
  advance_already_paid: number;
  remaining_product_amount: number;
  transportation_charge: number;
  final_payment_amount: number;
  total_buyer_payment: number;
  payment_status: string;
  transaction_reference: string;
  payment: ApiPayment;
  message: string;
}

export interface ApiTransportationCharge {
  order_id: string;
  pickup_location: string;
  delivery_location: string;
  distance_km: number;
  rate_per_km: number;
  transportation_charge: number;
  explanation: string;
}

export interface ApiDeliveryOTPGenerate {
  order_id: string;
  message: string;
  demo_otp: string;
  expires_at: string;
}

export interface ApiDeliveryOTPVerify {
  order_id: string;
  status: string;
  message: string;
  delivery_confirmed_at: string;
  driver_payout_status: string;
}

export interface ApiDriverPayout {
  id: string;
  order_id: string;
  driver_id: string;
  amount: number;
  status: string;
  transaction_reference?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export const paymentsApi = {
  async payAdvance(orderId: string): Promise<ApiAdvancePaymentResponse> {
    return request<ApiAdvancePaymentResponse>(`/orders/${encodeURIComponent(orderId)}/payments/advance`, {
      method: "POST",
    });
  },

  async payFinal(orderId: string): Promise<ApiFinalPaymentResponse> {
    return request<ApiFinalPaymentResponse>(`/orders/${encodeURIComponent(orderId)}/payments/final`, {
      method: "POST",
    });
  },

  async getTransportationCharge(orderId: string, ratePerKm?: number): Promise<ApiTransportationCharge> {
    const qs = ratePerKm ? `?rate_per_km=${ratePerKm}` : "";
    return request<ApiTransportationCharge>(`/orders/${encodeURIComponent(orderId)}/transportation-charge${qs}`);
  },

  async generateOtp(orderId: string): Promise<ApiDeliveryOTPGenerate> {
    return request<ApiDeliveryOTPGenerate>(`/orders/${encodeURIComponent(orderId)}/delivery-otp/generate`, {
      method: "POST",
    });
  },

  async verifyOtp(orderId: string, otp: string): Promise<ApiDeliveryOTPVerify> {
    return request<ApiDeliveryOTPVerify>(`/orders/${encodeURIComponent(orderId)}/delivery-otp/verify`, {
      method: "POST",
      body: JSON.stringify({ otp }),
    });
  },

  getInvoiceUrl(orderId: string): string {
    return `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/invoice`;
  },

  async getDriverPayouts(driverId: string): Promise<ApiDriverPayout[]> {
    return request<ApiDriverPayout[]>(`/drivers/${encodeURIComponent(driverId)}/payouts`);
  },

  async payDriverPayout(driverId: string, payoutId: string): Promise<ApiDriverPayout> {
    return request<ApiDriverPayout>(`/drivers/${encodeURIComponent(driverId)}/payouts/${encodeURIComponent(payoutId)}/pay`, {
      method: "PATCH",
    });
  },
};

/* ---------------- Mandi Prices API ---------------- */

export interface ApiMandiPrice {
  id: string;
  commodity: string;
  market: string;
  state: string;
  district?: string | null;
  variety?: string | null;
  grade?: string | null;
  price_date: string;
  unit: string;
  min_price?: number | null;
  max_price?: number | null;
  modal_price: number;
  price_per_kg: number;
  source: string;
  source_resource_id: string;
  fetched_at: string;
}

export interface ApiMandiReference {
  commodity: string;
  market: string;
  state: string;
  district?: string | null;
  variety?: string | null;
  grade?: string | null;
  price_date: string;
  modal_price: number;
  price_per_kg: number;
  unit: string;
  price_type_used: string;
  source: string;
  status: "live" | "stale" | "demo";
  max_markup_percent: number;
  max_allowed_price: number;
  freshness_hours?: number | null;
  explanation: string;
}

export interface ApiMandiSyncStatus {
  last_successful_sync?: string | null;
  last_attempted_sync?: string | null;
  records_stored: number;
  last_sync_status: string;
  is_stale: boolean;
  stale_after_hours: number;
  sync_interval_hours: number;
  has_api_key: boolean;
  message: string;
}

export const mandiApi = {
  async getReferencePrice(commodity: string, location?: string, state?: string): Promise<ApiMandiReference> {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (state) params.set("state", state);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<ApiMandiReference>(`/mandi-prices/reference/${encodeURIComponent(commodity)}${qs}`);
  },

  async listLatest(state?: string): Promise<ApiMandiPrice[]> {
    const qs = state ? `?state=${encodeURIComponent(state)}` : "";
    return request<ApiMandiPrice[]>(`/mandi-prices/latest${qs}`);
  },

  async getStatus(): Promise<ApiMandiSyncStatus> {
    return request<ApiMandiSyncStatus>("/mandi-prices/status");
  },

  async triggerSync(): Promise<{ message: string; records_fetched: number; records_inserted: number; status: string }> {
    return request("/mandi-prices/sync", { method: "POST" });
  },
};

/* ---------------- Matching API (Phase 8) ---------------- */

export interface ApiMatchingSearchRequest {
  commodity: string;
  quantity: number;
  unit?: string;
  max_price?: number | null;
  delivery_location?: string | null;
  required_by_days?: number | null;
  min_quality_score?: number | null;
  preferred_variety?: string | null;
}

export interface ApiMatchingScoreBreakdown {
  commodity: number;
  quantity: number;
  price: number;
  location: number;
  delivery: number;
  quality: number;
  total: number;
}

export interface ApiMatchingResultItem {
  product_id: string;
  farmer_id: string;
  farmer_name: string;
  commodity: string;
  category: string;
  available_quantity: number;
  requested_quantity: number;
  fulfillable_quantity: number;
  unit: string;
  farmer_price: number;
  buyer_max_price?: number | null;
  mandi_reference_price?: number | null;
  mandi_status: string;
  max_allowed_price?: number | null;
  match_score: number;
  match_score_raw: number;
  fulfillment: "full" | "partial" | "none";
  location: string;
  delivery_location?: string | null;
  distance_km?: number | null;
  estimated_transportation_charge?: number | null;
  quality_score: number;
  verified: boolean;
  score_breakdown: ApiMatchingScoreBreakdown;
  explanation: string[];
  image?: string | null;
}

export interface ApiMatchingSearchResponse {
  matches: ApiMatchingResultItem[];
  total_candidates_evaluated: number;
  buyer_requirements: ApiMatchingSearchRequest;
  timestamp: string;
}

export const matchingApi = {
  async search(requestData: ApiMatchingSearchRequest): Promise<ApiMatchingSearchResponse> {
    return request<ApiMatchingSearchResponse>("/matching/search", {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  },

  async getProductMatch(
    productId: string,
    params?: { quantity?: number; max_price?: number; delivery_location?: string; required_by_days?: number }
  ): Promise<ApiMatchingResultItem> {
    const qs = new URLSearchParams();
    if (params?.quantity) qs.set("quantity", String(params.quantity));
    if (params?.max_price) qs.set("max_price", String(params.max_price));
    if (params?.delivery_location) qs.set("delivery_location", params.delivery_location);
    if (params?.required_by_days) qs.set("required_by_days", String(params.required_by_days));
    const queryStr = qs.toString() ? `?${qs.toString()}` : "";
    return request<ApiMatchingResultItem>(`/matching/product/${encodeURIComponent(productId)}${queryStr}`);
  },
};

/* ---------------- Health Check ---------------- */

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const healthUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "/api/health");
    const res = await fetch(healthUrl, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
