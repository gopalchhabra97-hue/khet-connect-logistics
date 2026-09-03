"""FastAPI Router for Order Payments, Settlement, Transportation, OTP, Invoices, and Driver Payouts."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.database import get_db_session
from app.models.driver import Driver
from app.models.order import DriverPayout, Order, Payment
from app.models.product import Product
from app.models.user import User
from app.schemas import (
    AdvancePaymentResponse,
    DeliveryOTPGenerateResponse,
    DeliveryOTPVerifyRequest,
    DeliveryOTPVerifyResponse,
    DriverPayoutResponse,
    FinalPaymentResponse,
    PaymentResponse,
    TransportationChargeResponse,
)
from app.services.invoice_service import generate_order_invoice_pdf
from app.services.otp_service import generate_delivery_otp, verify_delivery_otp
from app.services.transportation_service import calculate_transportation_charge

router = APIRouter(tags=["Payments & Settlement"])


def get_order_or_404(order_id: str, db: Session) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found",
        )
    return order


# 1. Advance Payment (30%)
@router.post("/orders/{order_id}/payments/advance", response_model=AdvancePaymentResponse)
def pay_advance(
    order_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Processes simulated 30% advance payment for an order by the authenticated buyer."""
    order = get_order_or_404(order_id, db)

    # Verify authorization (buyer who placed order or admin)
    if current_user.role != "admin" and current_user.id != order.buyer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer who placed this order or an admin can pay the advance.",
        )

    # Check order eligibility
    if order.status in ["Rejected", "Cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pay advance for order with status '{order.status}'",
        )

    # Duplicate payment guard
    if order.advance_payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advance payment of 30% has already been completed for this order.",
        )

    # Calculate subtotal and advance
    subtotal = float(order.product_subtotal or (order.quantity * order.price_per_unit))
    advance_amount = round(subtotal * 0.30, 2)
    remaining_amount = round(subtotal * 0.70, 2)

    # Ensure transportation charge is calculated
    if not order.transportation_charge:
        _, _, transport_charge, _ = calculate_transportation_charge(
            order.pickup_location, order.delivery_location, order.quantity
        )
        order.transportation_charge = transport_charge

    # Record Payment transaction in PostgreSQL
    txn_ref = f"TXN-ADV-{uuid.uuid4().hex[:10].upper()}"
    payment_record = Payment(
        id=f"PAY-ADV-{uuid.uuid4().hex[:8].upper()}",
        order_id=order.id,
        buyer_id=order.buyer_id,
        payment_type="advance",
        amount=advance_amount,
        status="paid",
        payment_method="simulated",
        transaction_reference=txn_ref,
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment_record)

    # Update Order settlement state
    order.product_subtotal = subtotal
    order.advance_percentage = 30.0
    order.advance_amount = advance_amount
    order.remaining_product_amount = remaining_amount
    order.advance_payment_status = "paid"
    order.total_payable_amount = subtotal + float(order.transportation_charge)
    order.payment_status = "advance_paid"

    db.commit()
    db.refresh(order)
    db.refresh(payment_record)

    return AdvancePaymentResponse(
        order_id=order.id,
        product_subtotal=subtotal,
        advance_percentage=30.0,
        advance_amount=advance_amount,
        advance_payment_status="paid",
        payment_status=order.payment_status,
        transaction_reference=txn_ref,
        payment=PaymentResponse.from_orm(payment_record),
        message=f"Advance payment of ₹{advance_amount:,.2f} (30%) completed successfully.",
    )


