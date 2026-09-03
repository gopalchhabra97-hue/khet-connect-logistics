"""FastAPI Router for Phase 8 Intelligent Farmer-Buyer Matching."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db.database import get_db_session
from app.models.product import Product
from app.models.user import User
from app.schemas import (
    MatchingResultItem,
    MatchingSearchRequest,
    MatchingSearchResponse,
)
from app.services.matching_service import (
    evaluate_product_match,
    find_best_matches,
)

router = APIRouter(prefix="/matching", tags=["Matching Engine"])


@router.post("/search", response_model=MatchingSearchResponse)
def search_matching_products(
    request: MatchingSearchRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_role("buyer", "admin")),
):
    """Evaluates and ranks available farmer listings for buyer requirements.

    Uses an explainable, multi-factor scoring engine incorporating crop compatibility,
    quantity fulfillment, budget competitiveness, mandi benchmark awareness,
    highway logistics, delivery timeline, and verified quality credentials.
    """
    return find_best_matches(req=request, db=db)


@router.get("/product/{product_id}", response_model=MatchingResultItem)
def get_product_matching_details(
    product_id: str,
    quantity: float = Query(100.0, gt=0, description="Target quantity to evaluate"),
    unit: str = Query("kg", description="Unit of measurement"),
    max_price: Optional[float] = Query(None, gt=0, description="Target maximum price"),
    delivery_location: Optional[str] = Query(None, description="Buyer destination hub"),
    required_by_days: Optional[int] = Query(None, ge=1, le=30, description="Delivery timeline"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_role("buyer", "admin")),
):
    """Evaluates a single candidate product against buyer requirements."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{product_id}' not found",
        )

    req = MatchingSearchRequest(
        commodity=product.name,
        quantity=quantity,
        unit=unit,
        max_price=max_price,
        delivery_location=delivery_location,
        required_by_days=required_by_days,
    )

    match_result = evaluate_product_match(product=product, req=req, db=db)
    if not match_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{product_id}' is incompatible with search criteria",
        )

    return match_result
