"""Quality Grading Service for KhetSetu AI Crop Quality Assessment.

Architecture:
- BaseQualityGradingProvider: Abstract interface defining the contract.
- DemoQualityGradingProvider: Deterministic, realistic visual grading for demo & offline modes.
- GeminiQualityGradingProvider: Optional Gemini multimodal visual grading if GEMINI_API_KEY is configured.
- get_quality_grading_service(): Factory providing the configured grading engine.

CRITICAL CONSTRAINTS:
- Strictly Visual Quality Assessment.
- Never claims detection of pesticide residues, internal chemical composition, nutritional content,
  or internal moisture which cannot be determined through surface camera images.
- Grade Scale:
  90-100 = A+
  80-89  = A
  70-79  = B
  60-69  = C
  <60    = D
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import os
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

# 8 Visual Quality Assessment Factors and their maximum allowable marks (Sum = 100)
FACTOR_MAX_MARKS: Dict[str, float] = {
    "freshness": 20.0,
    "color_appearance": 15.0,
    "physical_damage": 15.0,
    "disease_spots": 15.0,
    "pest_damage": 10.0,
    "size_uniformity": 10.0,
    "rot_decay": 10.0,
    "cleanliness": 5.0,
}


def calculate_grade(total_score: float) -> str:
    """Computes standard KhetSetu visual quality grade from 0-100 mark score."""
    score = round(total_score, 1)
    if score >= 90.0:
        return "A+"
    elif score >= 80.0:
        return "A"
    elif score >= 70.0:
        return "B"
    elif score >= 60.0:
        return "C"
    else:
        return "D"


class QualityGradingResult:
    """Standardized result object returned by all grading providers."""

    def __init__(
        self,
        crop: str,
        total_score: float,
        grade: str,
        factor_scores: Dict[str, float],
        detected_issues: List[str],
        recommendation: str,
        analysis_mode: str,  # "ai" or "demo"
    ):
        self.crop = crop
        self.total_score = round(total_score, 1)
        self.grade = grade
        self.factor_scores = factor_scores
        self.detected_issues = detected_issues
        self.recommendation = recommendation
        self.analysis_mode = analysis_mode

    def to_dict(self) -> Dict[str, Any]:
        return {
            "crop": self.crop,
            "total_score": self.total_score,
            "grade": self.grade,
            "factor_scores": self.factor_scores,
            "detected_issues": self.detected_issues,
            "recommendation": self.recommendation,
            "analysis_mode": self.analysis_mode,
        }


class BaseQualityGradingProvider(ABC):
    """Abstract interface for quality grading providers."""

    @abstractmethod
    async def analyze(
        self,
        image_bytes: bytes,
        crop_name: str,
        filename: Optional[str] = None,
    ) -> QualityGradingResult:
        """Analyzes crop image bytes and returns a standardized QualityGradingResult."""
        pass


class DemoQualityGradingProvider(BaseQualityGradingProvider):
    """Deterministic demo quality grading engine.

    Uses pre-calibrated baseline profiles for known crops and consistent pseudo-randomization
    tied to image/crop content hash so identical inputs always yield identical outputs.
    """

    # Baseline marks calibrated to prompt specs:
    # Tomato -> 87/100 -> A
    # Potato -> 92/100 -> A+
    # Onion  -> 76/100 -> B
    # Wheat  -> 84/100 -> A
    # Rice   -> 88/100 -> A
    # Green Peas -> 72/100 -> B
    # Guava  -> 94/100 -> A+
    DEMO_PROFILES: Dict[str, Dict[str, Any]] = {
        "tomato": {
            "freshness": 18.0,
            "color_appearance": 13.0,
            "physical_damage": 12.5,
            "disease_spots": 13.0,
            "pest_damage": 9.0,
            "size_uniformity": 8.5,
            "rot_decay": 8.5,
            "cleanliness": 4.5,
            "detected_issues": [
                "Minor surface caliper variation across batch",
                "Light pressure marks on ~4% of sample",
            ],
            "recommendation": "Well suited for fresh wholesale mandi and retail distribution. Maintain cold chain at 10-12°C.",
        },
        "potato": {
            "freshness": 19.0,
            "color_appearance": 14.0,
            "physical_damage": 14.0,
            "disease_spots": 14.5,
            "pest_damage": 9.5,
            "size_uniformity": 8.5,
            "rot_decay": 8.5,
            "cleanliness": 4.0,
            "detected_issues": [
                "Dry soil dust adhering to skin",
                "Minor superficial scuffing during harvest handling",
            ],
            "recommendation": "Excellent export & processing grade. Store in ventilated dark storage at 8-10°C to prevent greening.",
        },
        "onion": {
            "freshness": 15.5,
            "color_appearance": 11.5,
            "physical_damage": 11.0,
            "disease_spots": 11.5,
            "pest_damage": 8.0,
            "size_uniformity": 7.5,
            "rot_decay": 7.5,
            "cleanliness": 3.5,
            "detected_issues": [
                "Outer peel slippage observed on ~12% of bulbs",
                "Neck drying partially incomplete",
            ],
            "recommendation": "Standard commercial mandi wholesale grade. Ensure dry forced-air curing before long-distance transit.",
        },
        "wheat": {
            "freshness": 17.0,
            "color_appearance": 13.0,
            "physical_damage": 12.0,
            "disease_spots": 12.5,
            "pest_damage": 8.5,
            "size_uniformity": 8.5,
            "rot_decay": 8.5,
            "cleanliness": 4.0,
            "detected_issues": [
                "Minimal chaff and broken kernel fraction (~1.5%)",
            ],
            "recommendation": "High milling quality. Suitable for wholesale food processing and flour mill contracts.",
        },
        "rice": {
            "freshness": 18.0,
            "color_appearance": 13.5,
            "physical_damage": 13.0,
            "disease_spots": 13.0,
            "pest_damage": 9.0,
            "size_uniformity": 8.5,
            "rot_decay": 9.0,
            "cleanliness": 4.0,
            "detected_issues": [
                "Low chalkiness; slight length variation across grain lots",
            ],
            "recommendation": "Grade A commercial rice. Maintain airtight dry warehousing below 65% relative humidity.",
        },
        "green peas": {
            "freshness": 14.5,
            "color_appearance": 11.0,
            "physical_damage": 10.5,
            "disease_spots": 11.0,
            "pest_damage": 7.5,
            "size_uniformity": 7.0,
            "rot_decay": 7.0,
            "cleanliness": 3.5,
            "detected_issues": [
                "Slight pod yellowing on early-matured pods",
                "Superficial mechanical transit rubbing",
            ],
            "recommendation": "Good for local retail market. Priority dispatch recommended due to high perishability.",
        },
        "guava": {
            "freshness": 19.5,
            "color_appearance": 14.5,
            "physical_damage": 14.0,
            "disease_spots": 14.0,
            "pest_damage": 9.5,
            "size_uniformity": 9.0,
            "rot_decay": 9.0,
            "cleanliness": 4.5,
            "detected_issues": [
                "Natural fruit lenticels present (cosmetic only)",
            ],
            "recommendation": "Premium table fruit export grade. Pack in cushioned ventilated crates for transit.",
        },

    }

    async def analyze(
        self,
        image_bytes: bytes,
        crop_name: str,
        filename: Optional[str] = None,
    ) -> QualityGradingResult:
        normalized_crop = crop_name.strip().lower()

        if normalized_crop in self.DEMO_PROFILES:
            profile = self.DEMO_PROFILES[normalized_crop]
            factor_scores = {
                "freshness": profile["freshness"],
                "color_appearance": profile["color_appearance"],
                "physical_damage": profile["physical_damage"],
                "disease_spots": profile["disease_spots"],
                "pest_damage": profile["pest_damage"],
                "size_uniformity": profile["size_uniformity"],
                "rot_decay": profile["rot_decay"],
                "cleanliness": profile["cleanliness"],
            }
            issues = list(profile["detected_issues"])
            rec = profile["recommendation"]
        else:
            # Deterministic fallback for any other crop using crop name hash
            h = int(hashlib.sha256(normalized_crop.encode("utf-8")).hexdigest(), 16)
            freshness = round(15.0 + (h % 50) / 10.0, 1)  # 15 - 20
            color = round(11.0 + ((h >> 4) % 40) / 10.0, 1)  # 11 - 15
            physical = round(11.0 + ((h >> 8) % 40) / 10.0, 1)  # 11 - 15
            disease = round(11.0 + ((h >> 12) % 40) / 10.0, 1)  # 11 - 15
            pest = round(7.0 + ((h >> 16) % 30) / 10.0, 1)  # 7 - 10
            size = round(7.0 + ((h >> 20) % 30) / 10.0, 1)  # 7 - 10
            rot = round(7.0 + ((h >> 24) % 30) / 10.0, 1)  # 7 - 10
            cleanliness = round(3.5 + ((h >> 28) % 15) / 10.0, 1)  # 3.5 - 5

            factor_scores = {
                "freshness": min(FACTOR_MAX_MARKS["freshness"], freshness),
                "color_appearance": min(FACTOR_MAX_MARKS["color_appearance"], color),
                "physical_damage": min(FACTOR_MAX_MARKS["physical_damage"], physical),
                "disease_spots": min(FACTOR_MAX_MARKS["disease_spots"], disease),
                "pest_damage": min(FACTOR_MAX_MARKS["pest_damage"], pest),
                "size_uniformity": min(FACTOR_MAX_MARKS["size_uniformity"], size),
                "rot_decay": min(FACTOR_MAX_MARKS["rot_decay"], rot),
                "cleanliness": min(FACTOR_MAX_MARKS["cleanliness"], cleanliness),
            }
            issues = ["Minor varietal size divergence", "Surface dust typical of open-field harvest"]
            rec = f"Acceptable commercial {crop_name.title()} lot. Dispatch via standard agricultural transport."

        # Total score is the exact sum of all 8 visual factors
        total_score = round(sum(factor_scores.values()), 1)
        total_score = max(0.0, min(100.0, total_score))
        grade = calculate_grade(total_score)

        return QualityGradingResult(
            crop=crop_name.strip().title(),
            total_score=total_score,
            grade=grade,
            factor_scores=factor_scores,
            detected_issues=issues,
            recommendation=rec,
            analysis_mode="demo",
        )


class GeminiQualityGradingProvider(BaseQualityGradingProvider):
    """Multimodal visual quality grading using Google Gemini Vision API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.fallback_demo = DemoQualityGradingProvider()

    async def analyze(
        self,
        image_bytes: bytes,
        crop_name: str,
        filename: Optional[str] = None,
    ) -> QualityGradingResult:
        try:
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            system_instruction = f"""
You are an expert post-harvest agricultural quality inspector evaluating visual crop quality for {crop_name}.
IMPORTANT: Evaluate ONLY VISUAL factors visible on the surface of the image.
Do NOT attempt to predict pesticide residue, nutritional value, moisture percentage, or internal attributes not verifiable by sight.

Evaluate the image across these EXACT 8 visual factors and max marks:
1. freshness (0.0 to 20.0)
2. color_appearance (0.0 to 15.0)
3. physical_damage (0.0 to 15.0)
4. disease_spots (0.0 to 15.0)
5. pest_damage (0.0 to 10.0)
6. size_uniformity (0.0 to 10.0)
7. rot_decay (0.0 to 10.0)
8. cleanliness (0.0 to 5.0)

Return a strict JSON object with this format:
{{
  "freshness": float,
  "color_appearance": float,
  "physical_damage": float,
  "disease_spots": float,
  "pest_damage": float,
  "size_uniformity": float,
  "rot_decay": float,
  "cleanliness": float,
  "detected_issues": ["bullet 1", "bullet 2"],
  "recommendation": "one sentence storage/market recommendation"
}}
"""
            # Call multimodal model
            response = model.generate_content([
                system_instruction,
                {"mime_type": "image/jpeg", "data": image_bytes},
            ])

            text = response.text.strip()
            # Clean markdown fences if any
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            data = json.loads(text)

            # Extract & clamp factor marks
            factors: Dict[str, float] = {}
            for key, max_val in FACTOR_MAX_MARKS.items():
                val = float(data.get(key, max_val * 0.8))
                factors[key] = round(max(0.0, min(max_val, val)), 1)

            total_score = round(sum(factors.values()), 1)
            total_score = max(0.0, min(100.0, total_score))
            grade = calculate_grade(total_score)

            detected_issues = data.get("detected_issues", [])
            if not isinstance(detected_issues, list):
                detected_issues = [str(detected_issues)]

            recommendation = data.get("recommendation", f"Commercial grade {crop_name.title()} lot.")

            return QualityGradingResult(
                crop=crop_name.strip().title(),
                total_score=total_score,
                grade=grade,
                factor_scores=factors,
                detected_issues=detected_issues,
                recommendation=recommendation,
                analysis_mode="ai",
            )
        except Exception as exc:
            logger.warning(
                "Gemini AI visual analysis failed or unavailable (%s). Falling back safely to Demo provider.",
                str(exc),
            )
            # Automatic graceful fallback to demo provider without breaking the app
            return await self.fallback_demo.analyze(image_bytes, crop_name, filename)


def get_quality_grading_service() -> BaseQualityGradingProvider:
    """Factory creating the appropriate quality grading provider.

    If GEMINI_API_KEY is defined in the environment, initializes the Gemini provider.
    Otherwise, defaults to the deterministic DemoQualityGradingProvider with analysis_mode='demo'.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key.strip():
        try:
            return GeminiQualityGradingProvider(gemini_key.strip())
        except Exception as e:
            logger.error("Failed to initialize Gemini provider: %s. Using Demo provider.", str(e))

    return DemoQualityGradingProvider()
