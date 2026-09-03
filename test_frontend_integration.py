"""
End-to-End integration test simulating the exact calls executed by the Frontend
(DemoStore, Farmer Products, Buyer Marketplace, PlaceOrderModal, and Farmer Orders).
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

def api_call(method, path, body=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"} if body else {}
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.getcode(), json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {}

def main():
    print("=" * 65)
    print("TESTING FRONTEND <-> BACKEND WORKFLOWS (PHASE 2)")
    print("=" * 65)

    # 1. Health check
    req = urllib.request.Request("http://127.0.0.1:8000/api/health")
    with urllib.request.urlopen(req) as resp:
        health_data = json.loads(resp.read().decode("utf-8"))
        print(f"[1] Backend Health Check: {resp.getcode()} -> {health_data}")

    # 2. Products loading (App Mount & Marketplace view)
    code, products = api_call("GET", "/products")
    assert code == 200 and len(products) >= 7
    print(f"[2] Marketplace Products Retrieved: {len(products)} items loaded from PostgreSQL")
    print(f"    Sample: {products[0]['name']} (Rs. {products[0]['price']}/{products[0]['unit']} from {products[0]['seller_name']})")

    # 3. Farmer creates a new product (Add Product screen /farmer/products/new)
    test_product_payload = {
        "name": "Kinnow Mandarins",
        "category": "Fruits",
        "quantity": 600,
        "unit": "kg",
        "price": 42.0,
        "location": "Patiala",
        "seller_id": "U-F1",
        "seller_name": "Green Valley FPO",
        "available": True,
        "harvest_date": "2026-09-03",
    }
    code, created_prod = api_call("POST", "/products", test_product_payload)
    assert code == 201 and created_prod["name"] == "Kinnow Mandarins"
    prod_id = created_prod["id"]
    print(f"[3] Farmer Added Product: {prod_id} ('{created_prod['name']}') -> 201 Created")

    # 4. Farmer updates product price & quantity (/farmer/products/$productId/edit)
    code, updated_prod = api_call("PATCH", f"/products/{prod_id}", {"price": 40.0, "quantity": 580})
    assert code == 200 and updated_prod["price"] == 40.0 and updated_prod["quantity"] == 580
    print(f"[4] Farmer Updated Product: {prod_id} new price: ₹{updated_prod['price']}, qty: {updated_prod['quantity']}")

    # 5. Buyer places an order (PlaceOrderModal on Marketplace)
    order_payload = {
        "buyer_id": "U-B1",
        "buyer_name": "FreshMart Retail",
        "product_id": prod_id,
        "quantity": 150,
        "delivery_location": "Chandigarh",
    }
    code, created_order = api_call("POST", "/orders", order_payload)
    assert code == 201 and created_order["quantity"] == 150 and created_order["status"] == "Pending"
    order_id = created_order["id"]
    print(f"[5] Buyer Placed Order: {order_id} ({created_order['quantity']}kg {created_order['product_name']}) -> Status: {created_order['status']}")

    # 6. Farmer accepts the order (/farmer/orders)
    code, updated_order = api_call("PATCH", f"/orders/{urllib.parse.quote(order_id)}/status", {"status": "Accepted"})
    assert code == 200 and updated_order["status"] == "Accepted"
    print(f"[6] Farmer Accepted Order: {order_id} -> Status Transitioned to '{updated_order['status']}'")

    # 7. Database Verification: Check that PostgreSQL holds the exact records
    load_dotenv("backend/.env")
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    cur.execute("SELECT id, name, price, quantity FROM products WHERE id = %s", (prod_id,))
    row = cur.fetchone()
    assert row is not None and row[1] == "Kinnow Mandarins" and row[2] == 40.0 and row[3] == 580
    print(f"[7] PostgreSQL DB Verification: Product '{row[1]}' successfully persisted with price ₹{row[2]}")

    cur.execute("SELECT id, product_name, status, quantity FROM orders WHERE id = %s", (order_id,))
    order_row = cur.fetchone()
    assert order_row is not None and order_row[2] == "Accepted" and order_row[3] == 150
    print(f"[8] PostgreSQL DB Verification: Order '{order_row[0]}' successfully persisted with status '{order_row[2]}'")

    # 8. Cleanup test records so PostgreSQL seed data remains pristine
    cur.execute("DELETE FROM orders WHERE id = %s", (order_id,))
    conn.commit()
    print(f"[9a] Removed test order {order_id}")

    # Delete product via DELETE API
    code, del_res = api_call("DELETE", f"/products/{prod_id}")
    assert code == 200
    print(f"[9b] Deleted test product {prod_id} via API")

    # Verify seed counts
    cur.execute("SELECT count(*) FROM products")
    p_count = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM orders")
    o_count = cur.fetchone()[0]
    assert p_count == 7 and o_count == 7
    print(f"[10] PostgreSQL Seed Counts Intact: {p_count} products, {o_count} orders")

    cur.close()
    conn.close()

    print("\n" + "=" * 65)
    print("ALL FRONTEND <-> BACKEND WORKFLOWS VERIFIED (100% SUCCESS)")
    print("=" * 65)

if __name__ == "__main__":
    main()
