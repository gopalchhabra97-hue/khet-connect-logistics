#!/usr/bin/env python
"""Seed KHETSETU database with demo data from mockData.ts."""

import psycopg2
from datetime import datetime

# Demo data (extracted from mockData.ts)
DEMO_USERS = {
    "farmer@demo.com": {
        "id": "U-F1",
        "name": "Rajesh Kumar",
        "email": "farmer@demo.com",
        "role": "farmer",
        "org": "Green Valley FPO",
        "location": "Patiala",
    },
    "buyer@demo.com": {
        "id": "U-B1",
        "name": "Anita Sharma",
        "email": "buyer@demo.com",
        "role": "buyer",
        "org": "FreshMart Retail",
        "location": "Chandigarh",
    },
    "driver@demo.com": {
        "id": "D-1",
        "name": "Amit Kumar",
        "email": "driver@demo.com",
        "role": "driver",
        "location": "Patiala",
    },
    "admin@demo.com": {
        "id": "U-A1",
        "name": "Priya Nair",
        "email": "admin@demo.com",
        "role": "admin",
        "org": "CodeAxis Operations",
        "location": "Chandigarh",
    },
}

# Additional farmers (implied from products)
ADDITIONAL_USERS = [
    {"id": "U-F2", "name": "Sukhbir Singh", "email": "farmer2@demo.com", "role": "farmer", "org": "Sutlej Farmers Collective", "location": "Ludhiana"},
    {"id": "U-F3", "name": "Vikram Patel", "email": "farmer3@demo.com", "role": "farmer", "org": "Karnal Agro Producer Co.", "location": "Karnal"},
    {"id": "U-F4", "name": "Deepak Sharma", "email": "farmer4@demo.com", "role": "farmer", "org": "Saraswati FPO", "location": "Kurukshetra"},
    {"id": "U-F5", "name": "Priya Kapoor", "email": "farmer5@demo.com", "role": "farmer", "org": "Ambala Kisan Group", "location": "Ambala"},
    {"id": "U-B2", "name": "Mohit Verma", "email": "buyer2@demo.com", "role": "buyer", "org": "Ambala Wholesale Mandi", "location": "Ambala"},
    {"id": "U-B3", "name": "Neha Gupta", "email": "buyer3@demo.com", "role": "buyer", "org": "Kurukshetra Fresh Foods", "location": "Kurukshetra"},
    {"id": "U-B4", "name": "Rajesh Singh", "email": "buyer4@demo.com", "role": "buyer", "org": "Ludhiana Retail Chain", "location": "Ludhiana"},
    {"id": "U-B5", "name": "Arjun Kumar", "email": "buyer5@demo.com", "role": "buyer", "org": "Karnal Bulk Traders", "location": "Karnal"},
    {"id": "D-2", "name": "Harpreet Singh", "email": "driver2@demo.com", "role": "driver", "location": "Ludhiana"},
    {"id": "D-3", "name": "Sandeep Kumar", "email": "driver3@demo.com", "role": "driver", "location": "Ambala"},
]

SEED_PRODUCTS = [
    ("P-1001", "Tomato", "Vegetables", 1000, "kg", 25, "Patiala", "U-F1", "Green Valley FPO", True, "2026-08-24", True),
    ("P-1002", "Potato", "Vegetables", 2400, "kg", 18, "Patiala", "U-F1", "Green Valley FPO", True, "2026-08-20", True),
    ("P-1003", "Onion", "Vegetables", 1800, "kg", 22, "Ludhiana", "U-F2", "Sutlej Farmers Collective", True, "2026-08-18", True),
    ("P-1004", "Wheat", "Grains", 5000, "kg", 24, "Karnal", "U-F3", "Karnal Agro Producer Co.", True, "2026-04-12", False),
    ("P-1005", "Rice", "Grains", 3200, "kg", 38, "Kurukshetra", "U-F4", "Saraswati FPO", True, "2026-06-02", True),
    ("P-1006", "Green Peas", "Pulses", 640, "kg", 46, "Ambala", "U-F5", "Ambala Kisan Group", False, "2026-08-10", False),
    ("P-1007", "Guava", "Fruits", 420, "kg", 55, "Patiala", "U-F1", "Green Valley FPO", True, "2026-08-26", True),
]

