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
