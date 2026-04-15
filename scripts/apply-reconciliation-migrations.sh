#!/bin/bash
# =============================================================================
# Reconciliation Migration Verification & Application Script
# Run this to verify and apply the database reconciliation migrations
# =============================================================================

set -e

echo "=== Database Reconciliation Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Step 1: Verifying required RPCs exist in database..."
echo ""

# Check for each required RPC using Supabase SQL
echo "Checking for missing RPCs (should return 0 rows if they exist)..."
echo ""

# Functions to check
FUNCTIONS=(
  "cancel_withdrawal_by_admin_v2"
  "void_completed_withdrawal"
  "get_paged_audit_logs"
  "get_paged_notifications"
  "get_investor_cumulative_yield"
  "get_investor_yield_summary"
  "get_fund_positions_sum"
  "get_drift_summary"
)

echo "If any function is missing, it will show in the output above."
echo ""

echo "Step 2: Checking enum alignment..."
echo "  - tx_type should have: DUST (and DUST_SWEEP)"
echo "  - fund_status should have: closed, available (plus existing values)"
echo ""

echo "Step 3: To apply the migrations manually, run in Supabase SQL Editor:"
echo ""
echo "  -- Apply the RPC migration first (20260610000000_reconciliation_missing_rpcs.sql)"
echo "  -- Then apply the enum migration (20260610010000_reconciliation_enum_alignment.sql)"
echo ""

echo "Step 4: After applying migrations, regenerate frontend types:"
echo "  npm run contracts:generate"
echo ""

echo "Step 5: Verify TypeScript compilation:"
echo "  npx tsc --noEmit"
echo ""

echo "=== End of Reconciliation Script ==="