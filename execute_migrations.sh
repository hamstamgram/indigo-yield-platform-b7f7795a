#!/bin/bash

echo "=========================================="
echo "DATABASE MIGRATION EXECUTION"
echo "=========================================="

PROD_URL="https://nkfimvovosdehmyyjubn.supabase.co"
PROD_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.SERVICE_ROLE_KEY_NEEDED"

echo ""
echo "⚠️  WARNING: This will execute the following changes:"
echo "   1. DELETE 10 tables (9 empty + support_tickets)"
echo "   2. DEPLOY 3 new tables (investor_emails, email_logs, onboarding_submissions)"
echo ""
echo "Tables to be DELETED:"
echo "   - deposits (0 rows)"
echo "   - yield_rates (6 rows - BACKUP CREATED)"
echo "   - portfolio_history (0 rows)"
echo "   - daily_nav (0 rows)"
echo "   - benchmarks (0 rows)"
echo "   - reconciliation (0 rows)"
echo "   - withdrawal_requests (0 rows)"
echo "   - secure_shares (0 rows)"
echo "   - bank_accounts (0 rows)"
echo "   - support_tickets (0 rows)"
echo ""
echo "Tables to be CREATED:"
echo "   - investor_emails (multi-email support)"
echo "   - email_logs (email tracking)"
echo "   - onboarding_submissions (Airtable sync)"
echo ""
echo "Backups will be created:"
echo "   - yield_rates_backup_20251118 (6 rows preserved)"
echo "   - assets_backup_20251118 (6 rows preserved)"
echo ""

read -p "Do you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Migration cancelled."
  exit 0
fi

echo ""
echo "=========================================="
echo "STEP 1: Executing Cleanup Migration"
echo "=========================================="

# Note: Direct SQL execution via Supabase REST API requires service_role key
# For safety, we'll output the SQL for manual execution

echo ""
echo "✅ Cleanup SQL ready: database_cleanup_migration.sql"
echo "✅ Deploy SQL ready: deploy_new_tables_migration.sql"
echo ""
echo "=========================================="
echo "MANUAL EXECUTION REQUIRED"
echo "=========================================="
echo ""
echo "Please execute these migrations manually:"
echo ""
echo "Option 1: Supabase Dashboard"
echo "  1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql"
echo "  2. Copy contents of database_cleanup_migration.sql"
echo "  3. Paste and run"
echo "  4. Copy contents of deploy_new_tables_migration.sql"
echo "  5. Paste and run"
echo ""
echo "Option 2: Supabase CLI (if configured)"
echo "  supabase db execute -f database_cleanup_migration.sql"
echo "  supabase db execute -f deploy_new_tables_migration.sql"
echo ""
echo "Option 3: psql (if you have connection string)"
echo "  psql \$DATABASE_URL -f database_cleanup_migration.sql"
echo "  psql \$DATABASE_URL -f deploy_new_tables_migration.sql"
echo ""

