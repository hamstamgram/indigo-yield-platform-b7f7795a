#!/bin/bash
# Check for transaction queries missing is_voided filter
# Run this script to detect any new queries that might include voided transactions

echo "Checking for transactions_v2 queries missing is_voided filter..."
echo "=================================================="

# Find all files with transactions_v2 queries that don't have is_voided filter
# Exclude insert, update, delete operations (they don't need the filter)
# Exclude void_transaction RPC calls (intentionally query all)
# Exclude admin void operations that need to see voided records
MATCHES=$(grep -rn "from(\"transactions_v2\")" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "is_voided" | \
  grep -v "\.insert" | \
  grep -v "\.update" | \
  grep -v "\.delete" | \
  grep -v "void_transaction" | \
  grep -v "VoidTransaction" | \
  grep -v "// VOIDED_EXEMPT")

if [ -z "$MATCHES" ]; then
  echo "✅ All transaction queries include is_voided filter!"
  exit 0
else
  echo "⚠️  Found queries that may be missing is_voided filter:"
  echo ""
  echo "$MATCHES"
  echo ""
  echo "Please review these files and add .eq(\"is_voided\", false) where appropriate."
  echo "If the query intentionally needs voided records, add '// VOIDED_EXEMPT' comment."
  exit 1
fi
