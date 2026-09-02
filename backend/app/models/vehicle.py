from sqlalchemy import Column, String, Integer, DateTime, func
from datetime import datetime
from ..db.base import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    registration = Column(String(50), unique=True, nullable=False, index=True)
    capacity = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, index=True)  # Available, Unavailable, On Route
    base_location = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Vehicle(id={self.id}, registration={self.registration})>"
