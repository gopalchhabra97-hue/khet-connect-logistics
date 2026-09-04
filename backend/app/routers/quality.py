"""Quality Grading Router: Crop image upload, AI/Demo quality analysis, and product quality retrieval."""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db_session
from app.models.product import Product
from app.models.quality import CropQualityResult
from app.models.user import User
from app.schemas import CropQualityFactorScores, CropQualityResponse
from app.services.quality_grading_service import get_quality_grading_service

router = APIRouter(prefix="/quality", tags=["Crop Quality"])

# Supported MIME types and max size (5 MB)
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# Static upload folder for crop quality images
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads" / "quality"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _to_response(item: CropQualityResult) -> CropQualityResponse:
    factors = item.factor_scores or {}
    return CropQualityResponse(
        id=item.id,
        product_id=item.product_id,
        image_url=item.image_url,
        crop=item.crop,
        total_score=float(item.total_score),
        grade=item.grade,
        factor_scores=CropQualityFactorScores(
            freshness=float(factors.get("freshness", 0.0)),
            color_appearance=float(factors.get("color_appearance", 0.0)),
            physical_damage=float(factors.get("physical_damage", 0.0)),
            disease_spots=float(factors.get("disease_spots", 0.0)),
            pest_damage=float(factors.get("pest_damage", 0.0)),
            size_uniformity=float(factors.get("size_uniformity", 0.0)),
            rot_decay=float(factors.get("rot_decay", 0.0)),
            cleanliness=float(factors.get("cleanliness", 0.0)),
        ),
        detected_issues=item.detected_issues or [],
        recommendation=item.recommendation,
        analysis_mode=item.analysis_mode,
        created_at=item.created_at or datetime.now(timezone.utc),
    )


@router.post("/analyze", response_model=CropQualityResponse)
async def analyze_crop_quality(
    file: UploadFile = File(...),
    product_id: Optional[str] = Form(None),
    crop: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Analyzes an uploaded crop image using the isolated quality grading engine.

    Validates file type and size, enforces product ownership for farmers,
    and returns a 100-mark quality assessment with 8 visual factors.
    """
    # 1. Validate MIME type
    content_type = file.content_type.lower() if file.content_type else ""
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type: '{content_type}'. Allowed types: JPEG, PNG, WEBP.",
        )

    # 2. Read and validate file size
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file size exceeds maximum limit of 5MB.",
        )

    # 3. Resolve and validate Product if product_id is provided
    product = None
    crop_name = crop.strip() if crop else None

    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{product_id}' not found.",
            )

        # RBAC: Farmer can only analyze/update quality for their own product (admin is also allowed)
        if current_user.role == "farmer" and product.seller_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to analyze or modify quality for another farmer's product.",
            )

        if not crop_name:
            crop_name = product.name

    if not crop_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Crop name or valid product_id must be provided.",
        )

    # 4. Save image safely to static storage
    safe_ext = ".jpg"
    if "png" in content_type:
        safe_ext = ".png"
    elif "webp" in content_type:
        safe_ext = ".webp"

    file_uuid = uuid.uuid4().hex
    saved_filename = f"{file_uuid}{safe_ext}"
    dest_path = UPLOAD_DIR / saved_filename

    with open(dest_path, "wb") as f:
        f.write(image_bytes)

    relative_image_url = f"/static/uploads/quality/{saved_filename}"

    # 5. Run Quality Grading Service
    service = get_quality_grading_service()
    grading_result = await service.analyze(
        image_bytes=image_bytes,
        crop_name=crop_name,
        filename=file.filename,
    )

    # 6. Save result to DB
    result_id = f"CQR-{uuid.uuid4().hex[:8].upper()}"
    db_result = CropQualityResult(
        id=result_id,
        product_id=product.id if product else None,
        image_url=relative_image_url,
        crop=grading_result.crop,
        total_score=grading_result.total_score,
        grade=grading_result.grade,
        factor_scores=grading_result.factor_scores,
        detected_issues=grading_result.detected_issues,
        recommendation=grading_result.recommendation,
        analysis_mode=grading_result.analysis_mode,
    )
    db.add(db_result)

    # Also update product.image if product doesn't have an image
    if product and not product.image:
        product.image = relative_image_url

    db.commit()
    db.refresh(db_result)

    return _to_response(db_result)


@router.get("/{product_id}", response_model=CropQualityResponse)
def get_product_quality(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """Returns the latest visual quality assessment for a marketplace product.

    Accessible to Farmers, Buyers, and Admins.
    """
    result = (
        db.query(CropQualityResult)
        .filter(CropQualityResult.product_id == product_id)
        .order_by(CropQualityResult.created_at.desc())
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quality assessment found for product '{product_id}'.",
        )

    return _to_response(result)


@router.get("", response_model=List[CropQualityResponse])
def list_quality_assessments(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    """List quality assessments.

    - Admin: can view all assessments.
    - Farmer: views assessments for their own listed products.
    - Buyer/Driver: views latest marketplace assessments.
    """
    query = db.query(CropQualityResult)

    if current_user.role == "farmer":
        farmer_product_ids = [
            p.id for p in db.query(Product.id).filter(Product.seller_id == current_user.id).all()
        ]
        query = query.filter(CropQualityResult.product_id.in_(farmer_product_ids))

    results = query.order_by(CropQualityResult.created_at.desc()).limit(limit).all()
    return [_to_response(r) for r in results]
