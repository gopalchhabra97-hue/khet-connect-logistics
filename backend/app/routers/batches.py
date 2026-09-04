"""Delivery Batches Router: Admin batching, vehicle/driver assignment, OTP verification, and driver tracking."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.database import get_db_session
from app.models.batch import DeliveryBatch
from app.models.driver import Driver
from app.models.order import DriverPayout, Order
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas import (
    BatchDeliveryOTPVerifyRequest,
    BatchDeliveryOTPVerifyResponse,
    DeliveryBatchCreate,
    DeliveryBatchResponse,
    DeliveryBatchStatusUpdate,
    DeliveryBatchUpdate,
    OrderResponse,
    PickupOTPGenerateResponse,
    PickupOTPVerifyRequest,
    PickupOTPVerifyResponse,
)
from app.services.otp_service import (
    generate_delivery_otp,
    generate_pickup_otp,
    verify_delivery_otp,
    verify_pickup_otp,
)
from app.services.transportation_service import (
    DISTANCE_MATRIX,
    calculate_transportation_charge,
)

router = APIRouter(prefix="/delivery-batches", tags=["Delivery Batches"])

VALID_BATCH_STATUSES = [
    "Planned",
    "Assigned",
    "Pickup",
    "Picked Up",
    "In Transit",
    "Out for Delivery",
    "Delivered",
]

# Valid state machine transitions
ALLOWED_TRANSITIONS = {
    "Planned": ["Assigned", "Cancelled"],
    "Assigned": ["Pickup", "Picked Up", "Cancelled"],
    "Pickup": ["Picked Up", "Assigned"],
    "Picked Up": ["In Transit"],
    "In Transit": ["Out for Delivery", "Delivered"],
    "Out for Delivery": ["Delivered"],
    "Delivered": [],
    "Cancelled": [],
}


def compute_route_distance(pickup: str, stops: List[str]) -> float:
    """Calculates route distance across multi-stop corridor using the regional distance matrix."""
    if not stops:
        return 60.0
    total = 0.0
    current = pickup.strip().title() if pickup else "Patiala"
    for stop in stops:
        stop_clean = stop.strip().title() if stop else "Chandigarh"
        dist = DISTANCE_MATRIX.get(current, {}).get(stop_clean)
        if dist is None:
            dist = DISTANCE_MATRIX.get(stop_clean, {}).get(current, 60.0)
        total += dist
        current = stop_clean
    return max(total, 25.0)


# ---------------- Endpoints ---------------- #


@router.get("/eligible-orders", response_model=List[OrderResponse])
def list_eligible_orders(
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Admin only: List all accepted/ready orders eligible for delivery batch consolidation."""
    eligible_statuses = ["Accepted", "Ready for Delivery", "Preparing"]
    orders = (
        db.query(Order)
        .filter(Order.status.in_(eligible_statuses), Order.batch_id.is_(None))
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders


@router.get("", response_model=List[DeliveryBatchResponse])
def list_delivery_batches(
    status_filter: Optional[str] = Query(None, alias="status"),
    driver_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    pickup_location: Optional[str] = None,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List delivery batches with role-based visibility.

    - Admin: can see all batches, filterable by status, driver, vehicle, location.
    - Driver: strictly restricted to batches assigned to them.
    - Others: restricted.
    """
    query = db.query(DeliveryBatch)

    if current_user.role == "driver":
        # Driver can ONLY see batches assigned to their driver ID
        query = query.filter(DeliveryBatch.driver_id == current_user.id)
    elif current_user.role != "admin":
        # Other authenticated non-admin users (farmer/buyer)
        # Find orders belonging to this user
        user_orders = db.query(Order.batch_id).filter(
            (Order.buyer_id == current_user.id)
        ).all()
        batch_ids = [b[0] for b in user_orders if b[0]]
        query = query.filter(DeliveryBatch.id.in_(batch_ids))

    if status_filter:
        query = query.filter(DeliveryBatch.status.ilike(status_filter.strip()))
    if driver_id:
        if current_user.role == "driver" and driver_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drivers can only view their own assigned batches",
            )
        query = query.filter(DeliveryBatch.driver_id == driver_id)
    if vehicle_id:
        query = query.filter(DeliveryBatch.vehicle_id == vehicle_id)
    if pickup_location:
        query = query.filter(DeliveryBatch.pickup_location.ilike(f"%{pickup_location.strip()}%"))

    return query.order_by(DeliveryBatch.created_at.desc()).all()


@router.get("/{id}", response_model=DeliveryBatchResponse)
def get_delivery_batch(
    id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get single delivery batch by ID with role-based access control."""
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery batch with ID '{id}' not found",
        )

    # Driver role isolation
    if current_user.role == "driver" and batch.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this delivery batch. Access restricted to assigned driver.",
        )

    return batch


