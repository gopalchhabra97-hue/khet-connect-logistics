from sqlalchemy import Column, String, Integer, Float, Numeric, DateTime, func, ForeignKey, JSON
from datetime import datetime
from ..db.base import Base


class DeliveryBatch(Base):
    __tablename__ = "delivery_batches"

    id = Column(String(50), primary_key=True, index=True)
    order_ids = Column(JSON, nullable=False)  # Array of order IDs
    pickup_location = Column(String(255), nullable=False, index=True)
    delivery_location = Column(String(255), nullable=True)  # Primary/combined destination
    delivery_stops = Column(JSON, nullable=False)  # Array of delivery locations
    total_quantity = Column(Integer, nullable=False)
    vehicle_id = Column(String(50), ForeignKey("vehicles.id"), nullable=True)
    driver_id = Column(String(50), ForeignKey("drivers.id"), nullable=True)
    status = Column(String(50), nullable=False, index=True)  # Planned, Assigned, Pickup, Picked Up, In Transit, Out for Delivery, Delivered
    scheduled_at = Column(DateTime, nullable=True)
    transportation_charge = Column(Numeric(12, 2), nullable=True)
    distance_km = Column(Float, nullable=True)
    eta_minutes = Column(Integer, nullable=True)

    # Pickup OTP verification workflow
    pickup_otp = Column(String(10), nullable=True)
    pickup_otp_expires_at = Column(DateTime, nullable=True)
    pickup_otp_attempts = Column(Integer, default=0, nullable=True)
    picked_up_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<DeliveryBatch(id={self.id}, status={self.status})>"