SEED_ORDERS = [
    ("#1001", "U-B1", "FreshMart Retail", "P-1001", "Tomato", 300, "kg", 25, "Patiala", "Chandigarh", "2026-08-27", "2026-08-30", "Accepted", None),
    ("#1002", "U-B2", "Ambala Wholesale Mandi", "P-1001", "Tomato", 400, "kg", 25, "Patiala", "Ambala", "2026-08-27", "2026-08-30", "Accepted", None),
    ("#1003", "U-B3", "Kurukshetra Fresh Foods", "P-1002", "Potato", 200, "kg", 18, "Patiala", "Kurukshetra", "2026-08-28", "2026-08-31", "Accepted", None),
    ("#1004", "U-B1", "FreshMart Retail", "P-1007", "Guava", 120, "kg", 55, "Patiala", "Chandigarh", "2026-08-28", "2026-09-01", "Pending", None),
    ("#1005", "U-B4", "Ludhiana Retail Chain", "P-1002", "Potato", 500, "kg", 18, "Patiala", "Ludhiana", "2026-08-26", "2026-08-29", "Pending", None),
    ("#0998", "U-B1", "FreshMart Retail", "P-1002", "Potato", 250, "kg", 18, "Patiala", "Chandigarh", "2026-08-18", "2026-08-21", "Delivered", None),
    ("#0999", "U-B5", "Karnal Bulk Traders", "P-1001", "Tomato", 180, "kg", 24, "Patiala", "Karnal", "2026-08-15", "2026-08-18", "Rejected", None),
]

SEED_VEHICLES = [
    ("V-A", "Vehicle A", "PB-11-4521", 500, "Unavailable", "Patiala"),
    ("V-B", "Vehicle B", "HR-XX-1234", 1000, "Available", "Patiala"),
    ("V-C", "Vehicle C", "PB-65-8890", 2000, "Available", "Ludhiana"),
]

SEED_DRIVERS = [
    ("D-1", "Amit Kumar", "+91 98765 43210", "PB0320190004521", "Available", "Patiala", None),
    ("D-2", "Harpreet Singh", "+91 98110 22334", "PB0320170009912", "Assigned", "Ludhiana", "V-C"),
    ("D-3", "Sandeep Kumar", "+91 99887 66554", "HR0120200001188", "Available", "Ambala", None),
]

import json

