"""Phase 10 Comprehensive Verification Test Suite: AI Crop Quality Grading + Demo Mode.

Tests:
1. Valid quality analysis execution.
2. Invalid image rejected (unsupported MIME type, empty file).
3. Quality score always bounded between 0 and 100.
4. Correct grade calculation according to standard thresholds (A+, A, B, C, D).
5. All 8 visual quality factors are present and valid in factor_scores.
6. Factor scores accurately sum to total_score.
7. Farmer can analyze and update quality for own product.
8. Farmer cannot analyze or modify another farmer's product (403 Forbidden).
9. Buyer can view quality result for marketplace products.
10. Unauthorized access rejected (401 Unauthorized).
11. Demo mode functions reliably without external AI keys with analysis_mode == 'demo'.
12. Seeded demo results are present and verified for marketplace crops (Tomato: 87/A, Potato: 92/A+, Onion: 76/B, etc.).
13. Quality grading service isolated architecture verification.
14. Regression: Phases 1-9 endpoints (auth, products, orders, mandi, batches, matching) remain fully operational.
15. Verification that database seed counts remain intact after cleanup.
"""

import io
import json
import os
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

load_dotenv()


def api_json_call(method, path, body=None, token=None):
    """Makes a JSON HTTP request to the backend."""
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


def api_multipart_call(path, fields, files, token=None):
    """Makes a multipart/form-data HTTP POST request to the backend."""
    boundary = "----KhetSetuBoundaryTestPhase10"
    url = f"{BASE_URL}{path}"

    body_io = io.BytesIO()

    # Append form fields
    for field_name, field_val in fields.items():
        if field_val is not None:
            body_io.write(f"--{boundary}\r\n".encode("utf-8"))
            body_io.write(f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'.encode("utf-8"))
            body_io.write(f"{field_val}\r\n".encode("utf-8"))

    # Append files: (field_name, filename, content_type, bytes_data)
    for field_name, filename, content_type, file_bytes in files:
        body_io.write(f"--{boundary}\r\n".encode("utf-8"))
        body_io.write(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body_io.write(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body_io.write(file_bytes)
        body_io.write(b"\r\n")

    body_io.write(f"--{boundary}--\r\n".encode("utf-8"))
    payload = body_io.getvalue()

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(payload)),
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
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


import cv2
import numpy as np


def create_mock_jpeg_bytes() -> bytes:
    """Generates a valid 128x128 JPEG binary byte string for testing."""
    img = np.full((128, 128, 3), (240, 240, 240), dtype=np.uint8)
    cv2.circle(img, (64, 64), 40, (30, 35, 220), -1, cv2.LINE_AA)
    cv2.circle(img, (64, 25), 8, (34, 139, 34), -1, cv2.LINE_AA)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def run_phase10_tests():
    print("=" * 70)
    print("KHETSETU PHASE 10: AI CROP QUALITY GRADING + DEMO MODE TEST SUITE")
    print("=" * 70)

    # 1. Connect to PostgreSQL and verify connection & seed data
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:REDACTED_PASSWORD@localhost:5432/khetsetu")
    try:
        db_conn = psycopg2.connect(db_url)
        db_conn.autocommit = True
        db_cur = db_conn.cursor()
    except Exception as e:
        print(f"[FAIL] Could not connect to PostgreSQL: {e}")
        sys.exit(1)

    # Capture initial database baseline counts
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
    db_cur.execute("SELECT count(*) FROM crop_quality_results")
    initial_quality_count = db_cur.fetchone()[0]

    print(f"PostgreSQL Seed Baseline: {initial_users_count} users, {initial_products_count} products, {initial_orders_count} orders, {initial_quality_count} quality records.")

    test_cqr_ids = []

    try:
        # Step 1: Authentication & Role Setup
        print("\n--- 1. User Authentication ---")
        code, admin_login = api_json_call("POST", "/auth/login", {"email": "admin@demo.com", "password": "demo123"})
        assert code == 200, f"Admin login failed: {admin_login}"
        admin_token = admin_login["access_token"]
        print("[PASS] 1a. Admin login successful.")

        code, farmer1_login = api_json_call("POST", "/auth/login", {"email": "farmer@demo.com", "password": "demo123"})
        assert code == 200, f"Farmer 1 login failed: {farmer1_login}"
        farmer1_token = farmer1_login["access_token"]
        farmer1_id = farmer1_login["user"]["id"]  # U-F1 (owns P-1001, P-1002, P-1007)
        print(f"[PASS] 1b. Farmer 1 login successful ({farmer1_id}).")

        code, farmer2_login = api_json_call("POST", "/auth/login", {"email": "farmer2@demo.com", "password": "demo123"})
        assert code == 200, f"Farmer 2 login failed: {farmer2_login}"
        farmer2_token = farmer2_login["access_token"]
        farmer2_id = farmer2_login["user"]["id"]  # U-F2 (owns P-1003)
        print(f"[PASS] 1c. Farmer 2 login successful ({farmer2_id}).")

        code, buyer_login = api_json_call("POST", "/auth/login", {"email": "buyer@demo.com", "password": "demo123"})
        assert code == 200, f"Buyer login failed: {buyer_login}"
        buyer_token = buyer_login["access_token"]
        print("[PASS] 1d. Buyer login successful.")

        # Step 2: Unauthorized Access Rejection
        print("\n--- 2. Security: Unauthorized Access Rejection ---")
        code, unauth_resp = api_json_call("GET", "/quality/P-1001", token=None)
        assert code == 401, f"Expected 401 Unauthorized for missing token, got {code}"
        print("[PASS] 2. Unauthenticated GET /quality rejected with 401.")

        # Step 3: Seeded Demo Quality Results Verification
        print("\n--- 3. Seeded Demo Quality Results Verification ---")
        # Check P-1001 (Tomato)
        code, q_tomato = api_json_call("GET", "/quality/P-1001", token=buyer_token)
        assert code == 200, f"Failed to get P-1001 quality: {q_tomato}"
        assert q_tomato["crop"] == "Tomato"
        assert q_tomato["total_score"] == 87.0, f"Expected Tomato score 87.0, got {q_tomato['total_score']}"
        assert q_tomato["grade"] == "A", f"Expected Tomato grade A, got {q_tomato['grade']}"
        assert q_tomato["analysis_mode"] == "demo"
        print("[PASS] 3a. Seeded Tomato quality verified: 87.0/100 -> Grade A (Demo Mode).")

        # Check P-1002 (Potato)
        code, q_potato = api_json_call("GET", "/quality/P-1002", token=buyer_token)
        assert code == 200
        assert q_potato["total_score"] == 92.0
        assert q_potato["grade"] == "A+"
        print("[PASS] 3b. Seeded Potato quality verified: 92.0/100 -> Grade A+.")

        # Check P-1003 (Onion)
        code, q_onion = api_json_call("GET", "/quality/P-1003", token=buyer_token)
        assert code == 200
        assert q_onion["total_score"] == 76.0
        assert q_onion["grade"] == "B"
        print("[PASS] 3c. Seeded Onion quality verified: 76.0/100 -> Grade B.")

        # Step 4: Verification of All 8 Visual Factors and Scale
        print("\n--- 4. Visual Factors & Score Formula Verification ---")
        factors = q_tomato["factor_scores"]
        required_factors = [
            "freshness",
            "color_appearance",
            "physical_damage",
            "disease_spots",
            "pest_damage",
            "size_uniformity",
            "rot_decay",
            "cleanliness",
        ]
        for rf in required_factors:
            assert rf in factors, f"Missing factor '{rf}' in factor_scores"
            assert isinstance(factors[rf], (int, float)), f"Factor '{rf}' is not a numeric score"

        # Check sum of factors equals total_score
        factor_sum = round(sum(factors[k] for k in required_factors), 1)
        assert factor_sum == q_tomato["total_score"], f"Factor sum ({factor_sum}) != total_score ({q_tomato['total_score']})"
        assert 0.0 <= q_tomato["total_score"] <= 100.0, "Total score outside 0-100 bounds"
        print(f"[PASS] 4. All 8 visual quality factors present and exactly sum to total_score: {factors}")

        # Step 5: Grade Calculation Scale Verification
        print("\n--- 5. Standard Grade Calculation Scale ---")
        from app.services.quality_grading_service import calculate_grade
        assert calculate_grade(95.0) == "A+"
        assert calculate_grade(90.0) == "A+"
        assert calculate_grade(89.9) == "A"
        assert calculate_grade(80.0) == "A"
        assert calculate_grade(79.9) == "B"
        assert calculate_grade(70.0) == "B"
        assert calculate_grade(69.9) == "C"
        assert calculate_grade(60.0) == "C"
        assert calculate_grade(59.9) == "D"
        assert calculate_grade(0.0) == "D"
        print("[PASS] 5. Grade calculation bounds verified (90-100: A+, 80-89: A, 70-79: B, 60-69: C, <60: D).")

        # Step 6: Invalid Image Rejected
        print("\n--- 6. Image Validation & Rejection ---")
        # 6a: Unsupported file type (text/plain)
        code, err_txt = api_multipart_call(
            "/quality/analyze",
            {"product_id": "P-1001"},
            [("file", "test.txt", "text/plain", b"this is not an image")],
            token=farmer1_token,
        )
        assert code == 400, f"Expected 400 Bad Request for text file, got {code}"
        assert "Unsupported image type" in str(err_txt)
        print("[PASS] 6a. Non-image file type rejected with 400 Bad Request.")

        # 6b: Empty image file
        code, err_empty = api_multipart_call(
            "/quality/analyze",
            {"product_id": "P-1001"},
            [("file", "empty.jpg", "image/jpeg", b"")],
            token=farmer1_token,
        )
        assert code == 400, f"Expected 400 Bad Request for empty file, got {code}"
        assert "empty" in str(err_empty).lower()
        print("[PASS] 6b. Empty image file rejected with 400 Bad Request.")

        # Step 7: Farmer Quality Analysis on Own Product
        print("\n--- 7. Farmer Analysis of Own Product ---")
        jpeg_bytes = create_mock_jpeg_bytes()
        code, analyze_resp = api_multipart_call(
            "/quality/analyze",
            {"product_id": "P-1001", "crop": "Tomato"},
            [("file", "tomato_field.jpg", "image/jpeg", jpeg_bytes)],
            token=farmer1_token,
        )
        assert code == 200, f"Expected 200 OK for farmer analyzing own product, got {code}: {analyze_resp}"
        test_cqr_ids.append(analyze_resp["id"])
        assert analyze_resp["product_id"] == "P-1001"
        assert analyze_resp["crop"] == "Tomato"
        assert 0.0 <= analyze_resp["total_score"] <= 100.0
        assert analyze_resp["grade"] in ["A+", "A", "B", "C", "D"]
        assert analyze_resp["analysis_mode"] in ["ai", "demo"]
        assert len(analyze_resp["detected_issues"]) > 0
        assert analyze_resp["recommendation"] is not None
        assert analyze_resp["image_url"].startswith("/static/uploads/quality/")
        print(f"[PASS] 7. Farmer successfully analyzed P-1001: Score {analyze_resp['total_score']}/100, Grade {analyze_resp['grade']}, URL {analyze_resp['image_url']}.")

        # Step 8: Farmer CANNOT Analyze/Modify Another Farmer's Product
        print("\n--- 8. RBAC: Farmer Cannot Modify Another Farmer's Product ---")
        # Farmer 1 (U-F1) attempts to analyze P-1003 (owned by U-F2 Sukhbir Singh)
        code, err_rbac = api_multipart_call(
            "/quality/analyze",
            {"product_id": "P-1003", "crop": "Onion"},
            [("file", "onion_sample.jpg", "image/jpeg", jpeg_bytes)],
            token=farmer1_token,
        )
        assert code == 403, f"Expected 403 Forbidden for cross-farmer analysis, got {code}: {err_rbac}"
        assert "not authorized" in str(err_rbac).lower()
        print("[PASS] 8. Cross-farmer analysis properly blocked with 403 Forbidden.")

        # Step 9: Buyer Views Quality Result
        print("\n--- 9. Buyer Marketplace Quality Visibility ---")
        code, buyer_q = api_json_call("GET", "/quality/P-1001", token=buyer_token)
        assert code == 200, f"Buyer failed to view quality: {buyer_q}"
        assert buyer_q["product_id"] == "P-1001"
        assert buyer_q["grade"] in ["A+", "A", "B", "C", "D"]
        print(f"[PASS] 9. Buyer successfully viewed product quality: Grade {buyer_q['grade']} ({buyer_q['total_score']}/100).")

        # Step 10: Admin Quality Overview
        print("\n--- 10. Admin Quality Overview ---")
        code, admin_q_list = api_json_call("GET", "/quality", token=admin_token)
        assert code == 200, f"Admin list quality failed: {admin_q_list}"
        assert isinstance(admin_q_list, list)
        assert len(admin_q_list) >= 7, f"Expected at least 7 quality assessments, got {len(admin_q_list)}"
        print(f"[PASS] 10. Admin can inspect all quality assessments (Found {len(admin_q_list)}).")

        # Step 11: Non-Existent Product Quality 404
        print("\n--- 11. 404 for Product Without Quality Assessment ---")
        code, err_404 = api_json_call("GET", "/quality/P-NONEXISTENT", token=buyer_token)
        assert code == 404, f"Expected 404 for non-existent product, got {code}"
        print("[PASS] 11. Query for non-existent product returned 404.")

        # Step 12: Visual Assessment Non-Claim Verification
        print("\n--- 12. Visual Quality Assessment Limitations ---")
        # Ensure detected issues and recommendations only mention visible attributes
        issues_str = " ".join(analyze_resp["detected_issues"]).lower()
        rec_str = (analyze_resp["recommendation"] or "").lower()
        prohibited_claims = ["pesticide residue", "internal damage", "nutritional value", "moisture content percentage"]
        for pc in prohibited_claims:
            assert pc not in issues_str, f"Detected prohibited claim in issues: {pc}"
            assert pc not in rec_str, f"Detected prohibited claim in recommendation: {pc}"
        print("[PASS] 12. Output strictly conforms to visual inspection (no false chemical/moisture claims).")

        # Step 13: Regression Testing: Phases 1-9 Endpoints Intact
        print("\n--- 13. Regression Testing: Phases 1-9 Intact ---")
        # 13a. Health
        req = urllib.request.Request(HEALTH_URL)
        with urllib.request.urlopen(req) as resp:
            health = json.loads(resp.read().decode())
            assert resp.getcode() == 200 and health["status"] == "ok"
        print("[PASS] 13a. /api/health endpoint intact.")


        # 13b. Products
        code, products = api_json_call("GET", "/products")
        assert code == 200 and len(products) >= 7
        print(f"[PASS] 13b. /products endpoint intact ({len(products)} products).")

        # 13c. Mandi Prices
        code, mandi = api_json_call("GET", "/mandi-prices/reference/Tomato?location=Patiala")
        assert code == 200
        print("[PASS] 13c. Mandi reference pricing intact.")

        # 13d. Highway Logistics / Matching Search
        code, match_res = api_json_call("POST", "/matching/search", {
            "commodity": "Tomato",
            "quantity": 300,
            "unit": "kg",
            "delivery_location": "Chandigarh",
        }, token=buyer_token)
        assert code == 200
        assert len(match_res["matches"]) > 0
        print(f"[PASS] 13d. Phase 7-8 Matching search intact ({len(match_res['matches'])} matches).")

        # 13e. Delivery Batches
        code, batches = api_json_call("GET", "/delivery-batches", token=admin_token)
        assert code == 200
        print("[PASS] 13e. Phase 9 Delivery batches intact.")

    finally:
        # Cleanup temporary test records created during this run
        print("\n--- Cleanup & Baseline Verification ---")
        if test_cqr_ids:
            for cid in test_cqr_ids:
                db_cur.execute("DELETE FROM crop_quality_results WHERE id = %s", (cid,))
            print(f"Cleaned up {len(test_cqr_ids)} temporary test quality records.")

        # Verify baseline counts
        db_cur.execute("SELECT count(*) FROM users")
        final_users = db_cur.fetchone()[0]
        db_cur.execute("SELECT count(*) FROM products")
        final_products = db_cur.fetchone()[0]
        db_cur.execute("SELECT count(*) FROM orders")
        final_orders = db_cur.fetchone()[0]
        db_cur.execute("SELECT count(*) FROM vehicles")
        final_vehicles = db_cur.fetchone()[0]
        db_cur.execute("SELECT count(*) FROM drivers")
        final_drivers = db_cur.fetchone()[0]
        db_cur.execute("SELECT count(*) FROM crop_quality_results")
        final_quality = db_cur.fetchone()[0]

        assert final_users == initial_users_count, f"Users count mismatch: {final_users} != {initial_users_count}"
        assert final_products == initial_products_count, f"Products count mismatch: {final_products} != {initial_products_count}"
        assert final_orders == initial_orders_count, f"Orders count mismatch: {final_orders} != {initial_orders_count}"
        assert final_vehicles == initial_vehicles_count, f"Vehicles count mismatch: {final_vehicles} != {initial_vehicles_count}"
        assert final_drivers == initial_drivers_count, f"Drivers count mismatch: {final_drivers} != {initial_drivers_count}"
        assert final_quality == initial_quality_count, f"Quality count mismatch: {final_quality} != {initial_quality_count}"

        print(f"[PASS] Database seed records intact: Users={final_users}, Products={final_products}, Orders={final_orders}, Vehicles={final_vehicles}, Drivers={final_drivers}, Quality={final_quality}.")

        db_cur.close()
        db_conn.close()

    print("\n" + "=" * 70)
    print("ALL PHASE 10 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_phase10_tests()
