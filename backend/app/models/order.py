from sqlalchemy import Column, String, Integer, Float, DateTime, func, ForeignKey
from datetime import datetime
from ..db.base import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(50), primary_key=True, index=True)
    buyer_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    buyer_name = Column(String(255), nullable=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    product_name = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit = Column(String(50), nullable=False)
    price_per_unit = Column(Float, nullable=False)
    pickup_location = Column(String(255), nullable=False, index=True)
    delivery_location = Column(String(255), nullable=False, index=True)
    order_date = Column(String(50), nullable=False)
    expected_delivery = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, index=True)  # Pending, Accepted, Rejected, Preparing, In Transit, Delivered
    batch_id = Column(String(50), ForeignKey("delivery_batches.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Order(id={self.id}, buyer_id={self.buyer_id}, status={self.status})>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(50), primary_key=True, index=True)
    order_id = Column(String(50), ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit = Column(String(50), nullable=False)
    price_per_unit = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<OrderItem(id={self.id}, order_id={self.order_id})>"
