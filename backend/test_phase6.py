"""Comprehensive test suite for Phase 6: Order Settlements, Payments, Transportation, OTP, Invoices & Payouts."""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api/v1"


def api_call(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            # If PDF or non-json
            content_type = resp.headers.get("Content-Type", "")
            if "application/pdf" in content_type:
                return resp.getcode(), content
            decoded = content.decode("utf-8")
            return resp.getcode(), json.loads(decoded) if decoded else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed


def main():
    print("=" * 65)
    print("PHASE 6 TEST SUITE: SETTLEMENT, PAYMENTS, OTP, INVOICE & PAYOUTS")
    print("=" * 65 + "\n")

    created_order_ids = []
    created_product_ids = []
    created_payment_ids = []
    created_payout_ids = []

    # Get auth tokens
    _, buyer_res = api_call("POST", "/auth/login", {"email": "buyer@demo.com", "password": "demo123"})
    buyer_token = buyer_res["access_token"]
    buyer_id = buyer_res["user"]["id"]

    _, farmer_res = api_call("POST", "/auth/login", {"email": "farmer@demo.com", "password": "demo123"})
    farmer_token = farmer_res["access_token"]

    _, driver_res = api_call("POST", "/auth/login", {"email": "driver@demo.com", "password": "demo123"})
    driver_token = driver_res["access_token"]
    driver_id = driver_res["user"]["id"]

    _, admin_res = api_call("POST", "/auth/login", {"email": "admin@demo.com", "password": "demo123"})
    admin_token = admin_res["access_token"]

    test_order_id = "#TEST-SETTLE-01"
    test_order_id_2 = "#TEST-SETTLE-02"

    try:
        db_url = os.getenv("DATABASE_URL")
        assert db_url, "DATABASE_URL environment variable is not configured"
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # 1. Create temporary test orders
        cur.execute("""
            INSERT INTO orders (
                id, buyer_id, buyer_name, product_id, product_name, quantity, unit, price_per_unit,
                pickup_location, delivery_location, order_date, expected_delivery, status,
                product_subtotal, advance_percentage, advance_amount, advance_payment_status,
                remaining_product_amount, remaining_payment_status, transportation_charge,
                total_payable_amount, payment_status, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
            )
        """, (
            test_order_id, buyer_id, "Anita Sharma", "P-1001", "Tomato", 400, "kg", 25.0,
            "Patiala", "Chandigarh", "2026-09-01", "2026-09-04", "Accepted",
            10000.00, 30.0, 3000.00, "unpaid", 7000.00, "unpaid", 792.00, 10792.00, "pending"
        ))
        created_order_ids.append(test_order_id)

        cur.execute("""
            INSERT INTO orders (
                id, buyer_id, buyer_name, product_id, product_name, quantity, unit, price_per_unit,
                pickup_location, delivery_location, order_date, expected_delivery, status,
                product_subtotal, advance_percentage, advance_amount, advance_payment_status,
                remaining_product_amount, remaining_payment_status, transportation_charge,
                total_payable_amount, payment_status, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
            )
        """, (
            test_order_id_2, buyer_id, "Anita Sharma", "P-1002", "Potato", 200, "kg", 18.0,
            "Patiala", "Ludhiana", "2026-09-01", "2026-09-04", "Pending",
            3600.00, 30.0, 1080.00, "unpaid", 2520.00, "unpaid", 1116.00, 4716.00, "pending"
        ))
        created_order_ids.append(test_order_id_2)

        conn.commit()
        cur.close()
        conn.close()

        # 2. Verify initial payment state
        code, ord_data = api_call("GET", f"/orders/{urllib.parse.quote(test_order_id)}")
        assert code == 200
        assert ord_data["advance_payment_status"] == "unpaid"
        assert ord_data["payment_status"] == "pending"
        assert float(ord_data["product_subtotal"]) == 10000.0
        print(f"[PASS] 1 & 2. Test order created with initial state: subtotal=₹10,000, advance=unpaid, status=pending")

        # 3 & 4. Calculate transportation charge and verify separation
        code, tc_data = api_call("GET", f"/orders/{urllib.parse.quote(test_order_id)}/transportation-charge")
        assert code == 200
        assert tc_data["distance_km"] == 66.0
        assert tc_data["rate_per_km"] == 12.0
        assert tc_data["transportation_charge"] == 792.0
        assert "separate" in tc_data["explanation"].lower()
        print(f"[PASS] 3 & 4. Transportation charge calculated: ₹792.00 (66km @ ₹12/km) kept separate from crop price")

        # 5 & 6. Pay 30% advance
        code, adv_res = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/payments/advance", token=buyer_token)
        assert code == 200
        assert adv_res["advance_amount"] == 3000.0
        assert adv_res["advance_payment_status"] == "paid"
        assert "TXN-ADV-" in adv_res["transaction_reference"]
        created_payment_ids.append(adv_res["payment"]["id"])
        print(f"[PASS] 5 & 6. 30% advance payment successful: ₹3,000 paid. Ref: {adv_res['transaction_reference']}")

        # 7. Reject duplicate advance payment
        code, dup_adv = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/payments/advance", token=buyer_token)
        assert code == 400
        print(f"[PASS] 7. Duplicate advance payment rejected -> 400 Bad Request ({dup_adv.get('detail')})")

        # 8. Attempt final payment before delivery -> must be rejected
        code, premature_final = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/payments/final", token=buyer_token)
        assert code == 400
        print(f"[PASS] 8. Premature final payment before delivery rejected -> 400 Bad Request ({premature_final.get('detail')})")

        # 9. Generate delivery OTP
        code, otp_res = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/delivery-otp/generate", token=buyer_token)
        assert code == 200
        demo_otp = otp_res["demo_otp"]
        assert len(demo_otp) == 6 and demo_otp.isdigit()
        print(f"[PASS] 9. Delivery OTP generated: {demo_otp} (expires: {otp_res['expires_at']})")

        # 10. Attempt verification with invalid OTP
        code, invalid_otp_res = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/delivery-otp/verify", {"otp": "000000"}, token=driver_token)
        assert code == 400
        print(f"[PASS] 10. Invalid OTP rejected -> 400 Bad Request ({invalid_otp_res.get('detail')})")

        # 11 & 12. Correct OTP confirms delivery and triggers payable driver payout
        code, valid_otp_res = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/delivery-otp/verify", {"otp": demo_otp}, token=driver_token)
        assert code == 200
        assert valid_otp_res["status"] == "Delivered"
        assert valid_otp_res["driver_payout_status"] == "payable"
        print(f"[PASS] 11 & 12. Correct OTP verified: Order marked as 'Delivered', driver payout marked as 'payable'")

        # 13. Attempt final payment on un-delivered order (test_order_id_2)
        code, un_deliv_final = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id_2)}/payments/final", token=buyer_token)
        assert code == 400
        print(f"[PASS] 13. Final payment on non-delivered order #2 rejected -> 400 Bad Request")

        # 14 & 15. Pay remaining 70% + transportation charge after delivery
        code, final_res = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/payments/final", token=buyer_token)
        assert code == 200
        # remaining product = 7000, transport = 792 -> final = 7792
        assert final_res["remaining_product_amount"] == 7000.0
        assert final_res["transportation_charge"] == 792.0
        assert final_res["final_payment_amount"] == 7792.0
        assert final_res["total_buyer_payment"] == 10792.0
        assert final_res["payment_status"] == "fully_paid"
        created_payment_ids.append(final_res["payment"]["id"])
        print(f"[PASS] 14 & 15. Final settlement paid: ₹7,792 (₹7,000 product + ₹792 freight). Total: ₹10,792. Status: fully_paid")

        # 16. Reject duplicate final payment
        code, dup_final = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id)}/payments/final", token=buyer_token)
        assert code == 400
        print(f"[PASS] 16. Duplicate final payment rejected -> 400 Bad Request ({dup_final.get('detail')})")

        # 17. Generate and verify digital PDF invoice
        code, pdf_bytes = api_call("GET", f"/orders/{urllib.parse.quote(test_order_id)}/invoice")
        assert code == 200
        assert isinstance(pdf_bytes, bytes) and pdf_bytes.startswith(b"%PDF-")
        assert len(pdf_bytes) > 2000
        print(f"[PASS] 17. Digital PDF invoice generated via ReportLab ({len(pdf_bytes)} bytes, starts with '%PDF-')")

        # 18. Driver payout record query
        code, payouts = api_call("GET", f"/drivers/{driver_id}/payouts", token=driver_token)
        assert code == 200 and isinstance(payouts, list)
        matching_payout = next((p for p in payouts if p["order_id"] == test_order_id), None)
        assert matching_payout is not None
        assert matching_payout["status"] == "payable"
        assert matching_payout["amount"] == 792.0
        created_payout_ids.append(matching_payout["id"])
        print(f"[PASS] 18. Driver payout verified: {matching_payout['id']} - ₹{matching_payout['amount']} (status: {matching_payout['status']})")

        # 19. Admin settles driver payout
        code, settled_payout = api_call("PATCH", f"/drivers/{driver_id}/payouts/{matching_payout['id']}/pay", token=admin_token)
        assert code == 200
        assert settled_payout["status"] == "paid"
        assert "TXN-PO-" in settled_payout["transaction_reference"]
        print(f"[PASS] 19. Admin marked driver payout as paid. Ref: {settled_payout['transaction_reference']}")

        # 20. RBAC: Farmer cannot pay buyer's order
        code, unauthorized_pay = api_call("POST", f"/orders/{urllib.parse.quote(test_order_id_2)}/payments/advance", token=farmer_token)
        assert code == 403
        print(f"[PASS] 20. Farmer forbidden from paying buyer's order -> 403 Forbidden ({unauthorized_pay.get('detail')})")

    finally:
        # Cleanup temporary records
        print("\n--- Cleaning up temporary test records ---")
        db_url = os.getenv("DATABASE_URL")
        assert db_url, "DATABASE_URL environment variable is not configured"
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        for pid in created_payout_ids:
            cur.execute("DELETE FROM driver_payouts WHERE id = %s", (pid,))
        for pay_id in created_payment_ids:
            cur.execute("DELETE FROM payments WHERE id = %s", (pay_id,))
        for oid in created_order_ids:
            cur.execute("DELETE FROM driver_payouts WHERE order_id = %s", (oid,))
            cur.execute("DELETE FROM payments WHERE order_id = %s", (oid,))
            cur.execute("DELETE FROM orders WHERE id = %s", (oid,))

        conn.commit()

        # Check final seed counts
        cur.execute("SELECT count(*) FROM users")
        u_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM vehicles")
        v_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM drivers")
        d_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM products")
        p_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM orders")
        o_count = cur.fetchone()[0]

        cur.close()
        conn.close()

        print(f"PostgreSQL Verified Counts: {u_count} users, {v_count} vehicles, {d_count} drivers, {p_count} products, {o_count} orders")
        assert u_count == 14 and v_count == 3 and d_count == 3 and p_count == 7 and o_count == 7
        print("[PASS] Seed data integrity verified 100% intact!")

    print("\n" + "=" * 65)
    print("ALL PHASE 6 SETTLEMENT, PAYMENT & OTP TESTS PASSED (100% SUCCESS)!")
    print("=" * 65)


if __name__ == "__main__":
    main()