# 2. Transportation Charge Calculation
@router.get("/orders/{order_id}/transportation-charge", response_model=TransportationChargeResponse)
def get_order_transportation_charge(
    order_id: str,
    rate_per_km: Optional[float] = Query(None, ge=1.0, le=100.0, description="Optional custom rate per km"),
    db: Session = Depends(get_db_session),
):
    """Calculates and returns transparent freight charge for the order route."""
    order = get_order_or_404(order_id, db)
    dist, rate, charge, explanation = calculate_transportation_charge(
        pickup_location=order.pickup_location,
        delivery_location=order.delivery_location,
        quantity_kg=float(order.quantity),
        rate_per_km=rate_per_km if rate_per_km else 12.0,
    )

    # Persist calculation on order if not yet recorded
    if not order.transportation_charge or float(order.transportation_charge) != charge:
        order.transportation_charge = charge
        if order.product_subtotal:
            order.total_payable_amount = float(order.product_subtotal) + charge
        db.commit()

    return TransportationChargeResponse(
        order_id=order.id,
        pickup_location=order.pickup_location,
        delivery_location=order.delivery_location,
        distance_km=dist,
        rate_per_km=rate,
        transportation_charge=charge,
        explanation=explanation,
    )


# 3. Final Payment (Remaining 70% + Separate Transportation Charge)
@router.post("/orders/{order_id}/payments/final", response_model=FinalPaymentResponse)
def pay_final(
    order_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Processes final settlement payment by buyer upon verified physical delivery."""
    order = get_order_or_404(order_id, db)

    # Authorization
    if current_user.role != "admin" and current_user.id != order.buyer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer who placed this order or an admin can make the final payment.",
        )

    # State guards: Delivery must be confirmed first
    if order.status != "Delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Final payment cannot be processed before delivery. Current order status: '{order.status}'",
        )

    # State guards: Advance must be paid
    if order.advance_payment_status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final payment requires advance payment to be completed first.",
        )

    # Duplicate final payment guard
    if order.remaining_payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final payment has already been settled for this order.",
        )

    # Calculate remaining amounts
    subtotal = float(order.product_subtotal or (order.quantity * order.price_per_unit))
    advance_paid = float(order.advance_amount or round(subtotal * 0.30, 2))
    remaining_product = float(order.remaining_product_amount or round(subtotal * 0.70, 2))
    transport_charge = float(order.transportation_charge or 600.0)

    # Final settlement amount = Remaining 70% product + Transportation charge
    final_amount = round(remaining_product + transport_charge, 2)
    total_buyer_payment = round(subtotal + transport_charge, 2)

    # Record Payment
    txn_ref = f"TXN-FIN-{uuid.uuid4().hex[:10].upper()}"
    payment_record = Payment(
        id=f"PAY-FIN-{uuid.uuid4().hex[:8].upper()}",
        order_id=order.id,
        buyer_id=order.buyer_id,
        payment_type="final",
        amount=final_amount,
        status="paid",
        payment_method="simulated",
        transaction_reference=txn_ref,
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment_record)

    # Update order settlement
    order.remaining_payment_status = "paid"
    order.payment_status = "fully_paid"
    order.total_payable_amount = total_buyer_payment

    db.commit()
    db.refresh(order)
    db.refresh(payment_record)

    return FinalPaymentResponse(
        order_id=order.id,
        product_subtotal=subtotal,
        advance_already_paid=advance_paid,
        remaining_product_amount=remaining_product,
        transportation_charge=transport_charge,
        final_payment_amount=final_amount,
        total_buyer_payment=total_buyer_payment,
        payment_status=order.payment_status,
        transaction_reference=txn_ref,
        payment=PaymentResponse.from_orm(payment_record),
        message=(
            f"Final settlement of ₹{final_amount:,.2f} (₹{remaining_product:,.2f} remaining product "
            f"+ ₹{transport_charge:,.2f} transportation) completed successfully."
        ),
    )


# 4. Delivery OTP: Generation
@router.post("/orders/{order_id}/delivery-otp/generate", response_model=DeliveryOTPGenerateResponse)
def generate_order_otp(
    order_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Generates a secure 6-digit delivery OTP for the order."""
    order = get_order_or_404(order_id, db)

    otp_code, expires_at = generate_delivery_otp()
    order.delivery_otp = otp_code
    order.delivery_otp_expires_at = expires_at
    order.delivery_otp_attempts = 0

    db.commit()

    return DeliveryOTPGenerateResponse(
        order_id=order.id,
        message="Delivery OTP generated. Provide this code to the driver upon receiving produce.",
        demo_otp=otp_code,
        expires_at=expires_at,
    )


# 5. Delivery OTP: Verification
@router.post("/orders/{order_id}/delivery-otp/verify", response_model=DeliveryOTPVerifyResponse)
def verify_order_otp(
    order_id: str,
    payload: DeliveryOTPVerifyRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Driver verifies the 6-digit OTP provided by the buyer to confirm delivery."""
    # Check driver or admin role
    if current_user.role not in ["driver", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assigned drivers or administrators can verify delivery OTP.",
        )

    order = get_order_or_404(order_id, db)

    # Driver boundary check (if order already has assigned driver, verify it matches)
    if current_user.role == "driver" and order.assigned_driver_id and order.assigned_driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the assigned driver for this delivery order.",
        )

    is_valid, message = verify_delivery_otp(
        entered_otp=payload.otp,
        stored_otp=order.delivery_otp,
        expires_at=order.delivery_otp_expires_at,
        current_attempts=order.delivery_otp_attempts or 0,
    )

    if not is_valid:
        order.delivery_otp_attempts = (order.delivery_otp_attempts or 0) + 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    # Success: transition order to Delivered
    order.status = "Delivered"
    order.delivery_confirmed_at = datetime.now(timezone.utc)
    if not order.assigned_driver_id and current_user.role == "driver":
        order.assigned_driver_id = current_user.id

    # Create or update driver payout record
    transport_charge = float(order.transportation_charge or 600.0)
    driver_id = order.assigned_driver_id or current_user.id
    existing_payout = db.query(DriverPayout).filter(DriverPayout.order_id == order.id).first()
    if not existing_payout:
        payout = DriverPayout(
            id=f"PO-{uuid.uuid4().hex[:8].upper()}",
            order_id=order.id,
            driver_id=driver_id,
            amount=transport_charge,
            status="payable",
        )
        db.add(payout)
    else:
        existing_payout.status = "payable"

    db.commit()
    db.refresh(order)

    return DeliveryOTPVerifyResponse(
        order_id=order.id,
        status=order.status,
        message="Delivery confirmed successfully via OTP. Order marked as Delivered.",
        delivery_confirmed_at=order.delivery_confirmed_at,
        driver_payout_status="payable",
    )


# 6. Digital Invoice PDF Generation
@router.get("/orders/{order_id}/invoice")
def get_order_invoice(
    order_id: str,
    db: Session = Depends(get_db_session),
):
    """Generates and downloads a real ReportLab PDF tax invoice for the order."""
    order = get_order_or_404(order_id, db)
    product = db.query(Product).filter(Product.id == order.product_id).first()

    pdf_bytes = generate_order_invoice_pdf(order, product)
    filename = f"khetsetu_invoice_{order.id.replace('#', '')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": "application/pdf",
        },
    )


# 7. Driver Transportation Payouts
@router.get("/drivers/{driver_id}/payouts", response_model=List[DriverPayoutResponse])
def get_driver_payouts(
    driver_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Lists transportation payout records for a driver."""
    if current_user.role != "admin" and current_user.id != driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own transportation payouts.",
        )

    payouts = db.query(DriverPayout).filter(DriverPayout.driver_id == driver_id).all()
    return payouts


@router.patch("/drivers/{driver_id}/payouts/{payout_id}/pay", response_model=DriverPayoutResponse)
def pay_driver_payout(
    driver_id: str,
    payout_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_role("admin")),
):
    """Admin settles and marks a driver transportation payout as paid."""
    payout = db.query(DriverPayout).filter(
        DriverPayout.id == payout_id,
        DriverPayout.driver_id == driver_id,
    ).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payout record '{payout_id}' not found for driver '{driver_id}'",
        )

    if payout.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payout has already been marked as paid.",
        )

    payout.status = "paid"
    payout.paid_at = datetime.now(timezone.utc)
    payout.transaction_reference = f"TXN-PO-{uuid.uuid4().hex[:8].upper()}"

    db.commit()
    db.refresh(payout)
    return payout
