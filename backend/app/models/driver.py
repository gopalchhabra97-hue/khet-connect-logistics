from sqlalchemy import Column, String, DateTime, func, ForeignKey
from datetime import datetime
from ..db.base import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    license = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)  # Available, Assigned, On Route
    base_location = Column(String(255), nullable=False)
    vehicle_id = Column(String(50), ForeignKey("vehicles.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Driver(id={self.id}, name={self.name}, license={self.license})>"
