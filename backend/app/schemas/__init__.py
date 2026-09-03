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
    id: Optional[str] = None
    password: Optional[str] = None


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str
    org: Optional[str] = None
    location: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


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
    image: Optional[str] = None


class ProductCreate(ProductBase):
    id: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    location: Optional[str] = None
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    available: Optional[bool] = None
    harvest_date: Optional[str] = None
    verified: Optional[bool] = None
    image: Optional[str] = None


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
    unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    pickup_location: Optional[str] = None
    delivery_location: str
    order_date: Optional[str] = None
    expected_delivery: Optional[str] = None
    status: Optional[str] = "Pending"
    batch_id: Optional[str] = None


class OrderCreate(OrderBase):
    id: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


class OrderResponse(BaseModel):
    id: str
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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Vehicle Schemas
class VehicleBase(BaseModel):
    name: str
    registration: str
    capacity: int
    status: str = "Available"
    base_location: str


class VehicleCreate(VehicleBase):
    id: Optional[str] = None


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    registration: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    base_location: Optional[str] = None


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
    status: str = "Available"
    base_location: str
    vehicle_id: Optional[str] = None


class DriverCreate(DriverBase):
    id: Optional[str] = None


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license: Optional[str] = None
    status: Optional[str] = None
    base_location: Optional[str] = None
    vehicle_id: Optional[str] = None


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
