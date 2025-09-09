#!/bin/bash

# Database Migration Runner for IndigoInvestor
# Run all migrations in order on production database

set -e  # Exit on error

echo "🚀 IndigoInvestor Database Migration Runner"
echo "==========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it with: export DATABASE_URL='postgresql://...'"
    exit 1
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Migration directory
MIGRATION_DIR="../supabase/migrations"

# Check if migration directory exists
if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}❌ Migration directory not found: $MIGRATION_DIR${NC}"
    exit 1
fi

# Create migrations tracking table if it doesn't exist
echo "📋 Creating migrations tracking table..."
psql "$DATABASE_URL" << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Get list of migration files
echo -e "\n📂 Found migration files:"
ls -la $MIGRATION_DIR/*.sql | awk '{print $9}'

# Function to run a single migration
run_migration() {
    local file=$1
    local filename=$(basename "$file")
    
    # Check if migration has already been run
    local already_run=$(psql -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$filename';" "$DATABASE_URL" | tr -d ' ')
    
    if [ "$already_run" -eq "1" ]; then
        echo -e "${YELLOW}⏩ Skipping $filename (already executed)${NC}"
        return 0
    fi
    
    echo -e "\n${GREEN}▶️  Running migration: $filename${NC}"
    
    # Run the migration
    if psql "$DATABASE_URL" < "$file"; then
        # Record successful migration
        psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$filename');"
        echo -e "${GREEN}✅ Successfully applied: $filename${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to apply: $filename${NC}"
        return 1
    fi
}

# Run migrations in order
echo -e "\n🔄 Starting migrations..."
echo "=========================="

MIGRATIONS=(
    "000_critical_rls_fix.sql"
    "001_initial_schema.sql"
    "002_rls_policies.sql"
    "003_excel_backend.sql"
    "004_phase3_additional_tables.sql"
    "007_audit_events_view.sql"
    "008_2fa_totp_support.sql"
    "009_fix_profiles_rls_recursion.sql"
    "010_support_tickets_table.sql"
    "011_withdrawals.sql"
    "20250109_admin_investor_functions.sql"
)

FAILED=0
SUCCESS=0

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$MIGRATION_DIR/$migration" ]; then
        if run_migration "$MIGRATION_DIR/$migration"; then
            ((SUCCESS++))
        else
            ((FAILED++))
            echo -e "${RED}⚠️  Migration failed. Stopping execution.${NC}"
            break
        fi
    else
        echo -e "${YELLOW}⚠️  Migration file not found: $migration${NC}"
    fi
done

# Summary
echo -e "\n📊 Migration Summary"
echo "==================="
echo -e "${GREEN}✅ Successful: $SUCCESS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"

# Check RLS policies
echo -e "\n🔒 Checking RLS Policies..."
psql "$DATABASE_URL" << EOF
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
EOF

# List all policies
echo -e "\n📋 Active RLS Policies:"
psql "$DATABASE_URL" << EOF
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
EOF

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All migrations completed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some migrations failed. Please check the errors above.${NC}"
    exit 1
fi