@router.post("", response_model=DeliveryBatchResponse, status_code=status.HTTP_201_CREATED)
def create_delivery_batch(
    payload: DeliveryBatchCreate,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Admin only: Create and consolidate orders into a new Delivery Batch."""
    if not payload.order_ids or len(payload.order_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one order ID must be provided to create a delivery batch.",
        )

    # Check orders existence & eligibility
    orders = db.query(Order).filter(Order.id.in_(payload.order_ids)).all()
    found_ids = {o.id for o in orders}
    missing_ids = set(payload.order_ids) - found_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orders not found: {', '.join(sorted(missing_ids))}",
        )

    for order in orders:
        if order.status in ["Rejected", "Delivered", "Cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order '{order.id}' is in status '{order.status}' and cannot be batched for delivery.",
            )
        if order.batch_id:
            existing_batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == order.batch_id).first()
            if existing_batch and existing_batch.status not in ["Delivered", "Cancelled"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Order '{order.id}' is already assigned to active delivery batch '{order.batch_id}'.",
                )

    # Validate Driver assignment
    if payload.driver_id:
        driver = db.query(Driver).filter(Driver.id == payload.driver_id).first()
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Driver with ID '{payload.driver_id}' not found",
            )
        # Check conflicting active batches for this driver
        active_driver_batch = (
            db.query(DeliveryBatch)
            .filter(
                DeliveryBatch.driver_id == payload.driver_id,
                ~DeliveryBatch.status.in_(["Delivered", "Cancelled"]),
            )
            .first()
        )
        if active_driver_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver '{driver.name}' ({payload.driver_id}) is already assigned to active batch '{active_driver_batch.id}'. Conflicting active assignment rejected.",
            )

    # Validate Vehicle assignment
    if payload.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{payload.vehicle_id}' not found",
            )
        # Check conflicting active batches for this vehicle
        active_vehicle_batch = (
            db.query(DeliveryBatch)
            .filter(
                DeliveryBatch.vehicle_id == payload.vehicle_id,
                ~DeliveryBatch.status.in_(["Delivered", "Cancelled"]),
            )
            .first()
        )
        if active_vehicle_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle '{vehicle.name}' ({payload.vehicle_id}) is already assigned to active batch '{active_vehicle_batch.id}'. Conflicting active assignment rejected.",
            )

    # Derive cargo attributes
    total_qty = sum(o.quantity for o in orders)
    pickup_loc = payload.pickup_location or orders[0].pickup_location
    stops = payload.delivery_stops or list(dict.fromkeys(o.delivery_location for o in orders))
    delivery_loc = payload.delivery_location or (", ".join(stops) if stops else "Destination")

    # Check vehicle capacity if vehicle assigned
    if payload.vehicle_id and vehicle:
        if vehicle.capacity < total_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle '{vehicle.name}' capacity ({vehicle.capacity} kg) is insufficient for cargo load ({total_qty} kg).",
            )

    # Calculate distance and freight charge using Phase 6 calculation
    distance_km = payload.distance_km or compute_route_distance(pickup_loc, stops)
    eta_mins = payload.eta_minutes or (int(distance_km * 1.35) + len(stops) * 15)

    if payload.transportation_charge is not None:
        trans_charge = payload.transportation_charge
    else:
        primary_dest = stops[0] if stops else "Chandigarh"
        _, _, calc_charge, _ = calculate_transportation_charge(pickup_loc, primary_dest, float(total_qty))
        # If multi-stop route is longer, adjust proportionally
        trans_charge = max(calc_charge, round(distance_km * 12.0, 2))

    batch_id = payload.id or f"#DB-{uuid.uuid4().hex[:6].upper()}"
    existing = db.query(DeliveryBatch).filter(DeliveryBatch.id == batch_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery batch with ID '{batch_id}' already exists",
        )

    initial_status = payload.status or ("Assigned" if (payload.driver_id and payload.vehicle_id) else "Planned")

    batch = DeliveryBatch(
        id=batch_id,
        order_ids=payload.order_ids,
        pickup_location=pickup_loc,
        delivery_location=delivery_loc,
        delivery_stops=stops,
        total_quantity=total_qty,
        vehicle_id=payload.vehicle_id,
        driver_id=payload.driver_id,
        status=initial_status,
        scheduled_at=payload.scheduled_at or datetime.now(timezone.utc),
        transportation_charge=trans_charge,
        distance_km=distance_km,
        eta_minutes=eta_mins,
    )
    db.add(batch)

    # Link orders and update settlement/driver states
    for order in orders:
        order.batch_id = batch_id
        if payload.driver_id:
            order.assigned_driver_id = payload.driver_id
        order.status = "Ready for Delivery" if initial_status in ["Planned", "Assigned"] else initial_status

    # Update driver & vehicle statuses if assigned
    if payload.driver_id:
        driver = db.query(Driver).filter(Driver.id == payload.driver_id).first()
        if driver:
            driver.status = "Assigned"
            if payload.vehicle_id:
                driver.vehicle_id = payload.vehicle_id

    if payload.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
        if vehicle:
            vehicle.status = "On Route"

    db.commit()
    db.refresh(batch)
    return batch


@router.patch("/{id}", response_model=DeliveryBatchResponse)
def update_delivery_batch(
    id: str,
    payload: DeliveryBatchUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update delivery batch details, driver/vehicle assignment, or delivery progress."""
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery batch with ID '{id}' not found",
        )

    is_admin = current_user.role == "admin"
    is_assigned_driver = current_user.role == "driver" and batch.driver_id == current_user.id

    if not is_admin and not is_assigned_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an administrator or the assigned driver can update this delivery batch.",
        )

    # Driver boundary checks: Driver can ONLY update status
    update_data = payload.model_dump(exclude_unset=True)

    if not is_admin:
        disallowed_fields = ["driver_id", "vehicle_id", "order_ids", "pickup_location", "delivery_location"]
        for field in disallowed_fields:
            if field in update_data and update_data[field] is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Drivers are not permitted to modify '{field}'. Only administrators can assign drivers or vehicles.",
                )

    # Status transition rules
    if "status" in update_data and update_data["status"] is not None:
        target_status = update_data["status"].strip()
        matched_status = next((s for s in VALID_BATCH_STATUSES if s.lower() == target_status.lower()), None)
        if not matched_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid batch status '{target_status}'. Allowed values: {', '.join(VALID_BATCH_STATUSES)}",
            )

        current_status = batch.status
        allowed_next = ALLOWED_TRANSITIONS.get(current_status, [])

        if matched_status != current_status and matched_status not in allowed_next and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid status transition from '{current_status}' to '{matched_status}'. "
                    f"Allowed transitions from '{current_status}': {', '.join(allowed_next) or 'None'}."
                ),
            )

        # Enforce OTP verification requirement for custody changes
        if matched_status == "Picked Up" and current_status != "Picked Up":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Advancing to 'Picked Up' requires valid Pickup OTP verification. Use POST /delivery-batches/{id}/pickup-otp/verify.",
            )

        if matched_status == "Delivered" and current_status != "Delivered":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Advancing to 'Delivered' requires valid Delivery OTP verification. Use POST /delivery-batches/{id}/delivery-otp/verify.",
            )

        batch.status = matched_status
        # Sync orders
        orders = db.query(Order).filter(Order.id.in_(batch.order_ids)).all()
        for o in orders:
            o.status = matched_status

    # Admin: Driver assignment/reassignment
    if is_admin and "driver_id" in update_data:
        new_driver_id = update_data["driver_id"]
        if new_driver_id:
            driver = db.query(Driver).filter(Driver.id == new_driver_id).first()
            if not driver:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Driver with ID '{new_driver_id}' not found",
                )
            # Check conflicting active batch
            active_batch = (
                db.query(DeliveryBatch)
                .filter(
                    DeliveryBatch.driver_id == new_driver_id,
                    DeliveryBatch.id != batch.id,
                    ~DeliveryBatch.status.in_(["Delivered", "Cancelled"]),
                )
                .first()
            )
            if active_batch:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Driver '{driver.name}' ({new_driver_id}) is already assigned to active batch '{active_batch.id}'.",
                )

            # Free old driver if different
            if batch.driver_id and batch.driver_id != new_driver_id:
                old_driver = db.query(Driver).filter(Driver.id == batch.driver_id).first()
                if old_driver:
                    old_driver.status = "Available"

            batch.driver_id = new_driver_id
            driver.status = "Assigned"

            # Sync orders
            orders = db.query(Order).filter(Order.id.in_(batch.order_ids)).all()
            for o in orders:
                o.assigned_driver_id = new_driver_id
        else:
            # Unassign driver
            if batch.driver_id:
                old_driver = db.query(Driver).filter(Driver.id == batch.driver_id).first()
                if old_driver:
                    old_driver.status = "Available"
            batch.driver_id = None

    # Admin: Vehicle assignment/reassignment
    if is_admin and "vehicle_id" in update_data:
        new_vehicle_id = update_data["vehicle_id"]
        if new_vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.id == new_vehicle_id).first()
            if not vehicle:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Vehicle with ID '{new_vehicle_id}' not found",
                )
            active_batch = (
                db.query(DeliveryBatch)
                .filter(
                    DeliveryBatch.vehicle_id == new_vehicle_id,
                    DeliveryBatch.id != batch.id,
                    ~DeliveryBatch.status.in_(["Delivered", "Cancelled"]),
                )
                .first()
            )
            if active_batch:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vehicle '{vehicle.name}' ({new_vehicle_id}) is already assigned to active batch '{active_batch.id}'.",
                )

            # Capacity check
            if vehicle.capacity < batch.total_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vehicle '{vehicle.name}' capacity ({vehicle.capacity} kg) is insufficient for batch load ({batch.total_quantity} kg).",
                )

            # Free old vehicle
            if batch.vehicle_id and batch.vehicle_id != new_vehicle_id:
                old_v = db.query(Vehicle).filter(Vehicle.id == batch.vehicle_id).first()
                if old_v:
                    old_v.status = "Available"

            batch.vehicle_id = new_vehicle_id
            vehicle.status = "On Route"
        else:
            if batch.vehicle_id:
                old_v = db.query(Vehicle).filter(Vehicle.id == batch.vehicle_id).first()
                if old_v:
                    old_v.status = "Available"
            batch.vehicle_id = None

    if "scheduled_at" in update_data and update_data["scheduled_at"] is not None:
        batch.scheduled_at = update_data["scheduled_at"]

    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{id}")
