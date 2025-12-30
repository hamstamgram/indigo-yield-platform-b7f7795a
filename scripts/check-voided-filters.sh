#!/bin/bash
# Check for transaction queries missing is_voided filter
# Run this script to detect any new queries that might include voided transactions

echo "Checking for transactions_v2 queries missing is_voided filter..."
echo "=================================================="

# Find all files with transactions_v2 queries that don't have is_voided filter
# Exclude insert and update operations (they don't need the filter)
MATCHES=$(grep -rn "from(\"transactions_v2\")" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "is_voided" | \
  grep -v "\.insert" | \
  grep -v "\.update" | \
  grep -v "\.delete")

if [ -z "$MATCHES" ]; then
  echo "✅ All transaction queries include is_voided filter!"
  exit 0
else
  echo "⚠️  Found queries that may be missing is_voided filter:"
  echo ""
  echo "$MATCHES"
  echo ""
  echo "Please review these files and add .eq(\"is_voided\", false) where appropriate."
  exit 1
fi
