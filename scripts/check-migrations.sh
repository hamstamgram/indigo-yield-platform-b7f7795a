#!/bin/bash
# ============================================================================
# CI Guard Script: Check Migration Patterns
# ============================================================================
# Purpose: Prevent regressions by catching forbidden patterns in migrations
# Run: ./scripts/check-migrations.sh
# ============================================================================

set -e

echo "🔍 Checking migration files for forbidden patterns..."

MIGRATIONS_DIR="supabase/migrations"
EXIT_CODE=0

# Define forbidden patterns with explanations
declare -A FORBIDDEN_PATTERNS=(
  ["withdrawal_audit_log[^s]"]="Use 'withdrawal_audit_logs' (plural) - singular name was a bug"
  ["FROM withdrawal_audit_log[^s]"]="Use 'withdrawal_audit_logs' (plural) table name"
  ["INTO withdrawal_audit_log[^s]"]="Use 'withdrawal_audit_logs' (plural) table name"
  ["investor_positions\.id"]="investor_positions has composite PK (investor_id, fund_id), not id column"
  ["reference_id = 'position_adjustment'"]="Never use constant reference_id - causes unique constraint violations on repeat runs"
  ["reference_id := 'position_adjustment'"]="Never use constant reference_id - causes unique constraint violations on repeat runs"
  ["RETURNS TABLE.*[^_]fund_id uuid"]="RETURNS TABLE columns should use out_fund_id prefix to avoid PL/pgSQL scope collisions"
  ["RETURNS TABLE.*[^_]investor_id uuid"]="RETURNS TABLE columns should use out_investor_id prefix to avoid PL/pgSQL scope collisions"
  ["asset_code"]="Use 'asset' column name, not 'asset_code' - transactions_v2 uses 'asset'"
  ["effective_date"]="Use 'tx_date' column name, not 'effective_date' - transactions_v2 uses 'tx_date'"
  ["tx_type::tx_type"]="Use 'type' column, cast as v_effective_type::tx_type - column is named 'type' not 'tx_type'"
  ["current_balance"]="Use 'current_value' - investor_positions column is 'current_value' not 'current_balance'"
  ["transactions_v2.*status"]="Column 'status' does not exist in transactions_v2 - use 'is_voided' boolean instead"
  ["t\.status"]="Column 'status' does not exist in transactions_v2 - use 'is_voided' boolean instead"
  ["status = 'CONFIRMED'"]="transactions_v2 has no 'status' column - use 'is_voided = false' instead"
  ["DELETE FROM transactions_v2"]="Never hard-delete financial records - use void_transaction RPC instead"
  ["UPDATE transactions_v2 SET notes"]="Don't update notes for voiding - use void_transaction RPC instead"
  ["investor_positions\.update.*notes"]="Don't modify notes for corrections - use proper void/recompute RPCs"
  ["INSERT INTO transactions_v2.*VALUES"]="Direct INSERT into transactions_v2 bypasses crystallization - use apply_transaction_with_crystallization RPC"
  ["SELECT.*FROM investors "]="Table 'investors' does not exist - use 'profiles' for investor data"
  ["JOIN investors"]="Table 'investors' does not exist - use 'profiles' for investor data"
  ["DROP FUNCTION.*apply_transaction_with_crystallization"]="Never drop the canonical transaction RPC"
  ["DROP TRIGGER.*trg_enforce_transaction_via_rpc"]="Never drop the bypass enforcement trigger"
  ["REVOKE.*ON FUNCTION apply_transaction_with_crystallization"]="Never revoke access to canonical transaction RPC"
  ["source = 'direct'"]="Invalid tx_source value - use approved values: rpc_canonical, crystallization, manual_admin"
  ["\.balance[^_]"]="Use 'current_value' not 'balance' - investor_positions column is 'current_value'"
)

# Check each pattern
for pattern in "${!FORBIDDEN_PATTERNS[@]}"; do
  explanation="${FORBIDDEN_PATTERNS[$pattern]}"
  
  # Search for pattern, excluding the compatibility view migration
  matches=$(grep -rlE "$pattern" "$MIGRATIONS_DIR" 2>/dev/null | grep -v "withdrawal_audit_log AS" || true)
  
  if [ -n "$matches" ]; then
    echo ""
    echo "❌ ERROR: Found forbidden pattern '$pattern'"
    echo "   Explanation: $explanation"
    echo "   Found in:"
    echo "$matches" | while read -r file; do
      echo "     - $file"
      grep -nE "$pattern" "$file" | head -3 | sed 's/^/       /'
    done
    EXIT_CODE=1
  fi
done

# Additional check: Ensure canonical table exists in at least one migration
if ! grep -rq "CREATE TABLE.*withdrawal_audit_logs" "$MIGRATIONS_DIR" 2>/dev/null; then
  echo ""
  echo "⚠️  WARNING: Could not find CREATE TABLE for withdrawal_audit_logs"
  echo "   This may indicate missing migration files"
fi

# Additional check: Ensure critical RPCs are not being dropped
echo ""
echo "🔍 Checking for protected RPC drops..."

PROTECTED_RPCS=(
  "apply_transaction_with_crystallization"
  "crystallize_yield_before_flow"
  "void_transaction"
  "recompute_investor_position"
  "is_admin"
)

for rpc in "${PROTECTED_RPCS[@]}"; do
  if grep -rqE "DROP FUNCTION.*$rpc" "$MIGRATIONS_DIR" 2>/dev/null; then
    echo "❌ ERROR: Migration attempts to DROP protected RPC: $rpc"
    grep -rlE "DROP FUNCTION.*$rpc" "$MIGRATIONS_DIR" | while read -r file; do
      echo "   Found in: $file"
    done
    EXIT_CODE=1
  fi
done

# Check for direct transaction inserts (bypassing canonical RPC)
echo ""
echo "🔍 Checking for direct transaction inserts..."

# This pattern checks for INSERT INTO transactions_v2 that isn't inside a SECURITY DEFINER function context
# We allow them only within the canonical RPC files
BYPASS_FOUND=false
for file in "$MIGRATIONS_DIR"/*.sql; do
  if grep -qE "INSERT INTO transactions_v2" "$file" 2>/dev/null; then
    # Check if it's within the canonical RPC definition
    if ! grep -qE "(apply_transaction_with_crystallization|crystallize_yield_before_flow|admin_create_transaction|complete_withdrawal)" "$file" 2>/dev/null; then
      echo "⚠️  WARNING: Direct INSERT INTO transactions_v2 found outside canonical RPC context"
      echo "   File: $file"
      BYPASS_FOUND=true
    fi
  fi
done

if [ "$BYPASS_FOUND" = true ]; then
  echo "   Note: Direct inserts are blocked by trigger, but should use canonical RPC"
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Migration pattern check passed - no forbidden patterns found"
else
  echo ""
  echo "❌ Migration pattern check FAILED"
  echo "   Please fix the issues above before merging"
fi

exit $EXIT_CODE