SEED_QUALITY_RESULTS = [
    (
        "CQR-1001",
        "P-1001",
        "/static/uploads/quality/demo_tomato.jpg",
        "Tomato",
        87.0,
        "A",
        json.dumps({
            "freshness": 18.0,
            "color_appearance": 13.0,
            "physical_damage": 12.5,
            "disease_spots": 13.0,
            "pest_damage": 9.0,
            "size_uniformity": 8.5,
            "rot_decay": 8.5,
            "cleanliness": 4.5,
        }),
        json.dumps([
            "Minor surface caliper variation across batch",
            "Light pressure marks on ~4% of sample",
        ]),
        "Well suited for fresh wholesale mandi and retail distribution. Maintain cold chain at 10-12°C.",
        "demo",
    ),
    (
        "CQR-1002",
        "P-1002",
        "/static/uploads/quality/demo_potato.jpg",
        "Potato",
        92.0,
        "A+",
        json.dumps({
            "freshness": 19.0,
            "color_appearance": 14.0,
            "physical_damage": 14.0,
            "disease_spots": 14.5,
            "pest_damage": 9.5,
            "size_uniformity": 8.5,
            "rot_decay": 8.5,
            "cleanliness": 4.0,
        }),
        json.dumps([
            "Dry soil dust adhering to skin",
            "Minor superficial scuffing during harvest handling",
        ]),
        "Excellent export & processing grade. Store in ventilated dark storage at 8-10°C to prevent greening.",
        "demo",
    ),
    (
        "CQR-1003",
        "P-1003",
        "/static/uploads/quality/demo_onion.jpg",
        "Onion",
        76.0,
        "B",
        json.dumps({
            "freshness": 15.5,
            "color_appearance": 11.5,
            "physical_damage": 11.0,
            "disease_spots": 11.5,
            "pest_damage": 8.0,
            "size_uniformity": 7.5,
            "rot_decay": 7.5,
            "cleanliness": 3.5,
        }),
        json.dumps([
            "Outer peel slippage observed on ~12% of bulbs",
            "Neck drying partially incomplete",
        ]),
        "Standard commercial mandi wholesale grade. Ensure dry forced-air curing before long-distance transit.",
        "demo",
    ),
    (
        "CQR-1004",
        "P-1004",
        "/static/uploads/quality/demo_wheat.jpg",
        "Wheat",
        84.0,
        "A",
        json.dumps({
            "freshness": 17.0,
            "color_appearance": 13.0,
            "physical_damage": 12.0,
            "disease_spots": 12.5,
            "pest_damage": 8.5,
            "size_uniformity": 8.5,
            "rot_decay": 8.5,
            "cleanliness": 4.0,
        }),
        json.dumps([
            "Minimal chaff and broken kernel fraction (~1.5%)",
        ]),
        "High milling quality. Suitable for wholesale food processing and flour mill contracts.",
        "demo",
    ),
    (
        "CQR-1005",
        "P-1005",
        "/static/uploads/quality/demo_rice.jpg",
        "Rice",
        88.0,
        "A",
        json.dumps({
            "freshness": 18.0,
            "color_appearance": 13.5,
            "physical_damage": 13.0,
            "disease_spots": 13.0,
            "pest_damage": 9.0,
            "size_uniformity": 8.5,
            "rot_decay": 9.0,
            "cleanliness": 4.0,
        }),
        json.dumps([
            "Low chalkiness; slight length variation across grain lots",
        ]),
        "Grade A commercial rice. Maintain airtight dry warehousing below 65% relative humidity.",
        "demo",
    ),
    (
        "CQR-1006",
        "P-1006",
        "/static/uploads/quality/demo_peas.jpg",
        "Green Peas",
        72.0,
        "B",
        json.dumps({
            "freshness": 14.5,
            "color_appearance": 11.0,
            "physical_damage": 10.5,
            "disease_spots": 11.0,
            "pest_damage": 7.5,
            "size_uniformity": 7.0,
            "rot_decay": 7.0,
            "cleanliness": 3.5,
        }),
        json.dumps([
            "Slight pod yellowing on early-matured pods",
            "Superficial mechanical transit rubbing",
        ]),
        "Good for local retail market. Priority dispatch recommended due to high perishability.",
        "demo",
    ),
    (
        "CQR-1007",
        "P-1007",
        "/static/uploads/quality/demo_guava.jpg",
        "Guava",
        94.0,
        "A+",
        json.dumps({
            "freshness": 19.5,
            "color_appearance": 14.5,
            "physical_damage": 14.0,
            "disease_spots": 14.0,
            "pest_damage": 9.5,
            "size_uniformity": 9.0,
            "rot_decay": 9.0,
            "cleanliness": 4.5,
        }),
        json.dumps([
            "Natural fruit lenticels present (cosmetic only)",
        ]),
        "Premium table fruit export grade. Pack in cushioned ventilated crates for transit.",
        "demo",
    ),
]



from pathlib import Path
from dotenv import load_dotenv

