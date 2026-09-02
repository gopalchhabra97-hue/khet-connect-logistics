from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, func, ForeignKey
from datetime import datetime
from ..db.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # Vegetables, Fruits, Grains, Pulses
    quantity = Column(Integer, nullable=False)
    unit = Column(String(50), nullable=False)
    price = Column(Float, nullable=False)
    location = Column(String(255), nullable=False, index=True)
    seller_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    seller_name = Column(String(255), nullable=True)
    available = Column(Boolean, default=True, index=True)
    harvest_date = Column(String(50), nullable=True)
    verified = Column(Boolean, default=False)
    image = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Product(id={self.id}, name={self.name}, seller_id={self.seller_id})>"
