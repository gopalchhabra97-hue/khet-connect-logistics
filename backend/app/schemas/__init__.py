from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    role: str
    org: Optional[str] = None
    location: Optional[str] = None


class UserCreate(UserBase):
    id: str


class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Product Schemas
class ProductBase(BaseModel):
    name: str
    category: str
    quantity: int
    unit: str
    price: float
    location: str
    seller_id: str
    seller_name: Optional[str] = None
    available: bool = True
    harvest_date: Optional[str] = None
    verified: bool = False


class ProductCreate(ProductBase):
    id: str


class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Order Schemas
class OrderBase(BaseModel):
    buyer_id: str
    buyer_name: Optional[str] = None
    product_id: str
    product_name: Optional[str] = None
    quantity: int
    unit: str
    price_per_unit: float
    pickup_location: str
    delivery_location: str
    order_date: str
    expected_delivery: Optional[str] = None
    status: str
    batch_id: Optional[str] = None


class OrderCreate(OrderBase):
    id: str


class OrderResponse(OrderBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Vehicle Schemas
class VehicleBase(BaseModel):
    name: str
    registration: str
    capacity: int
    status: str
    base_location: str


class VehicleCreate(VehicleBase):
    id: str


class VehicleResponse(VehicleBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Driver Schemas
class DriverBase(BaseModel):
    name: str
    phone: str
    license: str
    status: str
    base_location: str
    vehicle_id: Optional[str] = None


class DriverCreate(DriverBase):
    id: str


class DriverResponse(DriverBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# DeliveryBatch Schemas
class DeliveryBatchBase(BaseModel):
    order_ids: List[str]
    pickup_location: str
    delivery_stops: List[str]
    total_quantity: int
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: str
    distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None


class DeliveryBatchCreate(DeliveryBatchBase):
    id: str


class DeliveryBatchResponse(DeliveryBatchBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
