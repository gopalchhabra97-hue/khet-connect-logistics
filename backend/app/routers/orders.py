import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db_session
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.schemas import OrderCreate, OrderResponse, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["Orders"])

ALLOWED_ORDER_STATUSES = {
    "Pending",
    "Accepted",
    "Rejected",
    "Preparing",
    "In Transit",
    "Delivered",
}


@router.get("", response_model=List[OrderResponse])
def list_orders(
    buyer_id: Optional[str] = Query(None, description="Filter by buyer user ID"),
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    batch_id: Optional[str] = Query(None, description="Filter by delivery batch ID"),
    pickup_location: Optional[str] = Query(None, description="Filter by pickup location"),
    delivery_location: Optional[str] = Query(None, description="Filter by delivery destination"),
    db: Session = Depends(get_db_session),
):
    """Retrieve orders with optional filtering."""
    query = db.query(Order)

    if buyer_id:
        query = query.filter(Order.buyer_id == buyer_id)
    if product_id:
        query = query.filter(Order.product_id == product_id)
    if status:
        query = query.filter(Order.status.ilike(status))
    if batch_id:
        query = query.filter(Order.batch_id == batch_id)
    if pickup_location:
        query = query.filter(Order.pickup_location.ilike(pickup_location))
    if delivery_location:
        query = query.filter(Order.delivery_location.ilike(delivery_location))

    return query.order_by(Order.created_at.desc()).all()


@router.get("/{id}", response_model=OrderResponse)
def get_order(id: str, db: Session = Depends(get_db_session)):
    """Retrieve a single order by ID."""
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id '{id}' not found",
        )
    return order


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db_session)):
    """Place a new buyer order."""
    # Check product existence
    product = db.query(Product).filter(Product.id == order_in.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{order_in.product_id}' does not exist",
        )

    # Check buyer existence
    buyer = db.query(User).filter(User.id == order_in.buyer_id).first()
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer with user id '{order_in.buyer_id}' does not exist",
        )

    # Check quantity validity
    if order_in.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order quantity must be greater than zero",
        )

    # Generate Order ID if omitted
    order_id = order_in.id or f"#{uuid.uuid4().hex[:6].upper()}"

    # Check for duplicate ID
    existing = db.query(Order).filter(Order.id == order_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order with id '{order_id}' already exists",
        )

    # Populate defaults from product/buyer if not specified
    product_name = order_in.product_name or product.name
    price_per_unit = order_in.price_per_unit or product.price
    pickup_location = order_in.pickup_location or product.location
    buyer_name = order_in.buyer_name or buyer.org or buyer.name
    order_date = order_in.order_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    status_val = order_in.status or "Pending"

    if status_val not in ALLOWED_ORDER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid order status '{status_val}'. Allowed values: {', '.join(sorted(ALLOWED_ORDER_STATUSES))}",
        )

    new_order = Order(
        id=order_id,
        buyer_id=order_in.buyer_id,
        buyer_name=buyer_name,
        product_id=order_in.product_id,
        product_name=product_name,
        quantity=order_in.quantity,
        unit=order_in.unit or product.unit,
        price_per_unit=price_per_unit,
        pickup_location=pickup_location,
        delivery_location=order_in.delivery_location,
        order_date=order_date,
        expected_delivery=order_in.expected_delivery,
        status=status_val,
        batch_id=order_in.batch_id,
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


@router.patch("/{id}/status", response_model=OrderResponse)
def update_order_status(
    id: str,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db_session),
):
    """Update the lifecycle status of an order."""
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id '{id}' not found",
        )

    normalized_status = status_update.status.strip()
    # Case-insensitive match against allowed statuses
    matched_status = next(
        (s for s in ALLOWED_ORDER_STATUSES if s.lower() == normalized_status.lower()),
        None,
    )
    if not matched_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid order status '{status_update.status}'. Allowed values: {', '.join(sorted(ALLOWED_ORDER_STATUSES))}",
        )

    order.status = matched_status
    db.commit()
    db.refresh(order)
    return order