env_file = Path(__file__).resolve().parent / ".env"
if env_file.exists():
    load_dotenv(env_file)
else:
    load_dotenv()


def seed_database():
    """Seed the database with demo data."""
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise RuntimeError("DATABASE_URL environment variable is not set. Please configure backend/.env")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        print("Checking database seeding status...")

        # Check users count
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]


        if user_count == 0:
            # Seed users
            print("  - Seeding users...")
            all_users = list(DEMO_USERS.values()) + ADDITIONAL_USERS
            for user in all_users:
                cur.execute(
                    "INSERT INTO users (id, name, email, role, org, location) VALUES (%s, %s, %s, %s, %s, %s)",
                    (user['id'], user['name'], user['email'], user['role'], user.get('org'), user.get('location'))
                )
            print(f"    ✓ {len(all_users)} users inserted")

            # Seed products
            print("  - Seeding products...")
            for product in SEED_PRODUCTS:
                cur.execute(
                    "INSERT INTO products (id, name, category, quantity, unit, price, location, seller_id, seller_name, available, harvest_date, verified) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    product
                )
            print(f"    ✓ {len(SEED_PRODUCTS)} products inserted")

            # Seed orders
            print("  - Seeding orders...")
            for order in SEED_ORDERS:
                cur.execute(
                    "INSERT INTO orders (id, buyer_id, buyer_name, product_id, product_name, quantity, unit, price_per_unit, pickup_location, delivery_location, order_date, expected_delivery, status, batch_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    order
                )
            print(f"    ✓ {len(SEED_ORDERS)} orders inserted")

            # Seed vehicles
            print("  - Seeding vehicles...")
            for vehicle in SEED_VEHICLES:
                cur.execute(
                    "INSERT INTO vehicles (id, name, registration, capacity, status, base_location) VALUES (%s, %s, %s, %s, %s, %s)",
                    vehicle
                )
            print(f"    ✓ {len(SEED_VEHICLES)} vehicles inserted")

            # Seed drivers
            print("  - Seeding drivers...")
            for driver in SEED_DRIVERS:
                cur.execute(
                    "INSERT INTO drivers (id, name, phone, license, status, base_location, vehicle_id) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    driver
                )
            print(f"    ✓ {len(SEED_DRIVERS)} drivers inserted")
            conn.commit()
        else:
            print(f"[OK] Base records exist ({user_count} users). Skipping base seed to prevent duplicates.")

        # Check and seed crop quality results
        cur.execute("SELECT COUNT(*) FROM crop_quality_results")
        quality_count = cur.fetchone()[0]
        if quality_count == 0:
            print("  - Seeding demo crop quality assessments...")
            for q in SEED_QUALITY_RESULTS:
                cur.execute(
                    """INSERT INTO crop_quality_results
                       (id, product_id, image_url, crop, total_score, grade, factor_scores, detected_issues, recommendation, analysis_mode)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    q
                )
            conn.commit()
            print(f"    [OK] {len(SEED_QUALITY_RESULTS)} crop quality assessments inserted")
        else:
            print(f"[OK] Crop quality assessments already seeded ({quality_count} records).")

        cur.execute("SELECT COUNT(*) FROM crop_quality_results")
        quality_final = cur.fetchone()[0]

        print("\n[OK] Database status check completed!")
        
        # Verify data
        cur.execute("SELECT COUNT(*) FROM users")
        users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM products")
        products = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM orders")
        orders = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM vehicles")
        vehicles = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM drivers")
        drivers = cur.fetchone()[0]

        print(f"\nDatabase status:")
        print(f"  - Users: {users}")
        print(f"  - Products: {products}")
        print(f"  - Orders: {orders}")
        print(f"  - Vehicles: {vehicles}")
        print(f"  - Drivers: {drivers}")
        print(f"  - Crop Quality Assessments: {quality_final}")

        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[ERROR]: {e}")
        return False



if __name__ == "__main__":
    seed_database()
