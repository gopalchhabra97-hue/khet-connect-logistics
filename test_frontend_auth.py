"""Comprehensive test suite for Phase 4: Frontend Authentication Integration."""

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
    print("PHASE 4 FRONTEND-AUTH INTEGRATION TEST SUITE")
    print("=" * 65 + "\n")

    created_user_ids = []

    try:
        # 1. Valid farmer login
        code, farmer_login = api_call("POST", "/auth/login", {
            "email": "farmer@demo.com",
            "password": "demo123",
        })
        assert code == 200 and "access_token" in farmer_login
        farmer_token = farmer_login["access_token"]
        assert farmer_login["user"]["role"] == "farmer"
        print("[PASS] 1. Farmer login -> 200 OK (JWT token issued, role='farmer')")

        # 2. Valid buyer login
        code, buyer_login = api_call("POST", "/auth/login", {
            "email": "buyer@demo.com",
            "password": "demo123",
        })
        assert code == 200 and "access_token" in buyer_login
        buyer_token = buyer_login["access_token"]
        assert buyer_login["user"]["role"] == "buyer"
        print("[PASS] 2. Buyer login -> 200 OK (JWT token issued, role='buyer')")

        # 3. Valid admin login
        code, admin_login = api_call("POST", "/auth/login", {
            "email": "admin@demo.com",
            "password": "demo123",
        })
        assert code == 200 and "access_token" in admin_login
        admin_token = admin_login["access_token"]
        assert admin_login["user"]["role"] == "admin"
        print("[PASS] 3. Admin login -> 200 OK (JWT token issued, role='admin')")

        # 4. Invalid password rejected
        code, bad_login = api_call("POST", "/auth/login", {
            "email": "farmer@demo.com",
            "password": "wrongPassword!",
        })
        assert code == 401
        print(f"[PASS] 4. Invalid password rejected -> 401 Unauthorized ({bad_login.get('detail')})")

        # 5. Token is valid and non-empty
        assert len(farmer_token.split(".")) == 3
        print("[PASS] 5. Valid JWT Bearer format verified (3 segments)")

        # 6. /auth/me restores the user
        code, me_data = api_call("GET", "/auth/me", token=farmer_token)
        assert code == 200 and me_data["email"] == "farmer@demo.com" and me_data["role"] == "farmer"
        print(f"[PASS] 6. GET /auth/me with JWT -> 200 OK (restored user: {me_data['name']})")

        # 7. Unauthenticated access to protected endpoints rejected
        code, unauth_res = api_call("GET", "/auth/me")
        assert code == 401
        print("[PASS] 7. Unauthenticated GET /auth/me rejected -> 401 Unauthorized")

        # 8. Unauthenticated access to fleet endpoint rejected
        code, no_fleet = api_call("GET", "/vehicles")
        assert code == 401
        print("[PASS] 8. Unauthenticated fleet access rejected -> 401 Unauthorized")

        # 9. Farmer cannot perform admin operations (RBAC check)
        code, farmer_blocked = api_call("POST", "/vehicles", {
            "name": "Unauthorized Truck",
            "registration": "PB-99-TEST",
            "capacity": 1000,
            "base_location": "Patiala",
        }, token=farmer_token)
        assert code == 403
        print(f"[PASS] 9. Farmer blocked from admin operation -> 403 Forbidden ({farmer_blocked.get('detail')})")

        # 10. Buyer cannot perform admin operations (RBAC check)
        code, buyer_blocked = api_call("POST", "/vehicles", {
            "name": "Unauthorized Truck",
            "registration": "PB-99-TEST-2",
            "capacity": 1000,
            "base_location": "Chandigarh",
        }, token=buyer_token)
        assert code == 403
        print(f"[PASS] 10. Buyer blocked from admin operation -> 403 Forbidden")

        # 11. Driver login and role check
        code, driver_login = api_call("POST", "/auth/login", {
            "email": "driver@demo.com",
            "password": "demo123",
        })
        assert code == 200
        driver_token = driver_login["access_token"]
        code, driver_blocked = api_call("POST", "/vehicles", {
            "name": "Unauthorized Truck",
            "registration": "PB-99-TEST-3",
            "capacity": 1000,
            "base_location": "Bathinda",
        }, token=driver_token)
        assert code == 403
        print(f"[PASS] 11. Driver blocked from admin operation -> 403 Forbidden")

        # 12. Admin can access fleet data
        code, fleet_data = api_call("GET", "/vehicles", token=admin_token)
        assert code == 200 and len(fleet_data) == 3
        print(f"[PASS] 12. Admin authorized access to fleet -> 200 OK ({len(fleet_data)} vehicles)")

        # 13. Registration creates a real PostgreSQL user
        new_user_payload = {
            "name": "Simran Kaur",
            "email": "simran_farmer@demo.com",
            "password": "simranPassword123",
            "role": "farmer",
            "org": "Kaur Organic Farm",
            "location": "Jalandhar",
        }
        code, registered_user = api_call("POST", "/auth/register", new_user_payload)
        assert code == 201 and registered_user["role"] == "farmer"
        created_user_ids.append(registered_user["id"])
        print(f"[PASS] 13. Registration created real PostgreSQL user -> 201 Created (ID: {registered_user['id']})")

        # 14. Duplicate registration is rejected
        code, dup_reg = api_call("POST", "/auth/register", new_user_payload)
        assert code == 400
        print(f"[PASS] 14. Duplicate registration rejected -> 400 Bad Request ({dup_reg.get('detail')})")

    finally:
        # Cleanup temporary registered user
        print("\n--- Cleaning up temporary test records ---")
        load_dotenv("backend/.env")
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        for u_id in created_user_ids:
            cur.execute("DELETE FROM users WHERE id = %s", (u_id,))

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
    print("ALL PHASE 4 FRONTEND-AUTH TESTS PASSED WITH 100% SUCCESS RATE!")
    print("=" * 65)

if __name__ == "__main__":
    main()
