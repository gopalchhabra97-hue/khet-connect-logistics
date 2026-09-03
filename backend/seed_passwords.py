"""Seed default password hashes for existing demo users in PostgreSQL."""

import os
import bcrypt
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.user import User

load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def seed_passwords():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        # Default demo password for prototype testing
        default_pw = "demo123"
        hashed = bcrypt.hashpw(default_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        
        updated_count = 0
        for user in users:
            if not user.password_hash:
                user.password_hash = hashed
                updated_count += 1
        
        db.commit()
        print(f"Successfully seeded password hashes for {updated_count} users.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_passwords()
