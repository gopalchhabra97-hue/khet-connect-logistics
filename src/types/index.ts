export type Role = "farmer" | "buyer" | "driver" | "admin";

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Preparing"
  | "In Transit"
  | "Delivered";

export type BatchStatus = "Planned" | "Assigned" | "Picked Up" | "In Transit" | "Delivered";

export type DriverStatus = "Available" | "Assigned" | "On Route";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  org?: string;
  location?: string;
}

export interface Product {
  id: string;
  name: string;
  category: "Vegetables" | "Fruits" | "Grains" | "Pulses";
  quantity: number;
  unit: string;
  price: number;
  location: string;
  seller: string;
  sellerId: string;
  available: boolean;
  harvestDate: string;
  verified: boolean;
  image?: string;
}

export interface Order {
  id: string;
  buyer: string;
  buyerId: string;
  productId: string;
  product: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  pickup: string;
  delivery: string;
  orderDate: string;
  expectedDelivery: string;
  status: OrderStatus;
  batchId?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  registration: string;
  capacity: number;
  status: "Available" | "Unavailable" | "On Route";
  base: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  status: DriverStatus;
  base: string;
  vehicleId?: string;
}

export interface DeliveryBatch {
  id: string;
  orderIds: string[];
  pickup: string;
  stops: string[];
  totalQuantity: number;
  vehicleId?: string;
  driverId?: string;
  status: BatchStatus;
  distanceKm: number;
  etaMinutes: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  role: Role;
  title: string;
  body: string;
  time: string;
  read: boolean;
  tone: "info" | "success" | "warning";
}

export interface ForecastPoint {
  period: string;
  historical: number | null;
  predicted: number | null;
}
