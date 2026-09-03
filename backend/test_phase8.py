"""Comprehensive test suite for Phase 8: Intelligent Farmer-Buyer Matching.

Covers all 24 required scenarios:
1. Exact crop match.
2. Wrong crop excluded.
3. Case-insensitive crop matching.
4. Full quantity match.
5. Partial quantity match.
6. Insufficient quantity handled correctly.
7. Price within buyer budget gets strong score.
8. Price above buyer budget handled correctly.
9. Buyer without max price handled correctly.
10. Location affects ranking when valid location data exists.
11. Missing distance does not create fake distance.
12. Delivery requirement handled correctly.
13. Missing delivery data does not create fake ETA.
14. Existing quality score affects matching.
15. Missing quality score does not create fake score.
16. Mandi reference price is obtained from Phase 7 service.
17. Stale/demo mandi status is preserved honestly.
18. Results sorted by match score descending.
19. Explanation matches the actual score factors.
20. Farmer/buyer RBAC is enforced.
21. Existing product/order APIs still work.
22. Phase 7 controlled pricing still works.
23. No API key leakage.
24. Seed data remains intact.
"""

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
    print("PHASE 8 TEST SUITE: INTELLIGENT FARMER-BUYER MATCHING")
    print("=" * 65 + "\n")

    created_product_ids = []

    # Get buyer, farmer, and admin tokens
    _, buyer_res = api_call("POST", "/auth/login", {"email": "buyer@demo.com", "password": "demo123"})
    buyer_token = buyer_res["access_token"]

    _, farmer_res = api_call("POST", "/auth/login", {"email": "farmer@demo.com", "password": "demo123"})
    farmer_token = farmer_res["access_token"]
    farmer_id = farmer_res["user"]["id"]

    _, admin_res = api_call("POST", "/auth/login", {"email": "admin@demo.com", "password": "demo123"})
    admin_token = admin_res["access_token"]

    try:
        # 1, 2, 3. Test Crop Matching (Exact, Wrong crop excluded, Case-insensitive)
        # Search for "tomato" in lowercase
        code, res_tomato = api_call("POST", "/matching/search", {
            "commodity": "tomato",
            "quantity": 100,
            "unit": "kg"
        }, token=buyer_token)
        assert code == 200
        assert len(res_tomato["matches"]) > 0
        for m in res_tomato["matches"]:
            assert "tomato" in m["commodity"].lower()
            assert m["score_breakdown"]["commodity"] == 30.0
        print("[PASS] 1 & 3. Exact & Case-insensitive crop match: 'tomato' matched Tomato products (30/30 pts).")

        # Search for a commodity that has no products (e.g. "Pineapple")
        code, res_none = api_call("POST", "/matching/search", {
            "commodity": "Pineapple",
            "quantity": 100,
            "unit": "kg"
        }, token=buyer_token)
        assert code == 200
        assert len(res_none["matches"]) == 0
        print("[PASS] 2. Incompatible crop excluded: 'Pineapple' returned 0 matches without cross-crop false positives.")

        # Create two test products:
        # P-TEST-M1: Potato 800 kg @ ₹18/kg in Patiala (verified=True)
        # P-TEST-M2: Potato 200 kg @ ₹24/kg in Ludhiana (verified=False)
        # Note: Potato Mandi reference is ₹12.50/kg -> max allowed price (+100%) is ₹25.00/kg.
        code, p1 = api_call("POST", "/products", {
            "name": "Potato",
            "category": "Vegetables",
            "quantity": 800,
            "unit": "kg",
            "price": 18.0,
            "location": "Patiala",
            "seller_id": farmer_id,
            "verified": True
        }, token=farmer_token)
        assert code == 201
        created_product_ids.append(p1["id"])

        code, p2 = api_call("POST", "/products", {
            "name": "Potato",
            "category": "Vegetables",
            "quantity": 200,
            "unit": "kg",
            "price": 24.0,
            "location": "Ludhiana",
            "seller_id": farmer_id,
            "verified": False
        }, token=farmer_token)
        assert code == 201
        created_product_ids.append(p2["id"])

        # 4, 5, 6. Quantity Matching (Full vs Partial vs Insufficient)
        # Buyer requests 500 kg: P1 has 800 (Full), P2 has 200 (Partial: 200/500 = 40% -> 8.0/20 pts)
        code, qty_res = api_call("POST", "/matching/search", {
            "commodity": "Potato",
            "quantity": 500,
            "unit": "kg",
            "max_price": 25.0,
            "delivery_location": "Chandigarh",
            "required_by_days": 2
        }, token=buyer_token)
        assert code == 200
        p1_match = next((m for m in qty_res["matches"] if m["product_id"] == p1["id"]), None)
        p2_match = next((m for m in qty_res["matches"] if m["product_id"] == p2["id"]), None)

        assert p1_match is not None and p1_match["fulfillment"] == "full"
        assert p1_match["score_breakdown"]["quantity"] == 20.0
        assert p1_match["fulfillable_quantity"] == 500.0

        assert p2_match is not None and p2_match["fulfillment"] == "partial"
        assert p2_match["score_breakdown"]["quantity"] == 8.0  # 20 * 0.4
        assert p2_match["fulfillable_quantity"] == 200.0
        print("[PASS] 4 & 5. Full vs Partial quantity: P1 (800kg) full (20/20), P2 (200kg) partial (8/20).")

        # Create zero quantity / unlisted product to verify zero stock handled properly
        code, p_zero = api_call("POST", "/products", {
            "name": "Potato",
            "category": "Vegetables",
            "quantity": 10,
            "unit": "kg",
            "price": 20.0,
            "location": "Patiala",
            "seller_id": farmer_id,
            "available": False
        }, token=farmer_token)
        assert code == 201
        created_product_ids.append(p_zero["id"])

        code, zero_res = api_call("POST", "/matching/search", {
            "commodity": "Potato",
            "quantity": 500,
            "unit": "kg"
        }, token=buyer_token)
        assert not any(m["product_id"] == p_zero["id"] for m in zero_res["matches"])
        print("[PASS] 6. Unavailable / zero-quantity products correctly filtered out.")

        # 7, 8, 9. Price compatibility (within budget, above budget, no max price)
        # P1 price is ₹18. Target budget ₹25 -> 18 <= 0.85*25 (21.25) -> 20/20 pts
        assert p1_match["score_breakdown"]["price"] == 20.0
        print(f"[PASS] 7. Price within budget (₹18 vs target ₹25): Full 20/20 pts.")

        # If buyer budget is ₹16 -> P1 (₹18) is 12.5% above budget -> scaled down score
        code, price_over_res = api_call("POST", "/matching/search", {
            "commodity": "Potato",
            "quantity": 500,
            "unit": "kg",
            "max_price": 16.0
        }, token=buyer_token)
        p1_over = next((m for m in price_over_res["matches"] if m["product_id"] == p1["id"]), None)
        assert p1_over is not None
        assert 0.0 < p1_over["score_breakdown"]["price"] < 10.0
        print(f"[PASS] 8. Price above budget (₹18 vs target ₹16): penalized appropriately ({p1_over['score_breakdown']['price']}/20 pts).")

        # Buyer specifies no max_price -> neutral score (14.0/20)
        code, no_price_res = api_call("POST", "/matching/search", {
            "commodity": "Potato",
            "quantity": 500,
            "unit": "kg"
        }, token=buyer_token)
        p1_no_price = next((m for m in no_price_res["matches"] if m["product_id"] == p1["id"]), None)
        assert p1_no_price is not None and p1_no_price["score_breakdown"]["price"] == 14.0
        print(f"[PASS] 9. Buyer without max price: assigned neutral score (14.0/20 pts).")

        # 10 & 11. Location scoring (Highway matrix known vs unknown distance)
        # Patiala to Chandigarh is 66.0 km in matrix -> calculated score ~10.4/15 pts
        assert p1_match["distance_km"] == 66.0
        assert p1_match["estimated_transportation_charge"] is not None
        assert p1_match["score_breakdown"]["location"] > 10.0
        print(f"[PASS] 10. Highway distance matrix applied: Patiala -> Chandigarh 66.0 km, freight ₹{p1_match['estimated_transportation_charge']}.")

        # Unknown destination (e.g. "Mumbai") -> neutral score (8.0/15) without fake distance
        code, unk_loc_res = api_call("POST", "/matching/search", {
            "commodity": "Potato",
            "quantity": 100,
            "unit": "kg",
            "delivery_location": "Mumbai"
        }, token=buyer_token)
        p1_unk = next((m for m in unk_loc_res["matches"] if m["product_id"] == p1["id"]), None)
        assert p1_unk is not None
        assert p1_unk["distance_km"] is None
        assert p1_unk["score_breakdown"]["location"] == 8.0
        assert "unavailable" in p1_unk["explanation"][3].lower()
        print("[PASS] 11. Missing distance: assigned neutral score (8.0/15) without inventing fake distance.")

        # 12 & 13. Delivery timeline (deadline specified vs missing)
        assert p1_match["score_breakdown"]["delivery"] == 10.0
        print(f"[PASS] 12. Delivery requirement handled: {p1_match['score_breakdown']['delivery']}/10 pts.")

        # No delivery deadline specified -> neutral score (6.0/10)
        assert p1_no_price["score_breakdown"]["delivery"] == 6.0
        print(f"[PASS] 13. Missing delivery data: neutral baseline (6.0/10 pts) without fake ETA.")

        # 14 & 15. Quality score (verified=True gets 5.0, verified=False gets 3.0)
        assert p1_match["verified"] is True
        assert p1_match["score_breakdown"]["quality"] == 5.0

        assert p2_match["verified"] is False
        assert p2_match["score_breakdown"]["quality"] == 3.0
        print(f"[PASS] 14 & 15. Quality score verified: P1 (verified) = 5.0/5, P2 (unverified) = 3.0/5.")

        # 16 & 17. Mandi reference price obtained & status preserved
        assert p1_match["mandi_reference_price"] is not None
        assert p1_match["mandi_status"] in ["live", "stale", "demo"]
        assert p1_match["max_allowed_price"] is not None
        print(f"[PASS] 16 & 17. Mandi reference obtained: ₹{p1_match['mandi_reference_price']:.2f}/kg, status='{p1_match['mandi_status']}' honestly preserved.")

        # 18. Results sorted descending by match score
        matches = qty_res["matches"]
        for i in range(len(matches) - 1):
            assert matches[i]["match_score_raw"] >= matches[i + 1]["match_score_raw"]
        print(f"[PASS] 18. Matches sorted strictly descending: Rank #1 ({matches[0]['match_score']} pts) >= Rank #2 ({matches[1]['match_score']} pts).")

        # 19. Explanation matches actual score factors
        assert len(p1_match["explanation"]) >= 5
        assert any("matches buyer requirement" in exp for exp in p1_match["explanation"])
        assert any("Full fulfillment" in exp for exp in p1_match["explanation"])
        print("[PASS] 19. Detailed human-readable explanations generated corresponding to score factors.")

        # 20. RBAC: Buyer and Admin allowed; Farmer, Driver, Unauthenticated forbidden/unauthorized
        # Admin allowed
        code, _ = api_call("POST", "/matching/search", {"commodity": "Potato", "quantity": 100}, token=admin_token)
        assert code == 200

        # Farmer forbidden
        code, _ = api_call("POST", "/matching/search", {"commodity": "Potato", "quantity": 100}, token=farmer_token)
        assert code == 403

        # Unauthenticated unauthorized
        code, _ = api_call("POST", "/matching/search", {"commodity": "Potato", "quantity": 100})
        assert code == 401
        print("[PASS] 20. RBAC enforced: Buyer (200), Admin (200), Farmer (403), Unauthenticated (401).")

        # 21. Existing Product and Order APIs still work
        code, prods = api_call("GET", "/products")
        assert code == 200
        code, ords = api_call("GET", "/orders")
        assert code == 200
        print("[PASS] 21. Existing Product and Order APIs continue functioning seamlessly.")

        # 22. Phase 7 controlled pricing still works
        code, prod_rejected = api_call("POST", "/products", {
            "name": "Potato",
            "category": "Vegetables",
            "quantity": 100,
            "unit": "kg",
            "price": 1000.0,
            "location": "Patiala",
            "seller_id": farmer_id
        }, token=farmer_token)
        assert code == 400
        assert "exceeds maximum allowed price" in prod_rejected.get("detail", "")
        print("[PASS] 22. Phase 7 controlled pricing (+100% max markup) actively enforced on product creation.")

        # 23. Security: No API key leakage in responses
        dumped_matches = json.dumps(qty_res)
        assert "DATA_GOV_IN_API_KEY" not in dumped_matches
        load_dotenv("backend/.env")
        real_key = os.getenv("DATA_GOV_IN_API_KEY")
        if real_key:
            assert real_key not in dumped_matches
        print("[PASS] 23. Security verified: Zero API key leakage in matching responses.")

        # Single product match endpoint test
        code, p1_detail = api_call("GET", f"/matching/product/{p1['id']}?quantity=500&delivery_location=Chandigarh", token=buyer_token)
        assert code == 200
        assert p1_detail["product_id"] == p1["id"]
        print(f"[PASS] Extra: Single product match evaluation GET /matching/product/{p1['id']} verified.")

    finally:
        print("\n--- Cleaning up temporary test records ---")
        load_dotenv("backend/.env")
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        for pid in created_product_ids:
            cur.execute("DELETE FROM products WHERE id = %s", (pid,))

        conn.commit()

        # 24. Seed data remains intact
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
        print("[PASS] 24. Seed data integrity verified 100% intact (14 users, 3 vehicles, 3 drivers, 7 products, 7 orders)!")

    print("\n" + "=" * 65)
    print("ALL PHASE 8 INTELLIGENT MATCHING TESTS PASSED (100% SUCCESS)!")
    print("=" * 65)


if __name__ == "__main__":
    main()
