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

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Migration pattern check passed - no forbidden patterns found"
else
  echo ""
  echo "❌ Migration pattern check FAILED"
  echo "   Please fix the issues above before merging"
fi

exit $EXIT_CODE
