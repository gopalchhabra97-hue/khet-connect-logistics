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
    product_subtotal: Optional[float] = None
    advance_percentage: Optional[float] = 30.0
    advance_amount: Optional[float] = None
    advance_payment_status: Optional[str] = "unpaid"
    remaining_product_amount: Optional[float] = None
    remaining_payment_status: Optional[str] = "unpaid"
    transportation_charge: Optional[float] = None
    total_payable_amount: Optional[float] = None
    payment_status: Optional[str] = "pending"
    delivery_confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Settlement & Payment Schemas
class PaymentResponse(BaseModel):
    id: str
    order_id: str
    buyer_id: str
    payment_type: str
    amount: float
    status: str
    payment_method: str
    transaction_reference: str
    created_at: datetime
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdvancePaymentResponse(BaseModel):
    order_id: str
    product_subtotal: float
    advance_percentage: float
    advance_amount: float
    advance_payment_status: str
    payment_status: str
    transaction_reference: str
    payment: PaymentResponse
    message: str


class FinalPaymentResponse(BaseModel):
    order_id: str
    product_subtotal: float
    advance_already_paid: float
    remaining_product_amount: float
    transportation_charge: float
    final_payment_amount: float
    total_buyer_payment: float
    payment_status: str
    transaction_reference: str
    payment: PaymentResponse
    message: str


class TransportationChargeResponse(BaseModel):
    order_id: str
    pickup_location: str
    delivery_location: str
    distance_km: float
    rate_per_km: float
    transportation_charge: float
    explanation: str


class DeliveryOTPGenerateResponse(BaseModel):
    order_id: str
    message: str
    demo_otp: str  # Safe development/testing mechanism
    expires_at: datetime


class DeliveryOTPVerifyRequest(BaseModel):
    otp: str


class DeliveryOTPVerifyResponse(BaseModel):
    order_id: str
    status: str
    message: str
    delivery_confirmed_at: datetime
    driver_payout_status: str


class DriverPayoutResponse(BaseModel):
    id: str
    order_id: str
    driver_id: str
    amount: float
    status: str
    transaction_reference: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None

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


# Forecast Schemas
class ForecastPointSchema(BaseModel):
    period: str
    historical: Optional[float] = None
    predicted: Optional[float] = None


class ForecastResponse(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    series: List[ForecastPointSchema]
    current_demand: float
    predicted_demand: float
    available_supply: float
    safety_buffer_pct: float
    recommended_supply: float
    recommendation_text: str
    trend: str  # "Increasing" | "Decreasing" | "Stable"
    error_metric: float  # MAPE percentage
    status: str  # "live" | "demo"
    reason: str
    model: str
    generated_at: datetime
