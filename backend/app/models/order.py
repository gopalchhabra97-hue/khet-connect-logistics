from sqlalchemy import Column, String, Integer, Float, Numeric, DateTime, func, ForeignKey
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

    # Settlement and Payment lifecycle fields (Numeric for monetary accuracy)
    product_subtotal = Column(Numeric(12, 2), nullable=True)
    advance_percentage = Column(Numeric(5, 2), default=30.0, nullable=True)
    advance_amount = Column(Numeric(12, 2), nullable=True)
    advance_payment_status = Column(String(50), default="unpaid", nullable=True)  # unpaid, paid
    remaining_product_amount = Column(Numeric(12, 2), nullable=True)
    remaining_payment_status = Column(String(50), default="unpaid", nullable=True)  # unpaid, paid
    transportation_charge = Column(Numeric(12, 2), nullable=True)
    total_payable_amount = Column(Numeric(12, 2), nullable=True)
    payment_status = Column(String(50), default="pending", nullable=True)  # pending, advance_paid, fully_paid

    # Delivery verification via OTP
    delivery_otp = Column(String(10), nullable=True)
    delivery_otp_expires_at = Column(DateTime, nullable=True)
    delivery_otp_attempts = Column(Integer, default=0, nullable=True)
    delivery_confirmed_at = Column(DateTime, nullable=True)
    assigned_driver_id = Column(String(50), ForeignKey("drivers.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Order(id={self.id}, buyer_id={self.buyer_id}, status={self.status}, payment_status={self.payment_status})>"


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


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(50), primary_key=True, index=True)
    order_id = Column(String(50), ForeignKey("orders.id"), nullable=False, index=True)
    buyer_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    payment_type = Column(String(50), nullable=False)  # 'advance' or 'final'
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(50), default="paid", nullable=False)  # 'pending', 'paid', 'failed'
    payment_method = Column(String(50), default="simulated", nullable=False)
    transaction_reference = Column(String(100), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    paid_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Payment(id={self.id}, order_id={self.order_id}, type={self.payment_type}, amount={self.amount})>"


class DriverPayout(Base):
    __tablename__ = "driver_payouts"

    id = Column(String(50), primary_key=True, index=True)
    order_id = Column(String(50), ForeignKey("orders.id"), nullable=False, index=True)
    driver_id = Column(String(50), ForeignKey("drivers.id"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(50), default="payable", nullable=False)  # 'pending', 'payable', 'paid'
    transaction_reference = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    paid_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<DriverPayout(id={self.id}, driver_id={self.driver_id}, amount={self.amount}, status={self.status})>"
