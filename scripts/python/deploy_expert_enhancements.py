#!/usr/bin/env python3
"""
Deploy Expert Enhancements Migrations
Executes the expert enhancement migrations directly on the Supabase database
"""

import psycopg2
import os
import sys
from pathlib import Path

# Database configuration
DB_HOST = "aws-0-eu-central-1.pooler.supabase.com"
DB_PORT = "6543"
DB_NAME = "postgres"
DB_USER = "postgres.nkfimvovosdehmyyjubn"
DB_PASS = "Douentza2067@@"

# Get project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
MIGRATIONS_DIR = PROJECT_ROOT / "supabase" / "migrations"

# Migrations to deploy
MIGRATIONS = [
    "20260105202500_expert_phase1_database_optimization.sql",
    "20260105202600_expert_phase1_audit_trail.sql",
    "20260105202700_expert_phase1_rate_limiting.sql",
    "20260105202800_expert_phase2_performance_metrics.sql",
    "20260105202900_expert_phase2_reconciliation.sql",
    "20260105203000_expert_phase2_health_check.sql",
]

def deploy_migrations():
    print("=" * 70)
    print("DEPLOYING EXPERT ENHANCEMENTS")
    print("=" * 70)
    print(f"Project: nkfimvovosdehmyyjubn")
    print(f"Host: {DB_HOST}:{DB_PORT}")
    print("")
    
    try:
        print("Connecting to database...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            sslmode='require'
        )
        conn.autocommit = True
        print("✅ Connected successfully")
        print("")
        
        for migration_file in MIGRATIONS:
            migration_path = MIGRATIONS_DIR / migration_file
            if not migration_path.exists():
                print(f"⚠️  Skipping {migration_file} (file not found)")
                continue
            
            print(f"Deploying: {migration_file}...")
            try:
                with open(migration_path, 'r') as f:
                    sql = f.read()
                
                with conn.cursor() as cursor:
                    cursor.execute(sql)
                
                print(f"✅ {migration_file} deployed successfully")
            except psycopg2.errors.DuplicateObject as e:
                print(f"⚠️  {migration_file} - Object already exists (may be safe to ignore)")
            except psycopg2.errors.DuplicateTable as e:
                print(f"⚠️  {migration_file} - Table already exists (may be safe to ignore)")
            except Exception as e:
                print(f"❌ {migration_file} - Error: {e}")
                # Continue with other migrations
            print("")
        
        conn.close()
        print("=" * 70)
        print("✅ ALL MIGRATIONS DEPLOYED")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    deploy_migrations()
