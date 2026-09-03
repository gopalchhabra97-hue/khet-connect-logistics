import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db_session
from app.models.product import Product
from app.models.user import User
from app.models.order import Order
from app.schemas import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[ProductResponse])
def list_products(
    category: Optional[str] = Query(None, description="Filter by crop category (Vegetables, Fruits, Grains, Pulses)"),
    location: Optional[str] = Query(None, description="Filter by origin mandi/location"),
    seller_id: Optional[str] = Query(None, description="Filter by seller user ID"),
    available: Optional[bool] = Query(None, description="Filter by availability"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price per unit"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price per unit"),
    search: Optional[str] = Query(None, description="Search term in product name or seller name"),
    db: Session = Depends(get_db_session),
):
    """Retrieve products with optional filtering."""
    query = db.query(Product)

    if category:
        query = query.filter(Product.category.ilike(category))
    if location:
        query = query.filter(Product.location.ilike(location))
    if seller_id:
        query = query.filter(Product.seller_id == seller_id)
    if available is not None:
        query = query.filter(Product.available == available)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_pattern),
                Product.seller_name.ilike(search_pattern),
                Product.location.ilike(search_pattern),
            )
        )

    return query.order_by(Product.created_at.desc()).all()


@router.get("/{id}", response_model=ProductResponse)
def get_product(id: str, db: Session = Depends(get_db_session)):
    """Retrieve a single product by ID."""
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{id}' not found",
        )
    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db_session)):
    """Create a new product listing."""
    # Generate ID if not provided
    product_id = product_in.id or f"P-{uuid.uuid4().hex[:8].upper()}"

    # Check for duplicate ID
    existing = db.query(Product).filter(Product.id == product_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with id '{product_id}' already exists",
        )

    # Validate seller if user exists in db
    seller_name = product_in.seller_name
    seller = db.query(User).filter(User.id == product_in.seller_id).first()
    if seller and not seller_name:
        seller_name = seller.org or seller.name

    new_product = Product(
        id=product_id,
        name=product_in.name,
        category=product_in.category,
        quantity=product_in.quantity,
        unit=product_in.unit,
        price=product_in.price,
        location=product_in.location,
        seller_id=product_in.seller_id,
        seller_name=seller_name,
        available=product_in.available,
        harvest_date=product_in.harvest_date,
        verified=product_in.verified,
        image=product_in.image,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


@router.patch("/{id}", response_model=ProductResponse)
def update_product(
    id: str,
    product_in: ProductUpdate,
    db: Session = Depends(get_db_session),
):
    """Partially update an existing product listing."""
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{id}' not found",
        )

    update_dict = product_in.model_dump(exclude_unset=True)
    if not update_dict:
        return product

    for field, value in update_dict.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_product(id: str, db: Session = Depends(get_db_session)):
    """Delete a product listing."""
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{id}' not found",
        )

    # Protect referential integrity if orders reference this product
    orders_count = db.query(Order).filter(Order.product_id == id).count()
    if orders_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete product '{id}' because it is linked to {orders_count} existing order(s). Unlist the product by setting available=false instead.",
        )

    db.delete(product)
    db.commit()
    return {"message": f"Product '{id}' deleted successfully", "id": id}
