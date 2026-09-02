from sqlalchemy import Column, String, Integer, Float, DateTime, func, ForeignKey, JSON
from datetime import datetime
from ..db.base import Base


class DeliveryBatch(Base):
    __tablename__ = "delivery_batches"

    id = Column(String(50), primary_key=True, index=True)
    order_ids = Column(JSON, nullable=False)  # Array of order IDs
    pickup_location = Column(String(255), nullable=False, index=True)
    delivery_stops = Column(JSON, nullable=False)  # Array of delivery locations
    total_quantity = Column(Integer, nullable=False)
    vehicle_id = Column(String(50), ForeignKey("vehicles.id"), nullable=True)
    driver_id = Column(String(50), ForeignKey("drivers.id"), nullable=True)
    status = Column(String(50), nullable=False, index=True)  # Planned, Assigned, Picked Up, In Transit, Delivered
    distance_km = Column(Float, nullable=True)
    eta_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<DeliveryBatch(id={self.id}, status={self.status})>"