def delete_delivery_batch(
    id: str,
    db: Session = Depends(get_db_session),
    admin: User = Depends(require_role("admin")),
):
    """Admin only: Delete or unassign a delivery batch."""
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery batch with ID '{id}' not found",
        )

    if batch.status in ["In Transit", "Out for Delivery", "Delivered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete batch '{id}' in status '{batch.status}'. Only Planned or Assigned batches can be deleted.",
        )

    # Unlink orders
    orders = db.query(Order).filter(Order.id.in_(batch.order_ids)).all()
    for o in orders:
        o.batch_id = None
        o.assigned_driver_id = None
        o.status = "Accepted"

    # Free up driver and vehicle
    if batch.driver_id:
        driver = db.query(Driver).filter(Driver.id == batch.driver_id).first()
        if driver:
            driver.status = "Available"

    if batch.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == batch.vehicle_id).first()
        if vehicle:
            vehicle.status = "Available"

    db.delete(batch)
    db.commit()
    return {"status": "success", "message": f"Delivery batch '{id}' deleted and orders unlinked successfully"}


# ---------------- OTP Verification Endpoints ---------------- #


@router.post("/{id}/pickup-otp/generate", response_model=PickupOTPGenerateResponse)
def generate_batch_pickup_otp(
    id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Generates a secure 6-digit pickup OTP for the delivery batch."""
    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery batch '{id}' not found",
        )

    # Admin, assigned driver, or authorized personnel can request OTP generation
    if current_user.role == "driver" and batch.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to assigned driver or administrator.",
        )

    otp_code, expires_at = generate_pickup_otp()
    batch.pickup_otp = otp_code
    batch.pickup_otp_expires_at = expires_at
    batch.pickup_otp_attempts = 0

    db.commit()

    return PickupOTPGenerateResponse(
        batch_id=batch.id,
        message="Pickup OTP generated. Mandi/farmer provides this code to the driver upon loading cargo.",
        demo_otp=otp_code,
        expires_at=expires_at,
    )


@router.post("/{id}/pickup-otp/verify", response_model=PickupOTPVerifyResponse)
def verify_batch_pickup_otp(
    id: str,
    payload: PickupOTPVerifyRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Driver or Admin verifies the 6-digit pickup OTP entered at cargo loading."""
    if current_user.role not in ["driver", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned drivers or administrators can verify pickup OTP.",
        )

    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery batch '{id}' not found",
        )

    if current_user.role == "driver" and batch.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the assigned driver for this delivery batch.",
        )

    if batch.status == "Delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch has already been delivered.",
        )

    # Validate OTP
    is_valid, msg = verify_pickup_otp(
        entered_otp=payload.otp,
        stored_otp=batch.pickup_otp,
        expires_at=batch.pickup_otp_expires_at,
        current_attempts=batch.pickup_otp_attempts or 0,
    )

    if not is_valid:
        batch.pickup_otp_attempts = (batch.pickup_otp_attempts or 0) + 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    # Transition to Picked Up
    batch.status = "Picked Up"
    batch.picked_up_at = datetime.now(timezone.utc)

    # Update driver and vehicle states
    if batch.driver_id:
        driver = db.query(Driver).filter(Driver.id == batch.driver_id).first()
        if driver:
            driver.status = "On Route"

    if batch.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == batch.vehicle_id).first()
        if vehicle:
            vehicle.status = "On Route"

    # Sync orders
    orders = db.query(Order).filter(Order.id.in_(batch.order_ids)).all()
    for o in orders:
        o.status = "Picked Up"

    db.commit()
    db.refresh(batch)

    return PickupOTPVerifyResponse(
        batch_id=batch.id,
        status=batch.status,
        message="Pickup OTP verified successfully. Batch marked as Picked Up.",
        picked_up_at=batch.picked_up_at,
    )


