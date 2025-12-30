#!/bin/bash
# Codebase Quality Guardrails
# Run this script to detect common issues in transaction queries

echo "=============================================="
echo "CODEBASE QUALITY CHECK"
echo "=============================================="
echo ""

ISSUES_FOUND=0

# === Check 1: transactions_v2 queries missing is_voided filter ===
echo "1. Checking transactions_v2 queries for is_voided filter..."

VOIDED_MATCHES=$(grep -rn "from(\"transactions_v2\")" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "is_voided" | \
  grep -v "\.insert" | \
  grep -v "\.update" | \
  grep -v "\.delete" | \
  grep -v "void_transaction" | \
  grep -v "VoidTransaction" | \
  grep -v "// VOIDED_EXEMPT")

if [ -z "$VOIDED_MATCHES" ]; then
  echo "   ✅ All transaction queries include is_voided filter"
else
  echo "   ⚠️  Found queries missing is_voided filter:"
  echo "$VOIDED_MATCHES" | sed 's/^/      /'
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# === Check 2: Risky .single() on SELECT queries ===
echo "2. Checking for risky .single() calls on SELECT queries..."

SINGLE_MATCHES=$(grep -rn "\.single()" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "\.insert" | \
  grep -v "\.update" | \
  grep -v "\.upsert" | \
  grep -v "// SINGLE_SAFE" | \
  grep -v "node_modules" | \
  grep -v ".test.ts")

if [ -z "$SINGLE_MATCHES" ]; then
  echo "   ✅ No risky .single() calls found"
else
  echo "   ℹ️  Found .single() calls (review for safety):"
  echo "$SINGLE_MATCHES" | head -10 | sed 's/^/      /'
  SINGLE_COUNT=$(echo "$SINGLE_MATCHES" | wc -l)
  if [ "$SINGLE_COUNT" -gt 10 ]; then
    echo "      ... and $((SINGLE_COUNT - 10)) more"
  fi
fi
echo ""

# === Check 3: References to deprecated tables ===
echo "3. Checking for deprecated table references..."

DEPRECATED_MATCHES=$(grep -rn "from(\"investor_transactions\")\|from(\"deposits\")" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "// DEPRECATED_OK")

if [ -z "$DEPRECATED_MATCHES" ]; then
  echo "   ✅ No deprecated table references found"
else
  echo "   ⚠️  Found deprecated table references:"
  echo "$DEPRECATED_MATCHES" | sed 's/^/      /'
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# === Summary ===
echo "=============================================="
if [ "$ISSUES_FOUND" -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "⚠️  Found $ISSUES_FOUND issue(s) requiring attention"
  echo ""
  echo "Fix hints:"
  echo "  - Add .eq(\"is_voided\", false) to transaction queries"
  echo "  - Use .maybeSingle() instead of .single() for SELECT"
  echo "  - Use transactions_v2 instead of deprecated tables"
  exit 1
fi
