"""Comprehensive test suite for Phase 3: Authentication, RBAC, and Fleet APIs."""

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

BASE_URL = "http://127.0.0.1:8000"

def request(method, path, body=None, token=None):
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
    print("PHASE 3 INTEGRATION TEST SUITE: AUTHENTICATION + FLEET APIS")
    print("=" * 65 + "\n")

    created_user_ids = []
    created_vehicle_ids = []
    created_driver_ids = []

    try:
        # 1. Health check
        code, data = request("GET", "/api/health")
        assert code == 200 and data.get("status") == "ok"
        print("[PASS] 1. GET /api/health -> 200 OK")

        # 2. Register a farmer
        farmer_payload = {
            "name": "Test Farmer Harpreet",
            "email": "test_harpreet@demo.com",
            "password": "strongPassword123",
            "role": "farmer",
            "org": "Punjab Agri Co-op",
            "location": "Ludhiana",
        }
        code, farmer_data = request("POST", "/api/v1/auth/register", farmer_payload)
        assert code == 201 and farmer_data["role"] == "farmer"
        created_user_ids.append(farmer_data["id"])
        print(f"[PASS] 2. POST /api/v1/auth/register (Farmer: {farmer_data['email']}) -> 201 Created")

        # 3. Register a buyer
        buyer_payload = {
            "name": "Test Buyer Aman",
            "email": "test_aman@demo.com",
            "password": "buyerPassword123",
            "role": "buyer",
            "org": "Aman Wholesale",
            "location": "Chandigarh",
        }
        code, buyer_data = request("POST", "/api/v1/auth/register", buyer_payload)
        assert code == 201 and buyer_data["role"] == "buyer"
        created_user_ids.append(buyer_data["id"])
        print(f"[PASS] 3. POST /api/v1/auth/register (Buyer: {buyer_data['email']}) -> 201 Created")

        # 4. Verify duplicate email is rejected
        code, dup_data = request("POST", "/api/v1/auth/register", farmer_payload)
        assert code == 400
        print(f"[PASS] 4. Duplicate email registration rejected -> 400 Bad Request ({dup_data.get('detail')})")

        # 5. Verify self-registration as admin is rejected
        admin_attempt = {
            "name": "Hacker",
            "email": "hacker@evil.com",
            "password": "hackPassword123",
            "role": "admin",
        }
        code, admin_rej = request("POST", "/api/v1/auth/register", admin_attempt)
        assert code == 403
        print(f"[PASS] 5. Admin self-registration rejected -> 403 Forbidden ({admin_rej.get('detail')})")

        # 6. Login with valid credentials
        code, login_data = request("POST", "/api/v1/auth/login", {
            "email": "test_harpreet@demo.com",
            "password": "strongPassword123",
        })
        assert code == 200 and "access_token" in login_data
        farmer_token = login_data["access_token"]
        print(f"[PASS] 6. POST /api/v1/auth/login with valid credentials -> 200 OK (JWT issued)")

        # Also login with existing seeded admin account
        code, admin_login = request("POST", "/api/v1/auth/login", {
            "email": "admin@demo.com",
            "password": "demo123",
        })
        assert code == 200 and "access_token" in admin_login
        admin_token = admin_login["access_token"]
        print(f"[PASS] 6b. Login with seeded admin account -> 200 OK (Admin JWT issued)")

        # 7. Verify invalid password is rejected
        code, bad_login = request("POST", "/api/v1/auth/login", {
            "email": "test_harpreet@demo.com",
            "password": "wrongPassword123",
        })
        assert code == 401
        print(f"[PASS] 7. Login with invalid password rejected -> 401 Unauthorized ({bad_login.get('detail')})")

        # 8. Call /auth/me with JWT
        code, me_data = request("GET", "/api/v1/auth/me", token=farmer_token)
        assert code == 200 and me_data["email"] == "test_harpreet@demo.com"
        print(f"[PASS] 8. GET /api/v1/auth/me with JWT -> 200 OK ({me_data['name']})")

        # 9. Verify role information is returned
        assert me_data["role"] == "farmer"
        print(f"[PASS] 9. Role information correctly identified: role='{me_data['role']}'")

        # 10. Test unauthorized access to protected fleet endpoints
        code, no_auth = request("GET", "/api/v1/vehicles")
        assert code == 401
        print(f"[PASS] 10. GET /api/v1/vehicles without JWT rejected -> 401 Unauthorized")

        # 11. Test non-admin cannot perform admin operations (RBAC check)
        vehicle_payload = {
            "name": "Tata Ace Test",
            "registration": "PB-11-TEST-9999",
            "capacity": 1500,
            "base_location": "Patiala",
        }
        code, non_admin_veh = request("POST", "/api/v1/vehicles", vehicle_payload, token=farmer_token)
        assert code == 403
        print(f"[PASS] 11. Farmer attempting admin create vehicle rejected -> 403 Forbidden ({non_admin_veh.get('detail')})")

        # 12. Test Vehicle GET/POST/PATCH/DELETE by Admin
        # 12a. Negative capacity rejected
        bad_cap_payload = {**vehicle_payload, "capacity": -100}
        code, bad_cap_res = request("POST", "/api/v1/vehicles", bad_cap_payload, token=admin_token)
        assert code == 400
        print(f"[PASS] 12a. Negative vehicle capacity rejected -> 400 Bad Request")

        # 12b. Admin creates vehicle
        code, created_veh = request("POST", "/api/v1/vehicles", vehicle_payload, token=admin_token)
        assert code == 201 and created_veh["registration"] == "PB-11-TEST-9999"
        veh_id = created_veh["id"]
        created_vehicle_ids.append(veh_id)
        print(f"[PASS] 12b. Admin created vehicle -> 201 Created (ID: {veh_id})")

        # 12c. List vehicles
        code, veh_list = request("GET", "/api/v1/vehicles", token=farmer_token)
        assert code == 200 and len(veh_list) >= 4
        print(f"[PASS] 12c. Authenticated user listed vehicles -> 200 OK ({len(veh_list)} vehicles)")

        # 12d. Update vehicle
        code, updated_veh = request("PATCH", f"/api/v1/vehicles/{veh_id}", {"capacity": 1800, "status": "Available"}, token=admin_token)
        assert code == 200 and updated_veh["capacity"] == 1800
        print(f"[PASS] 12d. Admin updated vehicle -> 200 OK (Capacity: {updated_veh['capacity']})")

        # 13. Test Driver GET/POST/PATCH/DELETE by Admin
        driver_payload = {
            "name": "Gurmeet Singh Test",
            "phone": "+91 98765 43210",
            "license": "PB-DL-TEST-9999",
            "base_location": "Patiala",
            "vehicle_id": veh_id,
        }
        # 13a. Non-admin create rejected
        code, non_admin_driver = request("POST", "/api/v1/drivers", driver_payload, token=farmer_token)
        assert code == 403
        print(f"[PASS] 13a. Farmer attempting admin create driver rejected -> 403 Forbidden")

        # 13b. Admin creates driver
        code, created_drv = request("POST", "/api/v1/drivers", driver_payload, token=admin_token)
        assert code == 201 and created_drv["license"] == "PB-DL-TEST-9999"
        drv_id = created_drv["id"]
        created_driver_ids.append(drv_id)
        print(f"[PASS] 13b. Admin created driver -> 201 Created (ID: {drv_id})")

        # 13c. List drivers
        code, drv_list = request("GET", "/api/v1/drivers", token=farmer_token)
        assert code == 200 and len(drv_list) >= 4
        print(f"[PASS] 13c. Authenticated user listed drivers -> 200 OK ({len(drv_list)} drivers)")

        # 13d. Update driver
        code, updated_drv = request("PATCH", f"/api/v1/drivers/{drv_id}", {"phone": "+91 98765 00000"}, token=admin_token)
        assert code == 200 and updated_drv["phone"] == "+91 98765 00000"
        print(f"[PASS] 13d. Admin updated driver -> 200 OK (New phone: {updated_drv['phone']})")

        # 13e. Protection against deleting assigned vehicle
        code, del_veh_blocked = request("DELETE", f"/api/v1/vehicles/{veh_id}", token=admin_token)
        assert code == 400
        print(f"[PASS] 13e. Deleting vehicle assigned to active driver rejected -> 400 Bad Request ({del_veh_blocked.get('detail')})")

        # 13f. Delete driver
        code, del_drv = request("DELETE", f"/api/v1/drivers/{drv_id}", token=admin_token)
        assert code == 200
        created_driver_ids.remove(drv_id)
        print(f"[PASS] 13f. Admin deleted test driver -> 200 OK")

        # 13g. Delete vehicle now unassigned
        code, del_veh = request("DELETE", f"/api/v1/vehicles/{veh_id}", token=admin_token)
        assert code == 200
        created_vehicle_ids.remove(veh_id)
        print(f"[PASS] 13g. Admin deleted test vehicle -> 200 OK")

    finally:
        # Cleanup temporary test accounts
        print("\n--- Cleaning up temporary test records ---")
        load_dotenv("backend/.env")
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        for d_id in created_driver_ids:
            cur.execute("DELETE FROM drivers WHERE id = %s", (d_id,))
        for v_id in created_vehicle_ids:
            cur.execute("DELETE FROM vehicles WHERE id = %s", (v_id,))
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
    print("ALL PHASE 3 AUTH & FLEET TESTS PASSED WITH 100% SUCCESS RATE!")
    print("=" * 65)

if __name__ == "__main__":
    main()
