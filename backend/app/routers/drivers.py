"""Drivers router: fleet driver CRUD operations with RBAC."""

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
from app.schemas import DriverCreate, DriverResponse, DriverUpdate

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get("", response_model=List[DriverResponse])
def list_drivers(
    status_filter: Optional[str] = Query(None, alias="status"),
    base_location: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List all fleet drivers with optional filtering (requires authenticated user)."""
    query = db.query(Driver)

    if status_filter:
        query = query.filter(Driver.status.ilike(status_filter))
    if base_location:
        query = query.filter(Driver.base_location.ilike(f"%{base_location}%"))
    if vehicle_id:
        query = query.filter(Driver.vehicle_id == vehicle_id)

    return query.order_by(Driver.created_at.desc()).all()


@router.get("/{id}", response_model=DriverResponse)
def get_driver(
    id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get single driver by ID (requires authenticated user)."""
    driver = db.query(Driver).filter(Driver.id == id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver with ID '{id}' not found",
        )
    return driver


@router.post("", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    payload: DriverCreate,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Register a new driver in the fleet (Admin only)."""
    # Check duplicate license
    existing_license = db.query(Driver).filter(Driver.license.ilike(payload.license.strip())).first()
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with license '{payload.license}' already exists",
        )

    # Validate referenced vehicle if provided
    if payload.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referenced vehicle '{payload.vehicle_id}' not found",
            )
        assigned_other = db.query(Driver).filter(Driver.vehicle_id == payload.vehicle_id).first()
        if assigned_other:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle '{payload.vehicle_id}' is already assigned to driver '{assigned_other.name}'",
            )

    driver_id = payload.id or f"D-{uuid.uuid4().hex[:6].upper()}"

    driver = Driver(
        id=driver_id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        license=payload.license.strip().upper(),
        status=payload.status or "Available",
        base_location=payload.base_location.strip(),
        vehicle_id=payload.vehicle_id,
    )

    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.patch("/{id}", response_model=DriverResponse)
def update_driver(
    id: str,
    payload: DriverUpdate,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Update driver details (Admin only)."""
    driver = db.query(Driver).filter(Driver.id == id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver with ID '{id}' not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    if "license" in update_data and update_data["license"] is not None:
        lic = update_data["license"].strip().upper()
        conflict = db.query(Driver).filter(Driver.license == lic, Driver.id != id).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"License '{lic}' is already registered to another driver",
            )
        update_data["license"] = lic

    if "vehicle_id" in update_data and update_data["vehicle_id"] is not None:
        v_id = update_data["vehicle_id"]
        vehicle = db.query(Vehicle).filter(Vehicle.id == v_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referenced vehicle '{v_id}' not found",
            )
        assigned_other = db.query(Driver).filter(Driver.vehicle_id == v_id, Driver.id != id).first()
        if assigned_other:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle '{v_id}' is already assigned to driver '{assigned_other.name}'",
            )

    for key, value in update_data.items():
        setattr(driver, key, value)

    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/{id}")
def delete_driver(
    id: str,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Delete a driver from the fleet (Admin only)."""
    driver = db.query(Driver).filter(Driver.id == id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver with ID '{id}' not found",
        )

    # Check for linked delivery batches
    linked_batch = db.query(DeliveryBatch).filter(DeliveryBatch.driver_id == id).first()
    if linked_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete driver: referenced by delivery batch '{linked_batch.id}'",
        )

    db.delete(driver)
    db.commit()
    return {"status": "success", "message": f"Driver '{id}' deleted successfully"}