@router.post("/{id}/delivery-otp/verify", response_model=BatchDeliveryOTPVerifyResponse)
def verify_batch_delivery_otp(
    id: str,
    payload: BatchDeliveryOTPVerifyRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Driver verifies buyer delivery OTP to complete batch delivery and trigger payouts."""
    if current_user.role not in ["driver", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned drivers or administrators can verify delivery OTP.",
        )

    batch = db.query(DeliveryBatch).filter(DeliveryBatch.id == id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery batch '{id}' not found",
        )

    if current_user.role == "driver" and batch.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the assigned driver for this delivery batch.",
        )

    if batch.status == "Delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch has already been completed and delivered.",
        )

    orders = db.query(Order).filter(Order.id.in_(batch.order_ids)).all()
    if not orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No orders linked to this delivery batch.",
        )

    # Match OTP against orders in the batch
    # If a specific order_id is targeted, verify against that order
    # Otherwise check if the entered OTP matches any of the batch's orders
    target_order = None
    if payload.order_id:
        target_order = next((o for o in orders if o.id == payload.order_id), None)
        if not target_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{payload.order_id}' is not part of batch '{id}'.",
            )
    else:
        # Check matching order by OTP
        for o in orders:
            if o.delivery_otp and o.delivery_otp.strip() == payload.otp.strip():
                target_order = o
                break
        if not target_order:
            target_order = orders[0]

    # Verify against target order OTP
    is_valid, msg = verify_delivery_otp(
        entered_otp=payload.otp,
        stored_otp=target_order.delivery_otp,
        expires_at=target_order.delivery_otp_expires_at,
        current_attempts=target_order.delivery_otp_attempts or 0,
    )

    if not is_valid:
        target_order.delivery_otp_attempts = (target_order.delivery_otp_attempts or 0) + 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    # Successfully verified!
    now = datetime.now(timezone.utc)
    batch.status = "Delivered"
    batch.delivered_at = now

    driver_id = batch.driver_id or current_user.id

    # Mark all orders in batch as delivered and create driver payouts
    for o in orders:
        o.status = "Delivered"
        o.delivery_confirmed_at = now
        if not o.assigned_driver_id:
            o.assigned_driver_id = driver_id

        # Driver payout record
        t_charge = float(o.transportation_charge or (float(batch.transportation_charge or 600.0) / len(orders)))
        existing_payout = db.query(DriverPayout).filter(DriverPayout.order_id == o.id).first()
        if not existing_payout:
            payout = DriverPayout(
                id=f"PO-{uuid.uuid4().hex[:8].upper()}",
                order_id=o.id,
                driver_id=driver_id,
                amount=round(t_charge, 2),
                status="payable",
            )
            db.add(payout)
        else:
            existing_payout.status = "payable"

    # Free driver and vehicle
    if batch.driver_id:
        driver = db.query(Driver).filter(Driver.id == batch.driver_id).first()
        if driver:
            driver.status = "Available"

    if batch.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == batch.vehicle_id).first()
        if vehicle:
            vehicle.status = "Available"

    db.commit()
    db.refresh(batch)

    return BatchDeliveryOTPVerifyResponse(
        batch_id=batch.id,
        status=batch.status,
        message="Delivery OTP confirmed successfully. Delivery batch and orders marked as Delivered.",
        delivered_at=batch.delivered_at,
        driver_payout_status="payable",
    )
