from pydantic import BaseModel, Field
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
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None
    delivery_stops: Optional[List[str]] = None
    total_quantity: Optional[int] = None
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: Optional[str] = "Planned"
    scheduled_at: Optional[datetime] = None
    transportation_charge: Optional[float] = None
    distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None


class DeliveryBatchCreate(BaseModel):
    id: Optional[str] = None
    order_ids: List[str]
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None
    delivery_stops: Optional[List[str]] = None
    total_quantity: Optional[int] = None
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    transportation_charge: Optional[float] = None
    distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None


class DeliveryBatchUpdate(BaseModel):
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    order_ids: Optional[List[str]] = None
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None


class DeliveryBatchStatusUpdate(BaseModel):
    status: str


class DeliveryBatchResponse(BaseModel):
    id: str
    order_ids: List[str]
    pickup_location: str
    delivery_location: Optional[str] = None
    delivery_stops: List[str]
    total_quantity: int
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    transportation_charge: Optional[float] = None
    distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PickupOTPGenerateResponse(BaseModel):
    batch_id: str
    message: str
    demo_otp: str
    expires_at: datetime


class PickupOTPVerifyRequest(BaseModel):
    otp: str


class PickupOTPVerifyResponse(BaseModel):
    batch_id: str
    status: str
    message: str
    picked_up_at: datetime


class BatchDeliveryOTPVerifyRequest(BaseModel):
    otp: str
    order_id: Optional[str] = None


class BatchDeliveryOTPVerifyResponse(BaseModel):
    batch_id: str
    status: str
    message: str
    delivered_at: datetime
    driver_payout_status: str



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


# Mandi Price & Controlled Pricing Schemas
class MandiPriceResponse(BaseModel):
    id: str
    commodity: str
    market: str
    state: str
    district: Optional[str] = None
    variety: Optional[str] = None
    grade: Optional[str] = None
    price_date: str
    unit: str
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    modal_price: float
    price_per_kg: float
    source: str
    source_resource_id: str
    fetched_at: datetime

    class Config:
        from_attributes = True


class MandiReferenceResponse(BaseModel):
    commodity: str
    market: str
    state: str
    district: Optional[str] = None
    variety: Optional[str] = None
    grade: Optional[str] = None
    price_date: str
    modal_price: float
    price_per_kg: float
    unit: str
    price_type_used: str  # "modal_price"
    source: str
    status: str  # "live" | "stale" | "demo"
    max_markup_percent: float
    max_allowed_price: float
    freshness_hours: Optional[float] = None
    explanation: str


class MandiSyncStatusResponse(BaseModel):
    last_successful_sync: Optional[datetime] = None
    last_attempted_sync: Optional[datetime] = None
    records_stored: int
    last_sync_status: str  # "success" | "failed" | "idle" | "in_progress"
    is_stale: bool
    stale_after_hours: int
    sync_interval_hours: int
    has_api_key: bool
    message: str


class MandiSyncTriggerResponse(BaseModel):
    message: str
    records_fetched: int
    records_inserted: int
    status: str


# Matching Schemas (Phase 8)
class MatchingSearchRequest(BaseModel):
    commodity: str
    quantity: float = Field(..., gt=0, description="Required quantity in specified unit")
    unit: str = Field("kg", description="Unit of measurement (e.g. kg, quintal)")
    max_price: Optional[float] = Field(None, gt=0, description="Buyer's target maximum price per unit")
    delivery_location: Optional[str] = Field(None, description="Buyer delivery hub / location")
    required_by_days: Optional[int] = Field(None, ge=1, le=30, description="Required delivery window in days")
    min_quality_score: Optional[float] = Field(None, ge=0.0, le=5.0, description="Optional minimum quality score threshold")
    preferred_variety: Optional[str] = Field(None, description="Optional crop variety preference")


class MatchingScoreBreakdown(BaseModel):
    commodity: float
    quantity: float
    price: float
    location: float
    delivery: float
    quality: float
    total: float


class MatchingResultItem(BaseModel):
    product_id: str
    farmer_id: str
    farmer_name: str
    commodity: str
    category: str
    available_quantity: float
    requested_quantity: float
    fulfillable_quantity: float
    unit: str
    farmer_price: float
    buyer_max_price: Optional[float] = None
    mandi_reference_price: Optional[float] = None
    mandi_status: str  # "live" | "stale" | "demo" | "unknown"
    max_allowed_price: Optional[float] = None
    match_score: int  # Rounded 0 - 100
    match_score_raw: float  # Exact float score
    fulfillment: str  # "full" | "partial" | "none"
    location: str
    delivery_location: Optional[str] = None
    distance_km: Optional[float] = None
    estimated_transportation_charge: Optional[float] = None
    quality_score: float
    verified: bool
    score_breakdown: MatchingScoreBreakdown
    explanation: List[str]
    image: Optional[str] = None


class MatchingSearchResponse(BaseModel):
    matches: List[MatchingResultItem]
    total_candidates_evaluated: int
    buyer_requirements: MatchingSearchRequest
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Phase 10: Crop Quality Visual Grading Schemas
# ============================================================================

class CropQualityFactorScores(BaseModel):
    freshness: float = Field(..., ge=0, le=20, description="Freshness / Turgidity (max 20)")
    color_appearance: float = Field(..., ge=0, le=15, description="Color & Surface Appearance (max 15)")
    physical_damage: float = Field(..., ge=0, le=15, description="Physical Damage / Blemishes (max 15)")
    disease_spots: float = Field(..., ge=0, le=15, description="Disease / Visible Spots (max 15)")
    pest_damage: float = Field(..., ge=0, le=10, description="Pest Damage / Borer Marks (max 10)")
    size_uniformity: float = Field(..., ge=0, le=10, description="Size & Dimensional Uniformity (max 10)")
    rot_decay: float = Field(..., ge=0, le=10, description="Rot / Decay (max 10)")
    cleanliness: float = Field(..., ge=0, le=5, description="Cleanliness / Surface Debris (max 5)")


class CropQualityResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    farmer_id: Optional[str] = None
    image_url: Optional[str] = None
    crop: str
    total_score: float = Field(..., ge=0, le=100, description="Total visual quality score out of 100")
    grade: str = Field(..., description="Grade: A+, A, B, C, or D")
    confidence: Optional[float] = Field(None, description="Model prediction confidence (0.0 - 1.0)")
    model_name: Optional[str] = Field(None, description="Active computer vision model name")
    model_version: Optional[str] = Field(None, description="Active model version")
    provider: Optional[str] = Field(None, description="Quality grading provider")
    factor_scores: CropQualityFactorScores
    detected_issues: List[str]
    recommendation: Optional[str] = None
    analysis_mode: str = Field("demo", description="'ai' or 'demo'")
    created_at: datetime

    class Config:
        from_attributes = True


class CropQualityStatusResponse(BaseModel):
    ai_available: bool
    model_name: str
    model_version: str
    provider: str
    supported_crops: List[str]
    demo_fallback_available: bool


