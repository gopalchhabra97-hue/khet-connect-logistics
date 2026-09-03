"""Automated integration test for KHETSETU Products and Orders REST APIs."""

import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# Force UTF-8 stdout on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.db.database import SessionLocal
from app.models.order import Order

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8000
BASE_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"


def request(method, path, body=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"} if body else {}
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.getcode()
            content = resp.read().decode("utf-8")
            res_data = json.loads(content) if content else {}
            return status_code, res_data
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            res_data = json.loads(content) if content else {}
        except Exception:
            res_data = {"raw": content}
        return e.code, res_data


def run_tests():
    print("Launching Uvicorn server process on http://127.0.0.1:8000...", flush=True)
    log_file = open("uvicorn.log", "w", encoding="utf-8")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", SERVER_HOST, "--port", str(SERVER_PORT)],
        stdout=log_file,
        stderr=log_file,
    )

    try:
        # Wait for server readiness
        print("Waiting for server to start...", flush=True)
        for i in range(15):
            time.sleep(1)
            try:
                code, data = request("GET", "/api/health")
                if code == 200:
                    print(f"[OK] Server is up and responding! (Health check passed: {data})\n", flush=True)
                    break
            except urllib.error.URLError:
                pass
        else:
            raise RuntimeError("Server failed to start in time.")

        print("=" * 65, flush=True)
        print("KHETSETU PHASE 1 REST API INTEGRATION TEST SUITE", flush=True)
        print("=" * 65, flush=True)

        # 1. Health Endpoint
        code, data = request("GET", "/api/health")
        assert code == 200 and data.get("status") == "ok", f"Health failed: {code} {data}"
        print("[PASS] GET /api/health -> 200 OK (status: ok)", flush=True)

        # 2. Root Endpoint
        code, data = request("GET", "/")
        assert code == 200 and "KHETSETU" in data.get("service", ""), f"Root failed: {code} {data}"
        print("[PASS] GET / -> 200 OK (KHETSETU API service banner)", flush=True)

        # 3. List Products (Seeded Data)
        code, products = request("GET", "/api/v1/products")
        assert code == 200 and isinstance(products, list), f"List products failed: {code}"
        assert len(products) >= 7, f"Expected >=7 products, got {len(products)}"
        print(f"[PASS] GET /api/v1/products -> 200 OK (Retrieved {len(products)} seeded products)", flush=True)

        # 4. Filter Products by Category
        code, veg_products = request("GET", "/api/v1/products?category=Vegetables")
        assert code == 200 and len(veg_products) >= 3, f"Category filter failed: {code}"
        for p in veg_products:
            assert p["category"].lower() == "vegetables"
        print(f"[PASS] GET /api/v1/products?category=Vegetables -> 200 OK ({len(veg_products)} items verified)", flush=True)

        # 5. Get Single Product by ID
        code, tomato = request("GET", "/api/v1/products/P-1001")
        assert code == 200 and tomato["name"] == "Tomato" and tomato["price"] == 25.0, f"Get P-1001 failed: {code}"
        print(f"[PASS] GET /api/v1/products/P-1001 -> 200 OK (Tomato, ₹{tomato['price']}/{tomato['unit']})", flush=True)

        # 6. Get Nonexistent Product -> 404
        code, err = request("GET", "/api/v1/products/P-NONEXISTENT")
        assert code == 404, f"Expected 404, got {code}"
        print("[PASS] GET /api/v1/products/P-NONEXISTENT -> 404 Not Found as expected", flush=True)

        # 7. Create Product
        new_prod = {
            "id": "P-TEST-VERIFY",
            "name": "Kashmiri Apples",
            "category": "Fruits",
            "quantity": 300,
            "unit": "kg",
            "price": 120.0,
            "location": "Patiala",
            "seller_id": "U-F1",
            "available": True,
            "harvest_date": "2026-09-02",
        }
        code, created_p = request("POST", "/api/v1/products", new_prod)
        assert code == 201 and created_p["id"] == "P-TEST-VERIFY", f"Create product failed: {code} {created_p}"
        print("[PASS] POST /api/v1/products -> 201 Created (P-TEST-VERIFY: Kashmiri Apples)", flush=True)

        # 8. Patch Product
        code, patched_p = request("PATCH", "/api/v1/products/P-TEST-VERIFY", {"price": 115.0, "quantity": 280})
        assert code == 200 and patched_p["price"] == 115.0 and patched_p["quantity"] == 280
        print("[PASS] PATCH /api/v1/products/P-TEST-VERIFY -> 200 OK (Updated price: ₹115.0, qty: 280)", flush=True)

        # 9. Delete Product
        code, del_res = request("DELETE", "/api/v1/products/P-TEST-VERIFY")
        assert code == 200, f"Delete failed: {code} {del_res}"
        code, _ = request("GET", "/api/v1/products/P-TEST-VERIFY")
        assert code == 404, "Deleted product must return 404"
        print("[PASS] DELETE /api/v1/products/P-TEST-VERIFY -> 200 OK (Verified 404 on subsequent get)", flush=True)

        # 10. List Orders (Seeded Data)
        code, orders = request("GET", "/api/v1/orders")
        assert code == 200 and len(orders) >= 7, f"List orders failed: {code}"
        print(f"[PASS] GET /api/v1/orders -> 200 OK (Retrieved {len(orders)} seeded orders)", flush=True)

        # 11. Get Single Order by ID
        code, order_1001 = request("GET", f"/api/v1/orders/{urllib.parse.quote('#1001')}")
        assert code == 200 and order_1001["product_name"] == "Tomato", f"Get order #1001 failed: {code}"
        print(f"[PASS] GET /api/v1/orders/#1001 -> 200 OK (Buyer: {order_1001['buyer_name']}, Status: {order_1001['status']})", flush=True)

        # 12. Get Nonexistent Order -> 404
        code, _ = request("GET", "/api/v1/orders/%2399999")
        assert code == 404, f"Expected 404, got {code}"
        print("[PASS] GET /api/v1/orders/#99999 -> 404 Not Found as expected", flush=True)

        # 13. Create Order
        new_ord = {
            "buyer_id": "U-B1",
            "product_id": "P-1001",
            "quantity": 100,
            "delivery_location": "Chandigarh",
        }
        code, created_ord = request("POST", "/api/v1/orders", new_ord)
        assert code == 201 and created_ord["status"] == "Pending", f"Create order failed: {code} {created_ord}"
        test_order_id = created_ord["id"]
        print(f"[PASS] POST /api/v1/orders -> 201 Created (ID: {test_order_id}, 100kg Tomato to Chandigarh)", flush=True)

        # 14. Patch Order Status
        code, patched_ord = request(
            "PATCH",
            f"/api/v1/orders/{urllib.parse.quote(test_order_id)}/status",
            {"status": "Accepted"},
        )
        assert code == 200 and patched_ord["status"] == "Accepted", f"Patch status failed: {code}"
        print(f"[PASS] PATCH /api/v1/orders/{test_order_id}/status -> 200 OK (Status transitioned to Accepted)", flush=True)

        # 15. Patch Order Status Validation (Invalid Status)
        code, err = request(
            "PATCH",
            f"/api/v1/orders/{urllib.parse.quote(test_order_id)}/status",
            {"status": "NonexistentStatus"},
        )
        assert code == 400, f"Expected 400, got {code}"
        print("[PASS] PATCH /api/v1/orders/{id}/status -> 400 Bad Request on invalid status", flush=True)

        # 16. Clean up test order to preserve exact seeded state
        db = SessionLocal()
        try:
            db.query(Order).filter(Order.id == test_order_id).delete()
            db.commit()
            print(f"[CLEANUP] Removed test order {test_order_id} (PostgreSQL seed data fully preserved)", flush=True)
        finally:
            db.close()

        print("=" * 65, flush=True)
        print("ALL 16 TESTS PASSED WITH 100% SUCCESS RATE!", flush=True)
        print("=" * 65, flush=True)

    finally:
        print("\nShutting down test Uvicorn server...", flush=True)
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        try:
            log_file.close()
        except Exception:
            pass
        print("Uvicorn server stopped cleanly.", flush=True)


if __name__ == "__main__":
    run_tests()
