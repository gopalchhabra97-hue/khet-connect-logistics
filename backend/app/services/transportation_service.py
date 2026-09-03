"""Transportation charge calculation service.

Calculates transparent, explainable freight charges based on distance and configurable per-km rates.
Kept strictly separate from the farmer's product price.
"""

from typing import Tuple

# Regional highway distance matrix (km) between agricultural hubs and major mandis
DISTANCE_MATRIX = {
    "Patiala": {"Chandigarh": 66.0, "Ambala": 60.0, "Kurukshetra": 96.0, "Ludhiana": 93.0, "Karnal": 130.0, "Patiala": 0.0},
    "Chandigarh": {"Patiala": 66.0, "Ambala": 60.0, "Kurukshetra": 88.0, "Ludhiana": 100.0, "Karnal": 122.0, "Chandigarh": 0.0},
    "Ambala": {"Patiala": 60.0, "Chandigarh": 60.0, "Kurukshetra": 40.0, "Ludhiana": 145.0, "Karnal": 78.0, "Ambala": 0.0},
    "Kurukshetra": {"Patiala": 96.0, "Chandigarh": 88.0, "Ambala": 40.0, "Ludhiana": 180.0, "Karnal": 39.0, "Kurukshetra": 0.0},
    "Ludhiana": {"Patiala": 93.0, "Chandigarh": 100.0, "Ambala": 145.0, "Kurukshetra": 180.0, "Karnal": 215.0, "Ludhiana": 0.0},
    "Karnal": {"Patiala": 130.0, "Chandigarh": 122.0, "Ambala": 78.0, "Kurukshetra": 39.0, "Ludhiana": 215.0, "Karnal": 0.0},
}

DEFAULT_DISTANCE_KM = 60.0
DEFAULT_BASE_RATE_PER_KM = 12.0  # ₹12/km base freight rate
DEFAULT_MIN_CHARGE = 300.0  # ₹300 minimum dispatch handling


def calculate_transportation_charge(
    pickup_location: str,
    delivery_location: str,
    quantity_kg: float = 0.0,
    rate_per_km: float = DEFAULT_BASE_RATE_PER_KM,
) -> Tuple[float, float, float, str]:
    """Calculates transparent freight charges between pickup and delivery hubs.

    Returns:
        (distance_km, effective_rate_per_km, transportation_charge, explanation)
    """
    pickup_clean = pickup_location.strip().title() if pickup_location else "Patiala"
    delivery_clean = delivery_location.strip().title() if delivery_location else "Chandigarh"

    # Query matrix or fallback
    distance_km = DISTANCE_MATRIX.get(pickup_clean, {}).get(delivery_clean)
    if distance_km is None:
        # Check reverse
        distance_km = DISTANCE_MATRIX.get(delivery_clean, {}).get(pickup_clean, DEFAULT_DISTANCE_KM)

    # Cargo weight multiplier (e.g. heavy cargo > 500kg scales freight rate slightly)
    effective_rate = rate_per_km
    if quantity_kg > 500.0:
        extra_tiers = int((quantity_kg - 500.0) // 500.0) + 1
        effective_rate += extra_tiers * 1.5

    raw_charge = distance_km * effective_rate
    final_charge = max(DEFAULT_MIN_CHARGE, round(raw_charge, 2))

    explanation = (
        f"Highway route {pickup_clean} -> {delivery_clean}: {distance_km:.1f} km at "
        f"₹{effective_rate:.2f}/km. Total transportation charge: ₹{final_charge:.2f} "
        f"(minimum dispatch fee ₹{DEFAULT_MIN_CHARGE:.2f}). Kept separate from product value."
    )

    return distance_km, effective_rate, final_charge, explanation
