#!/bin/bash
# ============================================================================
# Fresh DB Smoke Test Script
# ============================================================================
# Purpose: Validate that migrations work correctly on a clean database
#          and all integrity checks pass
# 
# Usage: 
#   ./scripts/db-smoke-test.sh              # Run against local Supabase
#   ./scripts/db-smoke-test.sh --ci         # Run in CI mode (stricter)
#   DATABASE_URL=... ./scripts/db-smoke-test.sh  # Run against specific DB
# ============================================================================

set -e

CI_MODE=false
if [ "$1" == "--ci" ]; then
  CI_MODE=true
fi

echo "=============================================="
echo "  Fresh Database Smoke Test"
echo "=============================================="
echo ""

# Check if we have a database URL
if [ -z "$DATABASE_URL" ]; then
  echo "📦 No DATABASE_URL set, using local Supabase..."
  
  # Check if Supabase CLI is available
  if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
  fi
  
  echo "🔄 Resetting local database..."
  npx supabase db reset --local 2>&1 || {
    echo "⚠️  Supabase reset failed. Is Supabase running locally?"
    echo "   Try: npx supabase start"
    exit 1
  }
  
  # Get local database URL
  DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
fi

echo ""
echo "🧪 Running integrity checks..."
echo ""

# Function to run a check and capture results
run_check() {
  local name="$1"
  local query="$2"
  local expected="$3"
  
  echo -n "  Checking $name... "
  
  result=$(psql "$DATABASE_URL" -t -c "$query" 2>&1) || {
    echo "❌ FAILED"
    echo "    Error: $result"
    return 1
  }
  
  # Trim whitespace
  result=$(echo "$result" | xargs)
  
  if [ "$result" == "$expected" ]; then
    echo "✅ PASS ($result)"
    return 0
  else
    echo "❌ FAIL (got: $result, expected: $expected)"
    return 1
  fi
}

FAILURES=0

# Check 1: Fund AUM mismatches
echo "📊 Data Integrity Checks:"
run_check "Fund AUM mismatches" \
  "SELECT COUNT(*) FROM fund_aum_mismatch WHERE ABS(discrepancy) > 0.01" \
  "0" || ((FAILURES++))

# Check 2: Investor position mismatches
run_check "Investor position mismatches" \
  "SELECT COUNT(*) FROM investor_position_ledger_mismatch WHERE ABS(discrepancy) > 0.01" \
  "0" || ((FAILURES++))

# Check 3: Period orphans
run_check "Period orphans" \
  "SELECT COUNT(*) FROM v_period_orphans" \
  "0" || ((FAILURES++))

# Check 4: Transaction distribution orphans
run_check "Transaction distribution orphans" \
  "SELECT COUNT(*) FROM v_transaction_distribution_orphans" \
  "0" || ((FAILURES++))

# Check 5: Fee allocation orphans
run_check "Fee allocation orphans" \
  "SELECT COUNT(*) FROM v_fee_allocation_orphans" \
  "0" || ((FAILURES++))

# Check 6: Yield distribution conservation
run_check "Yield distribution conservation issues" \
  "SELECT COUNT(*) FROM yield_distribution_conservation_check WHERE ABS(conservation_error) > 0.01" \
  "0" || ((FAILURES++))

echo ""
echo "🏗️  Schema Validation Checks:"

# Check 6: Critical tables exist
run_check "withdrawal_audit_logs table exists" \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'withdrawal_audit_logs' AND table_schema = 'public'" \
  "1" || ((FAILURES++))

# Check 7: Compatibility view exists
run_check "withdrawal_audit_log view exists" \
  "SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'withdrawal_audit_log' AND table_schema = 'public'" \
  "1" || ((FAILURES++))

# Check 8: RPC functions exist
echo ""
echo "🔧 Function Checks:"
run_check "cancel_withdrawal_by_admin function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'cancel_withdrawal_by_admin'" \
  "1" || ((FAILURES++))

run_check "delete_withdrawal function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'delete_withdrawal'" \
  "1" || ((FAILURES++))

run_check "void_transaction function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'void_transaction'" \
  "1" || ((FAILURES++))

run_check "admin_create_transaction function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'admin_create_transaction'" \
  "1" || ((FAILURES++))

run_check "recompute_investor_position function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'recompute_investor_position'" \
  "1" || ((FAILURES++))

run_check "preview_daily_yield_to_fund_v2 function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'preview_daily_yield_to_fund_v2'" \
  "1" || ((FAILURES++))

run_check "apply_daily_yield_to_fund_v2 function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'apply_daily_yield_to_fund_v2'" \
  "1" || ((FAILURES++))

# Summary
echo ""
echo "=============================================="
if [ $FAILURES -eq 0 ]; then
  echo "  ✅ ALL CHECKS PASSED"
  echo "=============================================="
  exit 0
else
  echo "  ❌ $FAILURES CHECK(S) FAILED"
  echo "=============================================="
  
  if [ "$CI_MODE" == "true" ]; then
    exit 1
  else
    echo ""
    echo "⚠️  Some checks failed. Review the output above."
    echo "   In CI mode (--ci), this would fail the build."
    exit 1
  fi
fi
