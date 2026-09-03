"""Government of India (data.gov.in) Mandi Price Integration Service.

Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
Fetches official daily APMC market prices, provides last-known-good resilience,
stale price detection, and validates farmer pricing ceilings (+100% max markup).
"""

import hashlib
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.db.database import get_db_session
from app.models.mandi import MandiPrice

logger = logging.getLogger("khetsetu.mandi")

RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
API_BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

# Configurable settings from environment
DEFAULT_STALE_HOURS = 48
DEFAULT_SYNC_HOURS = 24
DEFAULT_MAX_MARKUP_PERCENT = 100.0

# Honest Demo Benchmarks (Used ONLY when no real government data exists in DB)
DEMO_MANDI_BENCHMARKS: Dict[str, Dict[str, Any]] = {
    "tomato": {
        "commodity": "Tomato",
        "market": "Patiala",
        "state": "Punjab",
        "district": "Patiala",
        "variety": "Deshi",
        "grade": "FAQ",
        "modal_price": 2500.0,
        "price_per_kg": 25.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "potato": {
        "commodity": "Potato",
        "market": "Patiala",
        "state": "Punjab",
        "district": "Patiala",
        "variety": "Jyoti",
        "grade": "FAQ",
        "modal_price": 1800.0,
        "price_per_kg": 18.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "onion": {
        "commodity": "Onion",
        "market": "Ambala",
        "state": "Haryana",
        "district": "Ambala",
        "variety": "Red",
        "grade": "FAQ",
        "modal_price": 3000.0,
        "price_per_kg": 30.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "wheat": {
        "commodity": "Wheat",
        "market": "Kurukshetra",
        "state": "Haryana",
        "district": "Kurukshetra",
        "variety": "Sharbati",
        "grade": "FAQ",
        "modal_price": 2800.0,
        "price_per_kg": 28.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "rice": {
        "commodity": "Rice",
        "market": "Karnal",
        "state": "Haryana",
        "district": "Karnal",
        "variety": "Basmati 1121",
        "grade": "FAQ",
        "modal_price": 3500.0,
        "price_per_kg": 35.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "cauliflower": {
        "commodity": "Cauliflower",
        "market": "Ludhiana",
        "state": "Punjab",
        "district": "Ludhiana",
        "variety": "Snowball",
        "grade": "FAQ",
        "modal_price": 2200.0,
        "price_per_kg": 22.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "mustard": {
        "commodity": "Mustard",
        "market": "Patiala",
        "state": "Punjab",
        "district": "Patiala",
        "variety": "Yellow",
        "grade": "FAQ",
        "modal_price": 5400.0,
        "price_per_kg": 54.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "guava": {
        "commodity": "Guava",
        "market": "Patiala",
        "state": "Punjab",
        "district": "Patiala",
        "variety": "Allahabad Safeda",
        "grade": "FAQ",
        "modal_price": 4500.0,
        "price_per_kg": 45.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
    "kinnow": {
        "commodity": "Kinnow",
        "market": "Abohar",
        "state": "Punjab",
        "district": "Fazilka",
        "variety": "Standard",
        "grade": "FAQ",
        "modal_price": 3500.0,
        "price_per_kg": 35.0,
        "unit": "Rs/Quintal",
        "source": "Mandi Market Baseline (Demo)",
    },
}

# In-memory operational status tracker
_sync_lock = threading.Lock()
_sync_metadata: Dict[str, Any] = {
    "last_successful_sync": None,
    "last_attempted_sync": None,
    "last_sync_status": "idle",  # "idle" | "in_progress" | "success" | "failed"
    "records_fetched": 0,
    "records_inserted": 0,
    "last_error": None,
}


def get_api_key() -> Optional[str]:
    """Reads the data.gov.in API key from environment without ever exposing it."""
    key = os.getenv("DATA_GOV_IN_API_KEY", "").strip()
    return key if key else None


def get_stale_after_hours() -> int:
    try:
        return int(os.getenv("MANDI_PRICE_STALE_AFTER_HOURS", str(DEFAULT_STALE_HOURS)))
    except ValueError:
        return DEFAULT_STALE_HOURS


def get_sync_interval_hours() -> int:
    try:
        return int(os.getenv("MANDI_PRICE_SYNC_INTERVAL_HOURS", str(DEFAULT_SYNC_HOURS)))
    except ValueError:
        return DEFAULT_SYNC_HOURS


def get_max_markup_percent() -> float:
    try:
        return float(os.getenv("FARMER_MAX_MARKUP_PERCENT", str(DEFAULT_MAX_MARKUP_PERCENT)))
    except ValueError:
        return DEFAULT_MAX_MARKUP_PERCENT


def compute_record_hash(commodity: str, market: str, state: str, price_date: str, variety: Optional[str] = None) -> str:
    """Computes a deterministic hash to prevent duplicate rows across repeated syncs."""
    raw = f"{commodity.strip().lower()}|{market.strip().lower()}|{state.strip().lower()}|{price_date.strip()}|{(variety or '').strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def fetch_from_datagov(api_key: str, limit: int = 50, offset: int = 0, state: Optional[str] = None) -> Dict[str, Any]:
    """Calls the official data.gov.in resource with exponential backoff on transient errors."""
    params = {
        "api-key": api_key,
        "format": "json",
        "limit": str(limit),
        "offset": str(offset),
    }
    if state:
        params["filters[state]"] = state

    query_string = urllib.parse.urlencode(params)
    url = f"{API_BASE_URL}?{query_string}"

    max_retries = 3
    backoff = 1.0
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Khetsetu-Agricultural-Core/1.0", "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    return payload
                else:
                    raise urllib.error.HTTPError(url, response.status, "Non-200 status", response.headers, None)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as ex:
            if attempt == max_retries:
                logger.error(f"data.gov.in API fetch failed after {attempt} attempts: {type(ex).__name__}")
                raise
            time.sleep(backoff)
            backoff *= 2.0

    return {}


def parse_and_store_records(records: List[Dict[str, Any]], db: Session) -> Tuple[int, int]:
    """Parses raw records from data.gov.in and idempotently stores them in PostgreSQL."""
    fetched = len(records)
    inserted = 0

    for r in records:
        try:
            commodity = str(r.get("commodity", "")).strip()
            market = str(r.get("market", "")).strip()
            state = str(r.get("state", "")).strip()
            if not commodity or not market or not state:
                continue

            district = r.get("district")
            variety = r.get("variety")
            grade = r.get("grade")
            arrival_date = str(r.get("arrival_date", "")).strip()
            if not arrival_date:
                arrival_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

            # Parse modal price
            raw_modal = r.get("modal_price")
            if raw_modal is None or str(raw_modal).strip() == "":
                continue
            modal_price = float(str(raw_modal).replace(",", "").strip())

            # Optional min and max price
            raw_min = r.get("min_price")
            min_price = float(str(raw_min).replace(",", "").strip()) if raw_min else None

            raw_max = r.get("max_price")
            max_price = float(str(raw_max).replace(",", "").strip()) if raw_max else None

            # Standard Agmarknet unit is Rs/Quintal (1 Quintal = 100 kg)
            unit = str(r.get("unit", "Rs/Quintal")).strip()
            if "quintal" in unit.lower():
                price_per_kg = round(modal_price / 100.0, 2)
            else:
                price_per_kg = round(modal_price, 2)

            rec_hash = compute_record_hash(commodity, market, state, arrival_date, variety)

            # Check if record hash already exists in DB
            existing = db.query(MandiPrice).filter(MandiPrice.record_hash == rec_hash).first()
            if not existing:
                item_id = f"MP-{rec_hash[:12].upper()}"
                new_rec = MandiPrice(
                    id=item_id,
                    commodity=commodity,
                    market=market,
                    state=state,
                    district=district,
                    variety=variety,
                    grade=grade,
                    price_date=arrival_date,
                    unit=unit,
                    min_price=min_price,
                    max_price=max_price,
                    modal_price=modal_price,
                    price_per_kg=price_per_kg,
                    source="data.gov.in - Agmarknet",
                    source_resource_id=RESOURCE_ID,
                    record_hash=rec_hash,
                )
                db.add(new_rec)
                inserted += 1
            else:
                # Update latest price values safely
                existing.modal_price = modal_price
                existing.price_per_kg = price_per_kg
                if min_price:
                    existing.min_price = min_price
                if max_price:
                    existing.max_price = max_price
                existing.fetched_at = datetime.now(timezone.utc)
        except Exception as e:
            logger.warning(f"Skipping malformed mandi record: {e}")
            continue

    db.commit()
    return fetched, inserted


def sync_mandi_prices(db: Session, force: bool = False) -> Dict[str, Any]:
    """Performs continuous or manual synchronization against data.gov.in."""
    global _sync_metadata

    if not _sync_lock.acquire(blocking=False):
        return {
            "status": "in_progress",
            "message": "Synchronization is already running in background.",
            "records_fetched": 0,
            "records_inserted": 0,
        }

    try:
        _sync_metadata["last_attempted_sync"] = datetime.now(timezone.utc)
        _sync_metadata["last_sync_status"] = "in_progress"

        api_key = get_api_key()
        if not api_key:
            _sync_metadata["last_sync_status"] = "failed"
            _sync_metadata["last_error"] = "DATA_GOV_IN_API_KEY environment variable is not configured."
            logger.info("Mandi sync skipped: DATA_GOV_IN_API_KEY not set. Operating on stored DB and demo benchmarks.")
            return {
                "status": "failed",
                "message": "DATA_GOV_IN_API_KEY not configured. Preserving existing stored records.",
                "records_fetched": 0,
                "records_inserted": 0,
            }

        # Fetch records from data.gov.in
        data = fetch_from_datagov(api_key=api_key, limit=100)
        records = data.get("records", []) if isinstance(data, dict) else []

        fetched, inserted = parse_and_store_records(records, db)

        _sync_metadata["last_successful_sync"] = datetime.now(timezone.utc)
        _sync_metadata["last_sync_status"] = "success"
        _sync_metadata["records_fetched"] = fetched
        _sync_metadata["records_inserted"] = inserted
        _sync_metadata["last_error"] = None

        return {
            "status": "success",
            "message": f"Successfully synchronized {fetched} mandi records ({inserted} new) from data.gov.in.",
            "records_fetched": fetched,
            "records_inserted": inserted,
        }
    except Exception as e:
        _sync_metadata["last_sync_status"] = "failed"
        _sync_metadata["last_error"] = f"Fetch failed: {type(e).__name__}"
        logger.error(f"Error during Mandi synchronization: {type(e).__name__}")
        # Preserving existing data without deletion
        return {
            "status": "failed",
            "message": f"Mandi sync encountered an error. Preserving existing PostgreSQL data.",
            "records_fetched": 0,
            "records_inserted": 0,
        }
    finally:
        _sync_lock.release()


def get_sync_status(db: Session) -> Dict[str, Any]:
    """Returns safe operational status without exposing secrets."""
    total_stored = db.query(MandiPrice).count()
    last_sync = _sync_metadata.get("last_successful_sync")
    stale_hours = get_stale_after_hours()

    is_stale = False
    if last_sync is None:
        # Check latest record fetched_at in DB
        latest_rec = db.query(MandiPrice).order_by(MandiPrice.fetched_at.desc()).first()
        if latest_rec and latest_rec.fetched_at:
            last_sync = latest_rec.fetched_at

    if last_sync:
        now = datetime.now(timezone.utc)
        sync_dt = last_sync if last_sync.tzinfo else last_sync.replace(tzinfo=timezone.utc)
        age = now - sync_dt
        if age > timedelta(hours=stale_hours):
            is_stale = True

    return {
        "last_successful_sync": last_sync,
        "last_attempted_sync": _sync_metadata.get("last_attempted_sync"),
        "records_stored": total_stored,
        "last_sync_status": _sync_metadata.get("last_sync_status", "idle"),
        "is_stale": is_stale,
        "stale_after_hours": stale_hours,
        "sync_interval_hours": get_sync_interval_hours(),
        "has_api_key": bool(get_api_key()),
        "message": (
            "Operating on live government mandi prices"
            if total_stored > 0 and not is_stale
            else ("Operating on stale stored mandi prices" if total_stored > 0 else "Operating on demo market benchmarks")
        ),
    }


def find_reference_mandi_price(
    commodity: str,
    location: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = None,
) -> Dict[str, Any]:
    """Hierarchically discovers the best reference mandi price:

    1. Commodity + Matching Market
    2. Commodity + Matching State
    3. Commodity latest across all markets
    4. Honest Demo Fallback (never labeled live)
    """
    comm_clean = commodity.strip().title()
    max_markup = get_max_markup_percent()
    stale_threshold = get_stale_after_hours()

    # Query DB if database session is provided
    if db:
        query = db.query(MandiPrice).filter(MandiPrice.commodity.ilike(comm_clean))

        # Check location match first
        rec = None
        if location:
            loc_clean = location.strip().title()
            rec = query.filter(MandiPrice.market.ilike(f"%{loc_clean}%")).order_by(MandiPrice.fetched_at.desc()).first()

        # Check state match
        if not rec and state:
            rec = query.filter(MandiPrice.state.ilike(f"%{state.strip()}%")).order_by(MandiPrice.fetched_at.desc()).first()

        # Fallback to latest commodity record
        if not rec:
            rec = query.order_by(MandiPrice.fetched_at.desc()).first()

        if rec:
            # Evaluate freshness
            now = datetime.now(timezone.utc)
            fetched_at = rec.fetched_at if rec.fetched_at.tzinfo else rec.fetched_at.replace(tzinfo=timezone.utc)
            age_hours = (now - fetched_at).total_seconds() / 3600.0

            status_label = "live" if age_hours <= stale_threshold else "stale"
            ref_price_kg = float(rec.price_per_kg)
            max_allowed = round(ref_price_kg * (1.0 + max_markup / 100.0), 2)

            explanation = (
                f"Reference rate: ₹{ref_price_kg:.2f}/kg ({rec.unit}: ₹{rec.modal_price:.2f}) "
                f"from {rec.market} Mandi ({rec.state}) on {rec.price_date}. "
                f"Maximum permitted listing price (+{int(max_markup)}% limit): ₹{max_allowed:.2f}/kg."
            )

            return {
                "commodity": rec.commodity,
                "market": rec.market,
                "state": rec.state,
                "district": rec.district,
                "variety": rec.variety,
                "grade": rec.grade,
                "price_date": rec.price_date,
                "modal_price": float(rec.modal_price),
                "price_per_kg": ref_price_kg,
                "unit": rec.unit,
                "price_type_used": "modal_price",
                "source": rec.source,
                "status": status_label,
                "max_markup_percent": max_markup,
                "max_allowed_price": max_allowed,
                "freshness_hours": round(age_hours, 1),
                "explanation": explanation,
            }

    # Case C: Demo Fallback
    key = comm_clean.lower()
    demo_match = None
    for k, v in DEMO_MANDI_BENCHMARKS.items():
        if k in key or key in k:
            demo_match = v
            break

    if not demo_match:
        # Default baseline
        demo_match = {
            "commodity": comm_clean,
            "market": location or "Patiala",
            "state": state or "Punjab",
            "district": location or "Patiala",
            "variety": "Standard",
            "grade": "FAQ",
            "modal_price": 2500.0,
            "price_per_kg": 25.0,
            "unit": "Rs/Quintal",
            "source": "Mandi Market Baseline (Demo)",
        }

    ref_price_kg = float(demo_match["price_per_kg"])
    max_allowed = round(ref_price_kg * (1.0 + max_markup / 100.0), 2)
    explanation = (
        f"Benchmark demo reference rate: ₹{ref_price_kg:.2f}/kg "
        f"for {demo_match['market']} Mandi ({demo_match['state']}). "
        f"Maximum permitted listing price (+{int(max_markup)}% limit): ₹{max_allowed:.2f}/kg. (DEMO FALLBACK)"
    )

    return {
        "commodity": demo_match["commodity"],
        "market": demo_match["market"],
        "state": demo_match["state"],
        "district": demo_match.get("district"),
        "variety": demo_match.get("variety"),
        "grade": demo_match.get("grade"),
        "price_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "modal_price": float(demo_match["modal_price"]),
        "price_per_kg": ref_price_kg,
        "unit": demo_match["unit"],
        "price_type_used": "modal_price",
        "source": demo_match["source"],
        "status": "demo",
        "max_markup_percent": max_markup,
        "max_allowed_price": max_allowed,
        "freshness_hours": None,
        "explanation": explanation,
    }


def validate_farmer_pricing(
    commodity: str,
    entered_price: float,
    location: Optional[str] = None,
    db: Session = None,
) -> Tuple[bool, Dict[str, Any], Optional[Dict[str, Any]]]:
    """Validates that a farmer's listing price does not exceed +100% markup

    over the current mandi modal reference price.
    Returns:
        (is_valid, ref_info, error_details_if_invalid)
    """
    ref_info = find_reference_mandi_price(commodity=commodity, location=location, db=db)
    max_allowed = ref_info["max_allowed_price"]

    if entered_price > max_allowed:
        error_details = {
            "farmer_entered_price": entered_price,
            "reference_mandi_price": ref_info["price_per_kg"],
            "maximum_allowed_price": max_allowed,
            "max_markup_percent": ref_info["max_markup_percent"],
            "market": ref_info["market"],
            "state": ref_info["state"],
            "reference_date": ref_info["price_date"],
            "unit": "kg",
            "status": ref_info["status"],
            "reason": (
                f"Entered price ₹{entered_price:.2f}/kg exceeds maximum allowed price of "
                f"₹{max_allowed:.2f}/kg (+{int(ref_info['max_markup_percent'])}% maximum markup "
                f"over current {ref_info['status']} mandi reference price ₹{ref_info['price_per_kg']:.2f}/kg "
                f"from {ref_info['market']} Mandi)."
            ),
        }
        return False, ref_info, error_details

    return True, ref_info, None
