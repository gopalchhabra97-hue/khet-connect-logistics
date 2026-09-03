"""FastAPI Router for Demand Forecasting and Supply Recommendations."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db_session
from app.models.product import Product
from app.schemas import ForecastResponse
from app.services.forecast_service import (
    DEMO_FORECASTS,
    generate_forecast_for_crop,
    get_all_crop_forecasts,
)

router = APIRouter(prefix="/forecast", tags=["Demand Forecasting"])


@router.get("", response_model=List[ForecastResponse])
def get_forecasts(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    crop_name: Optional[str] = Query(None, description="Filter by crop name (e.g., Tomato)"),
    safety_buffer_pct: float = Query(0.10, ge=0.0, le=1.0, description="Safety buffer percentage (e.g., 0.10 for 10%)"),
    forecast_days: int = Query(21, ge=7, le=90, description="Forecast horizon in days"),
    db: Session = Depends(get_db_session),
):
    """Retrieves demand forecasts and supply recommendations for all crops or a filtered crop."""
    # Filter by specific product ID or crop name
    if product_id or crop_name:
        resolved_crop = crop_name
        resolved_pid = product_id

        if product_id and not resolved_crop:
            p = db.query(Product).filter(Product.id == product_id).first()
            if p:
                resolved_crop = p.name
            else:
                # Check demo forecasts mapping
                for name, d in DEMO_FORECASTS.items():
                    if d.get("product_id") == product_id or name.lower() == product_id.lower():
                        resolved_crop = name
                        break

        if not resolved_crop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product or crop '{product_id or crop_name}' not found",
            )

        res = generate_forecast_for_crop(
            db=db,
            crop_name=resolved_crop,
            product_id=resolved_pid,
            safety_buffer_pct=safety_buffer_pct,
            forecast_days=forecast_days,
        )
        return [res]

    return get_all_crop_forecasts(
        db=db,
        safety_buffer_pct=safety_buffer_pct,
        forecast_days=forecast_days,
    )


@router.get("/{product_id}", response_model=ForecastResponse)
def get_forecast_by_product_id(
    product_id: str,
    safety_buffer_pct: float = Query(0.10, ge=0.0, le=1.0, description="Safety buffer percentage"),
    forecast_days: int = Query(21, ge=7, le=90, description="Forecast horizon in days"),
    db: Session = Depends(get_db_session),
):
    """Retrieves demand forecast and supply recommendation for a specific product ID or crop name."""
    resolved_crop = None
    resolved_pid = product_id

    p = db.query(Product).filter(Product.id == product_id).first()
    if p:
        resolved_crop = p.name
    else:
        # Check by crop name directly or in DEMO_FORECASTS
        for name, d in DEMO_FORECASTS.items():
            if d.get("product_id") == product_id or name.lower() == product_id.lower():
                resolved_crop = name
                resolved_pid = d.get("product_id")
                break

    if not resolved_crop:
        # Check if product_id is a known product name in the database
        p_by_name = db.query(Product).filter(Product.name.ilike(f"%{product_id}%")).first()
        if p_by_name:
            resolved_crop = p_by_name.name
            resolved_pid = p_by_name.id
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{product_id}' not found",
            )

    return generate_forecast_for_crop(
        db=db,
        crop_name=resolved_crop,
        product_id=resolved_pid,
        safety_buffer_pct=safety_buffer_pct,
        forecast_days=forecast_days,
    )
