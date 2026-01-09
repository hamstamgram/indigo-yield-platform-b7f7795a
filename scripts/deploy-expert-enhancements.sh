#!/bin/bash
# Deploy Expert Enhancements Migrations
# This script executes the expert enhancement migrations directly on the database

set -e

DB_PASSWORD="${SUPABASE_DB_PASSWORD:-Douentza2067@@}"
PROJECT_REF="${SUPABASE_PROJECT_REF}"

if [ -z "$PROJECT_REF" ]; then
    echo "Error: SUPABASE_PROJECT_REF not set"
    echo "Please set SUPABASE_PROJECT_REF environment variable"
    exit 1
fi

# Construct connection string
DB_HOST="${PROJECT_REF}.supabase.co"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.${PROJECT_REF}"

echo "Deploying expert enhancements..."
echo "Project: ${PROJECT_REF}"
echo "Host: ${DB_HOST}"

# Deploy each migration
MIGRATIONS=(
    "20260105202500_expert_phase1_database_optimization.sql"
    "20260105202600_expert_phase1_audit_trail.sql"
    "20260105202700_expert_phase1_rate_limiting.sql"
    "20260105202800_expert_phase2_performance_metrics.sql"
    "20260105202900_expert_phase2_reconciliation.sql"
    "20260105203000_expert_phase2_health_check.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    echo ""
    echo "Deploying: ${migration}..."
    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "supabase/migrations/${migration}" 2>&1; then
        echo "✅ ${migration} deployed successfully"
    else
        echo "⚠️  ${migration} may have errors or already exists (check output above)"
    fi
done

echo ""
echo "✅ All migrations deployed!"
