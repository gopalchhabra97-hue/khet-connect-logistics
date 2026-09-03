"""Vehicles router: fleet vehicle CRUD operations with RBAC."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.database import get_db_session
from app.models.batch import DeliveryBatch
from app.models.driver import Driver
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas import VehicleCreate, VehicleResponse, VehicleUpdate

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("", response_model=List[VehicleResponse])
def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status"),
    base_location: Optional[str] = None,
    min_capacity: Optional[int] = None,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List all fleet vehicles with optional filtering (requires authenticated user)."""
    query = db.query(Vehicle)

    if status_filter:
        query = query.filter(Vehicle.status.ilike(status_filter))
    if base_location:
        query = query.filter(Vehicle.base_location.ilike(f"%{base_location}%"))
    if min_capacity is not None:
        query = query.filter(Vehicle.capacity >= min_capacity)

    return query.order_by(Vehicle.created_at.desc()).all()


@router.get("/{id}", response_model=VehicleResponse)
def get_vehicle(
    id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get single vehicle by ID (requires authenticated user)."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{id}' not found",
        )
    return vehicle


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Add a new vehicle to the fleet (Admin only)."""
    if payload.capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle capacity must be greater than zero",
        )

    # Check for duplicate registration
    existing_reg = db.query(Vehicle).filter(Vehicle.registration.ilike(payload.registration.strip())).first()
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration '{payload.registration}' already exists",
        )

    vehicle_id = payload.id or f"V-{uuid.uuid4().hex[:6].upper()}"

    vehicle = Vehicle(
        id=vehicle_id,
        name=payload.name.strip(),
        registration=payload.registration.strip().upper(),
        capacity=payload.capacity,
        status=payload.status or "Available",
        base_location=payload.base_location.strip(),
    )

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch("/{id}", response_model=VehicleResponse)
def update_vehicle(
    id: str,
    payload: VehicleUpdate,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Update vehicle details (Admin only)."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{id}' not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    if "capacity" in update_data and update_data["capacity"] is not None:
        if update_data["capacity"] <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle capacity must be greater than zero",
            )

    if "registration" in update_data and update_data["registration"] is not None:
        reg = update_data["registration"].strip().upper()
        conflict = db.query(Vehicle).filter(Vehicle.registration == reg, Vehicle.id != id).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle registration '{reg}' is already in use",
            )
        update_data["registration"] = reg

    for key, value in update_data.items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/{id}")
def delete_vehicle(
    id: str,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Delete a vehicle from the fleet (Admin only)."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{id}' not found",
        )

    # Check for assigned driver
    assigned_driver = db.query(Driver).filter(Driver.vehicle_id == id).first()
    if assigned_driver:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete vehicle: currently assigned to driver '{assigned_driver.name}' ({assigned_driver.id})",
        )

    # Check for linked delivery batches
    linked_batch = db.query(DeliveryBatch).filter(DeliveryBatch.vehicle_id == id).first()
    if linked_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete vehicle: referenced by delivery batch '{linked_batch.id}'",
        )

    db.delete(vehicle)
    db.commit()
    return {"status": "success", "message": f"Vehicle '{id}' deleted successfully"}
