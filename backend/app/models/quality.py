from sqlalchemy import Column, String, Float, DateTime, func, ForeignKey, JSON, Text
from ..db.base import Base


class CropQualityResult(Base):
    """Crop quality visual assessment record."""
    __tablename__ = "crop_quality_results"

    id = Column(String(50), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    image_url = Column(String(500), nullable=True)
    crop = Column(String(100), nullable=False, index=True)
    total_score = Column(Float, nullable=False)
    grade = Column(String(10), nullable=False)
    factor_scores = Column(JSON, nullable=False)
    detected_issues = Column(JSON, nullable=False)
    recommendation = Column(Text, nullable=True)
    analysis_mode = Column(String(20), nullable=False, default="demo")  # "ai" or "demo"
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<CropQualityResult(id={self.id}, crop={self.crop}, grade={self.grade}, total_score={self.total_score})>"
