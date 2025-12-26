import psycopg2
import os

# Configuration - Using the Direct Connection (IPv4 workarounds often needed)
# Supabase often resolves the project ref subdomain to IPv6.
# If local machine has IPv6 issues, it fails.
# Try the direct DB host again, maybe it works if network allows.
# OR use the pooler with the simpler user name?
# "postgres.nkfimvovosdehmyyjubn" was rejected.
# Usually pooler user is just "postgres.nkfimvovosdehmyyjubn" OR just "postgres" if using project-specific URL.

# Let's try the standard direct connection string format provided by Supabase settings usually:
# host: db.nkfimvovosdehmyyjubn.supabase.co
# user: postgres
# pass: ...

# If "No route to host" (IPv6 issue), we can try resolving the IPv4 address of the Supabase project if available, 
# but Supabase Direct is often IPv6 only on some networks.
# The Transaction Pooler (port 6543) is IPv4 compatible.
# The user for pooler is typically `postgres.PROJECT_REF`.

# Let's try one more time with the pooler but verifying the username format.
# Project Ref: nkfimvovosdehmyyjubn
# User: postgres.nkfimvovosdehmyyjubn

# Maybe the password has special chars that need encoding? '@' is fine in psycopg2 usually.

DB_HOST = "aws-0-eu-central-1.pooler.supabase.com"
DB_PORT = "6543"
DB_NAME = "postgres"
DB_USER = "postgres.nkfimvovosdehmyyjubn"
DB_PASS = "Douentza2067@@"

MIGRATION_FILE = "indigo-yield-platform-v01/supabase/migrations/20251208_one_id_unification.sql"

# Also add the operational integrity SQL file
MIGRATION_FILE_2 = "indigo-yield-platform-v01/supabase/migrations/20251207_operational_integrity.sql"

def run_migration():
    print(f"Connecting to database {DB_HOST} on port {DB_PORT}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            sslmode='require'
        )
        conn.autocommit = True 
        
        print("Connected successfully.")
        
        # Run Migration 1 (Yield Logic)
        print(f"Applying Operational Integrity (Yield Logic)...")
        with open(MIGRATION_FILE_2, 'r') as f:
            sql = f.read()
        with conn.cursor() as cursor:
            cursor.execute(sql)
        print("Operational Integrity applied.")

        # Run Migration 2 (One ID)
        print(f"Applying One ID Unification (Schema Change)...")
        with open(MIGRATION_FILE, 'r') as f:
            sql = f.read()
        with conn.cursor() as cursor:
            cursor.execute(sql)
        print("One ID Unification applied.")
        
        conn.close()
        
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    run_migration()
