"""FastAPI Router for Government data.gov.in Mandi Prices and Reference Pricing."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.security import require_role
from app.db.database import get_db_session
from app.models.mandi import MandiPrice
from app.models.user import User
from app.schemas import (
    MandiPriceResponse,
    MandiReferenceResponse,
    MandiSyncStatusResponse,
    MandiSyncTriggerResponse,
)
from app.services.mandi_price_service import (
    find_reference_mandi_price,
    get_sync_status,
    sync_mandi_prices,
)

router = APIRouter(prefix="/mandi-prices", tags=["Mandi Prices"])


@router.get("", response_model=List[MandiPriceResponse])
def list_mandi_prices(
    commodity: Optional[str] = Query(None, description="Filter by crop/commodity name"),
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    market: Optional[str] = Query(None, description="Filter by mandi/market"),
    date: Optional[str] = Query(None, description="Filter by arrival date (YYYY-MM-DD or DD/MM/YYYY)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db_session),
):
    """Lists stored mandi price records with flexible filtering."""
    query = db.query(MandiPrice)

    if commodity:
        query = query.filter(MandiPrice.commodity.ilike(f"%{commodity.strip()}%"))
    if state:
        query = query.filter(MandiPrice.state.ilike(f"%{state.strip()}%"))
    if district:
        query = query.filter(MandiPrice.district.ilike(f"%{district.strip()}%"))
    if market:
        query = query.filter(MandiPrice.market.ilike(f"%{market.strip()}%"))
    if date:
        query = query.filter(MandiPrice.price_date == date.strip())

    return query.order_by(MandiPrice.price_date.desc(), MandiPrice.fetched_at.desc()).offset(offset).limit(limit).all()


@router.get("/latest", response_model=List[MandiPriceResponse])
def get_latest_mandi_prices(
    state: Optional[str] = Query(None, description="Filter by state"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_session),
):
    """Returns the most recent price record for each distinct commodity."""
    # Subquery to find max fetched_at per commodity
    subq = db.query(
        MandiPrice.commodity,
        func.max(MandiPrice.fetched_at).label("max_fetched"),
    )
    if state:
        subq = subq.filter(MandiPrice.state.ilike(f"%{state.strip()}%"))
    subq = subq.group_by(MandiPrice.commodity).subquery()

    query = db.query(MandiPrice).join(
        subq,
        (MandiPrice.commodity == subq.c.commodity) & (MandiPrice.fetched_at == subq.c.max_fetched),
    )
    return query.limit(limit).all()


@router.get("/reference/{commodity}", response_model=MandiReferenceResponse)
def get_commodity_reference_price(
    commodity: str,
    location: Optional[str] = Query(None, description="Farmer or buyer location / market"),
    state: Optional[str] = Query(None, description="Farmer state"),
    db: Session = Depends(get_db_session),
):
    """Retrieves the official mandi modal reference price and calculated maximum allowed farmer price."""
    ref_info = find_reference_mandi_price(
        commodity=commodity,
        location=location,
        state=state,
        db=db,
    )
    return MandiReferenceResponse(**ref_info)


@router.get("/status", response_model=MandiSyncStatusResponse)
def get_mandi_sync_status(db: Session = Depends(get_db_session)):
    """Returns operational synchronization health and stale data status (never exposes API keys)."""
    status_info = get_sync_status(db)
    return MandiSyncStatusResponse(**status_info)


@router.post("/sync", response_model=MandiSyncTriggerResponse)
def trigger_mandi_sync(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_role("admin")),
):
    """Manually triggers background sync against data.gov.in (Admin Only)."""
    result = sync_mandi_prices(db=db, force=True)
    if result.get("status") == "failed" and "already running" not in result.get("message", ""):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.get("message"),
        )
    return MandiSyncTriggerResponse(
        message=result["message"],
        records_fetched=result.get("records_fetched", 0),
        records_inserted=result.get("records_inserted", 0),
        status=result["status"],
    )
