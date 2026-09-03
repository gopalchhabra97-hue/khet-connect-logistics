"""Comprehensive test suite for Phase 5: Real AI Demand Forecasting & Supply Recommendation."""

import json
import os
import sys
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


def api_call(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
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


def main():
    print("=" * 65)
    print("PHASE 5 TEST SUITE: DEMAND FORECASTING & SUPPLY RECOMMENDATIONS")
    print("=" * 65 + "\n")

    created_order_ids = []
    created_product_ids = []

    try:
        # 1. Forecast API Health
        code, all_forecasts = api_call("GET", "/forecast")
        assert code == 200 and isinstance(all_forecasts, list)
        print(f"[PASS] 1. GET /api/v1/forecast -> 200 OK (returned {len(all_forecasts)} crop forecasts)")

        # 2. Response Structure Validation
        required_fields = [
            "product_name",
            "series",
            "current_demand",
            "predicted_demand",
            "available_supply",
            "safety_buffer_pct",
            "recommended_supply",
            "recommendation_text",
            "trend",
            "error_metric",
            "status",
            "reason",
            "model",
            "generated_at",
        ]
        sample = all_forecasts[0]
        for field in required_fields:
            assert field in sample, f"Missing required field: {field}"
        assert len(sample["series"]) == 8, f"Expected 8 forecast points, got {len(sample['series'])}"
        print("[PASS] 2. Forecast schema structure validated (all required fields and 8-point series present)")

        # 3. Existing seeded crops recognized
        crop_names = [f["product_name"] for f in all_forecasts]
        for expected in ["Tomato", "Potato", "Onion", "Wheat", "Rice"]:
            assert any(expected.lower() in c.lower() for c in crop_names), f"Missing crop: {expected}"
        print("[PASS] 3. Existing seeded crops recognized (Tomato, Potato, Onion, Wheat, Rice)")

        # 4. Existing order history read from PostgreSQL
        # Seed has 3 orders for Potato, 1 for Tomato, etc.
        tomato_fc = next(f for f in all_forecasts if "tomato" in f["product_name"].lower())
        assert "orders" in tomato_fc["reason"].lower()
        print(f"[PASS] 4. PostgreSQL order history inspected -> {tomato_fc['reason']}")

        # 5. Insufficient-data behavior works correctly (status == 'demo')
        assert tomato_fc["status"] == "demo"
        print("[PASS] 5. Insufficient data correctly returns status='demo' with explainable reason")

        # 6. Demo fallback contains existing benchmark forecast values
        assert tomato_fc["predicted_demand"] == 1050.0
        assert tomato_fc["current_demand"] == 900.0
        assert tomato_fc["trend"] == "Increasing"
        assert tomato_fc["error_metric"] == 8.7
        print("[PASS] 6. Preserved exact benchmark values (Tomato: 900 current, 1050 predicted, MAPE 8.7%)")

        # 7. Recommended supply calculated transparently
        # predicted = 1050, buffer = 0.10 -> target = 1155. Available supply for Tomato = 1000. Rec = 155.
        expected_target = tomato_fc["predicted_demand"] * (1.0 + tomato_fc["safety_buffer_pct"])
        expected_rec = max(0.0, round(expected_target - tomato_fc["available_supply"], 1))
        assert tomato_fc["recommended_supply"] == expected_rec
        assert "recommended" in tomato_fc["recommendation_text"].lower()
        print(f"[PASS] 7. Supply recommendation formula validated: {tomato_fc['recommended_supply']} kg needed (target {expected_target:.0f} - avail {tomato_fc['available_supply']:.0f})")

        # 8. Single product forecast endpoint: GET /forecast/{product_id}
        code, p1001_fc = api_call("GET", "/forecast/P-1001")
        assert code == 200 and p1001_fc["product_id"] == "P-1001"
        assert "tomato" in p1001_fc["product_name"].lower()
        print("[PASS] 8. GET /api/v1/forecast/P-1001 -> 200 OK (resolved to Tomato)")

        # 9. Invalid product ID returns 404
        code, not_found = api_call("GET", "/forecast/NON_EXISTENT_PRODUCT_XYZ")
        assert code == 404
        print(f"[PASS] 9. Unknown product handled properly -> 404 Not Found ({not_found.get('detail')})")

        # 10. Query parameters: custom safety buffer and forecast days
        code, custom_fc = api_call("GET", "/forecast/P-1001?safety_buffer_pct=0.20&forecast_days=30")
        assert code == 200 and custom_fc["safety_buffer_pct"] == 0.20
        expected_rec_20 = max(0.0, round(1050.0 * 1.20 - custom_fc["available_supply"], 1))
        assert custom_fc["recommended_supply"] == expected_rec_20
        print(f"[PASS] 10. Custom parameters handled correctly (safety_buffer=20% -> rec={expected_rec_20} kg)")

        # 11. Live AI model execution test with sufficient historical order data
        print("\n--- Testing Live AI Model Generation (Simulating sufficient order points) ---")
        load_dotenv("backend/.env")
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        # Insert a temporary test product
        test_pid = "P-AI-TEST-99"
        cur.execute("""
            INSERT INTO products (id, name, category, quantity, unit, price, location, seller_id, seller_name, available, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (test_pid, "AI Test Maize", "Grains", 800, "kg", 22.0, "Patiala", "U-F1", "Green Valley FPO", True))
        created_product_ids.append(test_pid)

        # Insert 7 historical orders across distinct dates (>= MIN_HISTORICAL_DATA_POINTS = 5)
        dates = ["2026-08-10", "2026-08-13", "2026-08-16", "2026-08-19", "2026-08-22", "2026-08-25", "2026-08-28"]
        quantities = [450, 480, 520, 560, 590, 620, 650]
        for i, (d, q) in enumerate(zip(dates, quantities)):
            oid = f"#TEST-AI-{i}"
            cur.execute("""
                INSERT INTO orders (id, buyer_id, buyer_name, product_id, product_name, quantity, unit, price_per_unit, pickup_location, delivery_location, order_date, expected_delivery, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (oid, "U-B1", "Test Buyer", test_pid, "AI Test Maize", q, "kg", 22.0, "Patiala", "Chandigarh", d, d, "Accepted"))
            created_order_ids.append(oid)

        conn.commit()
        cur.close()
        conn.close()

        # Request forecast for the test product with sufficient data
        code, live_fc = api_call("GET", f"/forecast/{test_pid}")
        assert code == 200
        assert live_fc["status"] == "live", f"Expected 'live', got {live_fc['status']}"
        assert "RidgeRegression" in live_fc["model"]
        assert live_fc["predicted_demand"] > 0
        assert len(live_fc["series"]) > 0
        print(f"[PASS] 11. Live AI forecasting executed successfully!")
        print(f"       Status: {live_fc['status'].upper()}")
        print(f"       Model: {live_fc['model']}")
        print(f"       Predicted Demand: {live_fc['predicted_demand']} kg (Trend: {live_fc['trend']}, MAPE: {live_fc['error_metric']}%)")
        print(f"       Reason: {live_fc['reason']}")

    finally:
        # Cleanup temporary records
        print("\n--- Cleaning up temporary AI test records ---")
        load_dotenv("backend/.env")
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        for oid in created_order_ids:
            cur.execute("DELETE FROM orders WHERE id = %s", (oid,))
        for pid in created_product_ids:
            cur.execute("DELETE FROM products WHERE id = %s", (pid,))

        conn.commit()

        # Verify seed counts
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
    print("ALL PHASE 5 FORECASTING & RECOMMENDATION TESTS PASSED (100% SUCCESS)!")
    print("=" * 65)


if __name__ == "__main__":
    main()
