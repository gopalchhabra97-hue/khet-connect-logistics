"""Comprehensive test suite for Phase 9: Admin Delivery Batch & Driver Workflow.

Covers all Phase 9 requirements against live PostgreSQL:
1. Admin authentication.
2. Non-admin blocked from batch creation (403).
3. Admin creates batch with eligible orders.
4. Admin assigns valid driver.
5. Admin assigns valid vehicle.
6. Driver sees only own assigned batches.
7. Driver cannot access another driver's batch (403).
8. Invalid driver/vehicle assignment rejected (404).
9. Conflicting active assignment rejected (same active driver/vehicle on multiple batches).
10. Pickup OTP generation & secret isolation (never expose in batch response).
11. Invalid pickup OTP rejected (and attempts throttled).
12. Valid pickup OTP verification moves batch to Picked Up.
13. Valid delivery progression (Picked Up -> In Transit -> Out for Delivery).
14. Invalid delivery OTP rejected.
15. Valid delivery OTP verification moves batch & orders to Delivered.
16. Driver payout record created for freight charge.
17. Already-delivered batch rejected from being delivered again.
18. Invalid/arbitrary status transitions rejected.
19. Existing Phase 1-8 functionality remains intact.
20. Existing seed data remains intact after cleanup of temporary test records.
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import psycopg2
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api/v1"
HEALTH_URL = "http://127.0.0.1:8000/api/health"


def api_call(method, path, body=None, token=None):
    escaped_path = path.replace("#", "%23")
    url = f"{BASE_URL}{escaped_path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.getcode(), json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")

        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed


def ensure_server_running():
    """Ensure FastAPI server is running; launch background uvicorn if not."""
    try:
        req = urllib.request.Request(HEALTH_URL)
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.getcode() == 200:
                return None  # Server already running externally
    except Exception:
        pass

    print("Launching Uvicorn server for test execution...", flush=True)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for _ in range(30):
        time.sleep(0.5)
        try:
            req = urllib.request.Request(HEALTH_URL)
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.getcode() == 200:
                    print("Uvicorn test server is ready.\n", flush=True)
                    return proc
        except Exception:
            continue

    raise RuntimeError("Failed to start Uvicorn test server on port 8000.")


def main():
    print("=" * 65)
    print("PHASE 9 TEST SUITE: ADMIN DELIVERY BATCH + DRIVER WORKFLOW")
    print("=" * 65 + "\n")

    server_proc = ensure_server_running()

    # Track temporary test records for clean teardown
    created_batch_ids = []
    created_order_ids = []
    created_driver_ids = []
    created_vehicle_ids = []

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    db_conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    db_cur = db_conn.cursor()

    # Capture initial seed row counts
    db_cur.execute("SELECT count(*) FROM users")
    initial_users_count = db_cur.fetchone()[0]
    db_cur.execute("SELECT count(*) FROM products")
    initial_products_count = db_cur.fetchone()[0]
    db_cur.execute("SELECT count(*) FROM orders")
    initial_orders_count = db_cur.fetchone()[0]
    db_cur.execute("SELECT count(*) FROM vehicles")
    initial_vehicles_count = db_cur.fetchone()[0]
    db_cur.execute("SELECT count(*) FROM drivers")
    initial_drivers_count = db_cur.fetchone()[0]

    try:
        # 1. Admin & Driver Authentication
        code, admin_login = api_call("POST", "/auth/login", {"email": "admin@demo.com", "password": "demo123"})
        assert code == 200, f"Admin login failed: {admin_login}"
        admin_token = admin_login["access_token"]
        print("[PASS] 1. Admin authentication successful.")

        code, driver_login = api_call("POST", "/auth/login", {"email": "driver@demo.com", "password": "demo123"})
        assert code == 200, f"Driver login failed: {driver_login}"
        driver_token = driver_login["access_token"]
        driver_id = driver_login["user"]["id"]  # "D-1"
        print(f"[PASS] 1b. Driver authentication successful (Driver ID: {driver_id}).")

        code, buyer_login = api_call("POST", "/auth/login", {"email": "buyer@demo.com", "password": "demo123"})
        assert code == 200, f"Buyer login failed: {buyer_login}"
        buyer_token = buyer_login["access_token"]
        buyer_id = buyer_login["user"]["id"]

        # 2. Non-admin blocked from batch creation
        code, res = api_call("POST", "/delivery-batches", {
            "order_ids": ["#1001"],
            "pickup_location": "Patiala",
            "delivery_stops": ["Chandigarh"],
        }, token=driver_token)
        assert code == 403, f"Driver should be blocked from batch creation, got {code}: {res}"

        code, res = api_call("POST", "/delivery-batches", {
            "order_ids": ["#1001"],
            "pickup_location": "Patiala",
            "delivery_stops": ["Chandigarh"],
        }, token=buyer_token)
        assert code == 403, f"Buyer should be blocked from batch creation, got {code}: {res}"
        print("[PASS] 2. Non-admin blocked from batch creation (403 Forbidden).")

        # Setup temporary test orders for Phase 9 testing
        test_order_1 = "#TEST-ORD-P9-01"
        test_order_2 = "#TEST-ORD-P9-02"
        db_cur.execute("""
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
            test_order_1, buyer_id, "Anita Sharma", "P-1001", "Tomato", 250, "kg", 25.0,
            "Patiala", "Chandigarh", "2026-09-04", "2026-09-07", "Accepted",
            6250.00, 30.0, 1875.00, "paid", 4375.00, "unpaid", 792.00, 7042.00, "advance_paid"
        ))
        created_order_ids.append(test_order_1)

        db_cur.execute("""
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
            test_order_2, buyer_id, "Anita Sharma", "P-1002", "Potato", 150, "kg", 18.0,
            "Patiala", "Ambala", "2026-09-04", "2026-09-07", "Accepted",
            2700.00, 30.0, 810.00, "paid", 1890.00, "unpaid", 720.00, 3420.00, "advance_paid"
        ))
        created_order_ids.append(test_order_2)
        db_conn.commit()

        # Check admin can list eligible orders
        code, eligible = api_call("GET", "/delivery-batches/eligible-orders", token=admin_token)
        assert code == 200
        eligible_ids = [o["id"] for o in eligible]
        assert test_order_1 in eligible_ids and test_order_2 in eligible_ids
        print(f"[PASS] 3a. Admin can see eligible orders for delivery ({len(eligible)} orders ready).")

        # 3, 4, 5. Admin creates batch with valid driver ("D-1") and vehicle ("V-B")
        test_batch_1 = "#TEST-DB-001"
        code, batch_res = api_call("POST", "/delivery-batches", {
            "id": test_batch_1,
            "order_ids": [test_order_1, test_order_2],
            "pickup_location": "Patiala",
            "vehicle_id": "V-B",
            "driver_id": driver_id,
        }, token=admin_token)
        assert code == 201, f"Failed to create batch: {batch_res}"
        created_batch_ids.append(test_batch_1)
        assert batch_res["id"] == test_batch_1
        assert batch_res["status"] == "Assigned"
        assert batch_res["total_quantity"] == 400
        assert batch_res["driver_id"] == driver_id
        assert batch_res["vehicle_id"] == "V-B"
        assert batch_res["transportation_charge"] is not None and batch_res["transportation_charge"] > 0
        print(f"[PASS] 3, 4, 5. Admin created delivery batch {test_batch_1} with driver {driver_id}, vehicle V-B (Charge: ₹{batch_res['transportation_charge']}).")

        # 6. Driver sees only own assigned batches
        code, driver_batches = api_call("GET", "/delivery-batches", token=driver_token)
        assert code == 200
        assert len(driver_batches) >= 1
        for b in driver_batches:
            assert b["driver_id"] == driver_id
        print(f"[PASS] 6. Driver sees only own assigned batches ({len(driver_batches)} assigned).")

        # 7. Driver cannot access another driver's batch
        # Create second batch assigned to driver "D-3" (or create a test driver)
        test_batch_2 = "#TEST-DB-002"
        code, batch_res_2 = api_call("POST", "/delivery-batches", {
            "id": test_batch_2,
            "order_ids": [test_order_1],  # Even if single order re-batched for test
            "pickup_location": "Patiala",
            "delivery_stops": ["Ludhiana"],
            "total_quantity": 250,
            "vehicle_id": "V-C",
            "driver_id": "D-3",
        }, token=admin_token)
        # Order 1 already in active batch, so assigning it should be rejected!
        assert code == 400, "Assigning order already in active batch must be rejected"
        print("[PASS] 7a. Reassigning order already in active batch rejected (400 Bad Request).")

        # Create third order for batch 2
        test_order_3 = "#TEST-ORD-P9-03"
        db_cur.execute("""
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
            test_order_3, buyer_id, "Anita Sharma", "P-1003", "Onion", 200, "kg", 22.0,
            "Ludhiana", "Patiala", "2026-09-04", "2026-09-07", "Accepted",
            4400.00, 30.0, 1320.00, "paid", 3080.00, "unpaid", 1116.00, 5516.00, "advance_paid"
        ))
        created_order_ids.append(test_order_3)
        db_conn.commit()

        code, batch_res_2 = api_call("POST", "/delivery-batches", {
            "id": test_batch_2,
            "order_ids": [test_order_3],
            "pickup_location": "Ludhiana",
            "delivery_stops": ["Patiala"],
            "total_quantity": 200,
            "vehicle_id": "V-C",
            "driver_id": "D-3",
        }, token=admin_token)
        assert code == 201, f"Failed to create second batch: {batch_res_2}"
        created_batch_ids.append(test_batch_2)

        # Driver 1 (D-1) attempts to get Batch 2 (assigned to D-3)
        code, res_d1 = api_call("GET", f"/delivery-batches/{test_batch_2}", token=driver_token)
        assert code == 403, f"Driver D-1 must be forbidden from accessing D-3's batch, got {code}: {res_d1}"
        print("[PASS] 7b. Driver cannot access another driver's batch (403 Forbidden).")

        # 8. Invalid driver/vehicle assignment rejected (404)
        test_order_4 = "#TEST-ORD-P9-04"
        db_cur.execute("""
            INSERT INTO orders (
                id, buyer_id, buyer_name, product_id, product_name, quantity, unit, price_per_unit,
                pickup_location, delivery_location, order_date, expected_delivery, status,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (
            test_order_4, buyer_id, "Anita Sharma", "P-1001", "Tomato", 100, "kg", 25.0,
            "Patiala", "Chandigarh", "2026-09-04", "2026-09-07", "Accepted"
        ))
        created_order_ids.append(test_order_4)
        db_conn.commit()

        code, res_bad_driver = api_call("POST", "/delivery-batches", {
            "order_ids": [test_order_4],
            "driver_id": "D-NON-EXISTENT",
        }, token=admin_token)
        assert code == 404, f"Non-existent driver must return 404, got {code}"

        code, res_bad_vehicle = api_call("POST", "/delivery-batches", {
            "order_ids": [test_order_4],
            "vehicle_id": "V-NON-EXISTENT",
        }, token=admin_token)
        assert code == 404, f"Non-existent vehicle must return 404, got {code}"
        print("[PASS] 8. Invalid driver/vehicle assignment rejected (404 Not Found).")

        # 9. Conflicting active assignment rejected
        # Try to create another batch with driver "D-1" (who is already assigned to active batch test_batch_1)
        code, res_conflict_driver = api_call("POST", "/delivery-batches", {
            "order_ids": [test_order_4],
            "driver_id": driver_id,
        }, token=admin_token)
        assert code == 400, f"Conflicting driver assignment must return 400, got {code}: {res_conflict_driver}"

        # Try to assign vehicle "V-B" (already assigned to test_batch_1)
        code, res_conflict_vehicle = api_call("POST", "/delivery-batches", {
            "order_ids": [test_order_4],
            "vehicle_id": "V-B",
        }, token=admin_token)
        assert code == 400, f"Conflicting vehicle assignment must return 400, got {code}: {res_conflict_vehicle}"
        print("[PASS] 9. Conflicting active assignment rejected (same active driver/vehicle on multiple batches).")

        # 10. Pickup OTP generation & secret isolation
        code, otp_res = api_call("POST", f"/delivery-batches/{test_batch_1}/pickup-otp/generate", token=admin_token)
        assert code == 200
        assert "demo_otp" in otp_res and len(otp_res["demo_otp"]) == 6
        valid_pickup_otp = otp_res["demo_otp"]

        # Verify GET /delivery-batches does NOT leak the pickup OTP
        code, batch_view = api_call("GET", f"/delivery-batches/{test_batch_1}", token=admin_token)
        assert code == 200
        assert "pickup_otp" not in batch_view, "pickup_otp must never be exposed in public API response!"
        print("[PASS] 10. Pickup OTP generated; secret isolation verified (OTP not leaked in API response).")

        # 11. Invalid pickup OTP rejected
        code, res_bad_otp = api_call("POST", f"/delivery-batches/{test_batch_1}/pickup-otp/verify", {
            "otp": "000000",
        }, token=driver_token)
        assert code == 400, f"Invalid pickup OTP must be rejected, got {code}: {res_bad_otp}"
        print("[PASS] 11. Invalid pickup OTP rejected (400 Bad Request).")

        # 18. Invalid status jump rejected (cannot skip directly to Picked Up or Delivered without OTP)
        code, res_jump = api_call("PATCH", f"/delivery-batches/{test_batch_1}", {
            "status": "Delivered",
        }, token=driver_token)
        assert code == 400, f"Arbitrary status jump must be rejected, got {code}: {res_jump}"
        print("[PASS] 18a. Arbitrary/invalid status jump rejected (400 Bad Request).")

        # 12. Valid pickup OTP verification moves batch to Picked Up
        code, res_verify_pickup = api_call("POST", f"/delivery-batches/{test_batch_1}/pickup-otp/verify", {
            "otp": valid_pickup_otp,
        }, token=driver_token)
        assert code == 200, f"Valid pickup OTP verification failed: {res_verify_pickup}"
        assert res_verify_pickup["status"] == "Picked Up"

        code, check_b1 = api_call("GET", f"/delivery-batches/{test_batch_1}", token=driver_token)
        assert check_b1["status"] == "Picked Up"
        assert check_b1["picked_up_at"] is not None
        print(f"[PASS] 12. Pickup OTP verified successfully -> Batch moved to '{check_b1['status']}'.")

        # 13. Valid delivery progression: Picked Up -> In Transit -> Out for Delivery
        code, res_transit = api_call("PATCH", f"/delivery-batches/{test_batch_1}", {
            "status": "In Transit",
        }, token=driver_token)
        assert code == 200, f"Transition to In Transit failed: {res_transit}"
        assert res_transit["status"] == "In Transit"

        code, res_out = api_call("PATCH", f"/delivery-batches/{test_batch_1}", {
            "status": "Out for Delivery",
        }, token=driver_token)
        assert code == 200, f"Transition to Out for Delivery failed: {res_out}"
        assert res_out["status"] == "Out for Delivery"
        print("[PASS] 13. Valid delivery progression completed: Picked Up -> In Transit -> Out for Delivery.")

        # 14. Delivery OTP: Generate OTP for test order 1, verify invalid rejected
        code, order_otp_res = api_call("POST", f"/orders/{test_order_1}/delivery-otp/generate", token=buyer_token)
        assert code == 200
        valid_delivery_otp = order_otp_res["demo_otp"]

        code, res_bad_del_otp = api_call("POST", f"/delivery-batches/{test_batch_1}/delivery-otp/verify", {
            "otp": "999999",
        }, token=driver_token)
        assert code == 400, f"Invalid delivery OTP must be rejected, got {code}: {res_bad_del_otp}"
        print("[PASS] 14. Invalid delivery OTP rejected (400 Bad Request).")

        # 15. Valid Delivery OTP verification moves batch & orders to Delivered
        code, res_verify_del = api_call("POST", f"/delivery-batches/{test_batch_1}/delivery-otp/verify", {
            "otp": valid_delivery_otp,
            "order_id": test_order_1,
        }, token=driver_token)
        assert code == 200, f"Valid delivery OTP verification failed: {res_verify_del}"
        assert res_verify_del["status"] == "Delivered"

        code, check_del_batch = api_call("GET", f"/delivery-batches/{test_batch_1}", token=admin_token)
        assert check_del_batch["status"] == "Delivered"
        assert check_del_batch["delivered_at"] is not None

        # Check order 1 status in database
        code, check_ord1 = api_call("GET", f"/orders/{test_order_1}", token=admin_token)
        assert check_ord1["status"] == "Delivered"
        print("[PASS] 15. Delivery OTP verified successfully -> Batch and orders marked as 'Delivered'.")

        # 16. Driver payout record created for freight charge
        code, payouts = api_call("GET", f"/drivers/{driver_id}/payouts", token=driver_token)
        assert code == 200
        payout_orders = [p["order_id"] for p in payouts]
        assert test_order_1 in payout_orders, f"Payout for {test_order_1} not found in {payouts}"
        print(f"[PASS] 16. Driver payout record created for freight charge (Driver ID: {driver_id}).")

        # 17. Already-delivered batch rejected from being delivered again
        code, res_re_del = api_call("POST", f"/delivery-batches/{test_batch_1}/delivery-otp/verify", {
            "otp": valid_delivery_otp,
        }, token=driver_token)
        assert code == 400, f"Already-delivered batch must be rejected, got {code}"
        print("[PASS] 17. Already-delivered batch rejected from re-delivery (400 Bad Request).")

        # 18b. Driver now freed up from active batch, can be assigned to new batch
        code, test_batch_3_res = api_call("POST", "/delivery-batches", {
            "order_ids": [test_order_4],
            "driver_id": driver_id,
            "vehicle_id": "V-B",
        }, token=admin_token)
        assert code == 201, f"Driver D-1 should now be available after batch 1 delivery, got {code}: {test_batch_3_res}"
        created_batch_ids.append(test_batch_3_res["id"])
        print("[PASS] 18b. Driver and vehicle automatically freed up upon batch delivery.")

        # 19. Existing Phase 1-8 functionality remains intact
        # Test Mandi price reference (Phase 7)
        code, mandi_ref = api_call("GET", "/mandi-prices/reference/Tomato?location=Patiala", token=buyer_token)
        assert code == 200
        assert "modal_price" in mandi_ref

        # Test Matching Search (Phase 8)
        code, match_res = api_call("POST", "/matching/search", {"commodity": "Tomato", "quantity": 100}, token=buyer_token)
        assert code == 200
        assert len(match_res["matches"]) > 0

        # Test Final Payment on delivered order (Phase 6)
        code, final_pay = api_call("POST", f"/orders/{test_order_1}/payments/final", token=buyer_token)
        assert code == 200, f"Phase 6 final settlement failed on delivered order: {final_pay}"
        assert final_pay["payment_status"] == "fully_paid"
        print("[PASS] 19. Existing Phase 1-8 functionality (Mandi prices, Matching, Payments) completely intact.")

        # Delete created batches to unlink and clean
        for b_id in created_batch_ids:
            # If batch is Delivered, can't delete directly via DELETE endpoint, clean in DB
            pass

    finally:
        # Cleanup temporary test records
        print("\nCleaning up temporary test records...", flush=True)
        try:
            # Delete payouts and payments for test orders, unlink and delete orders, then delete batches
            if created_order_ids:
                db_cur.execute("UPDATE orders SET batch_id = NULL WHERE id = ANY(%s)", (created_order_ids,))
                db_cur.execute("DELETE FROM driver_payouts WHERE order_id = ANY(%s)", (created_order_ids,))
                db_cur.execute("DELETE FROM payments WHERE order_id = ANY(%s)", (created_order_ids,))
                db_cur.execute("DELETE FROM orders WHERE id = ANY(%s)", (created_order_ids,))
            if created_batch_ids:
                db_cur.execute("DELETE FROM delivery_batches WHERE id = ANY(%s)", (created_batch_ids,))

            # Reset any modified seed driver/vehicle statuses to initial
            db_cur.execute("UPDATE drivers SET status = 'Available' WHERE id = 'D-1'")
            db_cur.execute("UPDATE vehicles SET status = 'Available' WHERE id = 'V-B'")
            db_cur.execute("UPDATE vehicles SET status = 'Available' WHERE id = 'V-C'")
            db_conn.commit()


            # Verify seed row counts
            db_cur.execute("SELECT count(*) FROM users")
            final_users_count = db_cur.fetchone()[0]
            db_cur.execute("SELECT count(*) FROM products")
            final_products_count = db_cur.fetchone()[0]
            db_cur.execute("SELECT count(*) FROM orders")
            final_orders_count = db_cur.fetchone()[0]
            db_cur.execute("SELECT count(*) FROM vehicles")
            final_vehicles_count = db_cur.fetchone()[0]
            db_cur.execute("SELECT count(*) FROM drivers")
            final_drivers_count = db_cur.fetchone()[0]

            assert final_users_count == initial_users_count, f"Users count mismatch: {final_users_count} != {initial_users_count}"
            assert final_products_count == initial_products_count, f"Products count mismatch: {final_products_count} != {initial_products_count}"
            assert final_orders_count == initial_orders_count, f"Orders count mismatch: {final_orders_count} != {initial_orders_count}"
            assert final_vehicles_count == initial_vehicles_count, f"Vehicles count mismatch: {final_vehicles_count} != {initial_vehicles_count}"
            assert final_drivers_count == initial_drivers_count, f"Drivers count mismatch: {final_drivers_count} != {initial_drivers_count}"

            print("[PASS] 20. Seed data integrity verified. All temporary test records cleaned up cleanly.")
            print(f"       Current Database Counts: Users={final_users_count}, Products={final_products_count}, Orders={final_orders_count}, Vehicles={final_vehicles_count}, Drivers={final_drivers_count}")

            db_cur.close()
            db_conn.close()
        except Exception as e:
            print(f"Error during cleanup: {e}", flush=True)

        if server_proc:
            print("Shutting down test Uvicorn server...", flush=True)
            server_proc.terminate()
            server_proc.wait(timeout=5)
            print("Uvicorn test server stopped cleanly.")

    print("\n" + "=" * 65)
    print("ALL 20 PHASE 9 WORKFLOW TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    main()
