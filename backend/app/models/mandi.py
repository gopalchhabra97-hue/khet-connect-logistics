"""SQLAlchemy Model for Government data.gov.in Mandi Prices."""

from sqlalchemy import Column, String, Numeric, DateTime, func, Index
from ..db.base import Base


class MandiPrice(Base):
    __tablename__ = "mandi_prices"

    id = Column(String(50), primary_key=True, index=True)
    commodity = Column(String(100), nullable=False, index=True)
    market = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=True)
    variety = Column(String(100), nullable=True)
    grade = Column(String(50), nullable=True)
    price_date = Column(String(50), nullable=False, index=True)
    unit = Column(String(50), default="Rs/Quintal", nullable=False)

    min_price = Column(Numeric(10, 2), nullable=True)
    max_price = Column(Numeric(10, 2), nullable=True)
    modal_price = Column(Numeric(10, 2), nullable=False)
    price_per_kg = Column(Numeric(10, 2), nullable=False)

    source = Column(String(100), default="data.gov.in - Agmarknet", nullable=False)
    source_resource_id = Column(String(100), default="9ef84268-d588-465a-a308-a864a43d0070", nullable=False)
    record_hash = Column(String(64), unique=True, index=True, nullable=False)

    fetched_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_mandi_commodity_market_date", "commodity", "market", "price_date"),
        Index("ix_mandi_commodity_state_date", "commodity", "state", "price_date"),
    )

    def __repr__(self):
        return (
            f"<MandiPrice(commodity={self.commodity}, market={self.market}, "
            f"date={self.price_date}, modal={self.modal_price}, per_kg={self.price_per_kg})>"
        )
