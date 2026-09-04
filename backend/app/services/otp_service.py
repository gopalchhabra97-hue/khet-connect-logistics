"""Delivery OTP Service.

Generates and verifies cryptographically secure 6-digit OTPs for proof of delivery.
Includes attempt throttling and expiration safety.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple

MAX_OTP_ATTEMPTS = 3
OTP_EXPIRY_MINUTES = 30


def generate_delivery_otp() -> Tuple[str, datetime]:
    """Generates a secure 6-digit OTP and UTC expiration timestamp."""
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    return code, expires_at


def verify_delivery_otp(
    entered_otp: str,
    stored_otp: str,
    expires_at: datetime,
    current_attempts: int,
) -> Tuple[bool, str]:
    """Verifies entered OTP against stored parameters.

    Returns:
        (is_valid, message)
    """
    if current_attempts >= MAX_OTP_ATTEMPTS:
        return False, f"Maximum verification attempts ({MAX_OTP_ATTEMPTS}) exceeded. Please generate a new OTP."

    # Handle naive vs timezone-aware datetime comparison
    now = datetime.now(timezone.utc)
    if expires_at:
        if expires_at.tzinfo is None:
            now_cmp = datetime.utcnow()
        else:
            now_cmp = now

        if now_cmp > expires_at:
            return False, "Delivery OTP has expired. Please request a fresh OTP."

    if not stored_otp or entered_otp.strip() != stored_otp.strip():
        remaining = max(0, MAX_OTP_ATTEMPTS - (current_attempts + 1))
        return False, f"Invalid delivery OTP. {remaining} attempt(s) remaining."

    return True, "OTP verified successfully. Delivery confirmed."


def generate_pickup_otp() -> Tuple[str, datetime]:
    """Generates a secure 6-digit OTP and UTC expiration timestamp for pickup verification."""
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    return code, expires_at


def verify_pickup_otp(
    entered_otp: str,
    stored_otp: str,
    expires_at: datetime,
    current_attempts: int,
) -> Tuple[bool, str]:
    """Verifies entered pickup OTP against stored parameters.

    Returns:
        (is_valid, message)
    """
    if current_attempts >= MAX_OTP_ATTEMPTS:
        return False, f"Maximum verification attempts ({MAX_OTP_ATTEMPTS}) exceeded. Please generate a new Pickup OTP."

    now = datetime.now(timezone.utc)
    if expires_at:
        if expires_at.tzinfo is None:
            now_cmp = datetime.utcnow()
        else:
            now_cmp = now

        if now_cmp > expires_at:
            return False, "Pickup OTP has expired. Please request a fresh Pickup OTP."

    if not stored_otp or entered_otp.strip() != stored_otp.strip():
        remaining = max(0, MAX_OTP_ATTEMPTS - (current_attempts + 1))
        return False, f"Invalid pickup OTP. {remaining} attempt(s) remaining."

    return True, "Pickup OTP verified successfully. Goods custody confirmed."

