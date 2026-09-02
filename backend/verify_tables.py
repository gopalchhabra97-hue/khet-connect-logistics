#!/usr/bin/env python
"""Verify database tables were created."""

import psycopg2

def verify_tables():
    """Check if database tables exist."""
    try:
        conn = psycopg2.connect(
            host='localhost',
            user='postgres',
            password='Gopal@#2502',
            dbname='khetsetu'
        )
        cur = conn.cursor()

        # Get list of tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public'
            ORDER BY table_name
        """)

        tables = cur.fetchall()
        print('✓ Database tables created:')
        for table in tables:
            print(f'  - {table[0]}')

        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f'✗ Error: {e}')
        return False

if __name__ == "__main__":
    verify_tables()
