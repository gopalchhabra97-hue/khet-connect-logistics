#!/usr/bin/env python
"""Setup PostgreSQL database for KHETSETU."""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def setup_database():
    """Create khetsetu database if it doesn't exist."""
    try:
        # Connect to default postgres database
        conn = psycopg2.connect(
            host='localhost',
            user='postgres',
            password='Gopal@#2502',
            dbname='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # Check if khetsetu database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname='khetsetu'")
        exists = cur.fetchone()

        if exists:
            print("✓ Database 'khetsetu' already exists")
        else:
            cur.execute("CREATE DATABASE khetsetu")
            print("✓ Database 'khetsetu' created successfully")

        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    setup_database()
