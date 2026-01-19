#!/bin/bash
# ============================================================================
# Full Platform Audit Script
# ============================================================================
# Purpose: Run comprehensive audit of the platform
# Runs: migrations check, smoke tests, integrity views, admin gate checks
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  Full Platform Audit"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

FAILURES=0

# Helper function
run_check() {
  local name="$1"
  local command="$2"

  echo "=== $name ==="
  if eval "$command"; then
    echo -e "${GREEN}✅ $name passed${NC}"
  else
    echo -e "${RED}❌ $name failed${NC}"
    ((FAILURES++))
  fi
  echo ""
}

# 1. Migration pattern check
run_check "Step 1: Migration Pattern Check" "$SCRIPT_DIR/check-migrations.sh"

# 2. Check voided transaction filters
if [ -f "$SCRIPT_DIR/check-voided-filters.sh" ]; then
  run_check "Step 2: Voided Filter Check" "$SCRIPT_DIR/check-voided-filters.sh"
else
  echo "=== Step 2: Voided Filter Check ==="
  echo -e "${YELLOW}⚠️  check-voided-filters.sh not found, skipping${NC}"
  echo ""
fi

# 3. DB Smoke Test (if DATABASE_URL is set or local Supabase is running)
echo "=== Step 3: Database Smoke Test ==="
if [ -n "$DATABASE_URL" ]; then
  if $SCRIPT_DIR/db-smoke-test.sh; then
    echo -e "${GREEN}✅ Database smoke test passed${NC}"
  else
    echo -e "${RED}❌ Database smoke test failed${NC}"
    ((FAILURES++))
  fi
else
  echo -e "${YELLOW}⚠️  DATABASE_URL not set, checking for local Supabase...${NC}"
  if command -v npx &> /dev/null && npx supabase status 2>/dev/null | grep -q "running"; then
    if $SCRIPT_DIR/db-smoke-test.sh; then
      echo -e "${GREEN}✅ Database smoke test passed (local)${NC}"
    else
      echo -e "${RED}❌ Database smoke test failed${NC}"
      ((FAILURES++))
    fi
  else
    echo -e "${YELLOW}⚠️  No database available, skipping smoke test${NC}"
  fi
fi
echo ""

# 4. TypeScript/JavaScript code checks
echo "=== Step 4: Frontend Code Pattern Check ==="
FRONTEND_ISSUES=0

# Check for select('id') on composite PK tables
if grep -rE "\.from\(['\"]investor_positions['\"\)].*\.select\(['\"]id['\"]" src/ 2>/dev/null; then
  echo -e "${RED}❌ Found select('id') on investor_positions (composite PK table)${NC}"
  ((FRONTEND_ISSUES++))
fi

# Check for direct transaction mutations (should use RPC)
if grep -rE "\.insert\(\).*transactions_v2|\.from\(['\"]transactions_v2['\"\)].*\.insert" src/ 2>/dev/null; then
  echo -e "${RED}❌ Found direct INSERT on transactions_v2 (should use RPC)${NC}"
  ((FRONTEND_ISSUES++))
fi

# Check for hardcoded credentials
if grep -rE "(password|secret|apikey).*=.*['\"][^'\"]{8,}['\"]" src/ 2>/dev/null | grep -v "test\|mock\|example"; then
  echo -e "${RED}❌ Potential hardcoded credentials found${NC}"
  ((FRONTEND_ISSUES++))
fi

if [ $FRONTEND_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend code pattern check passed${NC}"
else
  echo -e "${RED}❌ Frontend code pattern check failed with $FRONTEND_ISSUES issues${NC}"
  ((FAILURES++))
fi
echo ""

# 5. Check for required integrity views in codebase
echo "=== Step 5: Integrity View Coverage Check ==="
REQUIRED_VIEWS=(
  "v_crystallization_gaps"
  "v_ledger_reconciliation"
  "v_yield_conservation"
  "v_missing_withdrawal_transactions"
  "v_potential_duplicate_profiles"
)

VIEW_ISSUES=0
for view in "${REQUIRED_VIEWS[@]}"; do
  if ! grep -rq "$view" supabase/migrations/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  View $view not found in migrations${NC}"
    ((VIEW_ISSUES++))
  fi
done

if [ $VIEW_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ All required integrity views present${NC}"
else
  echo -e "${YELLOW}⚠️  Some integrity views may be missing${NC}"
fi
echo ""

# 6. Check for required RPCs
echo "=== Step 6: Required RPC Check ==="
REQUIRED_RPCS=(
  "apply_transaction_with_crystallization"
  "crystallize_yield_before_flow"
  "void_transaction"
  "recompute_investor_position"
  "is_admin"
)

RPC_ISSUES=0
for rpc in "${REQUIRED_RPCS[@]}"; do
  if ! grep -rq "CREATE.*FUNCTION.*$rpc" supabase/migrations/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  RPC $rpc not found in migrations${NC}"
    ((RPC_ISSUES++))
  fi
done

if [ $RPC_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ All required RPCs present${NC}"
else
  echo -e "${YELLOW}⚠️  Some required RPCs may be missing${NC}"
fi
echo ""

# 7. RPC Signature Alignment Check
echo "=== Step 7: RPC Signature Check ==="
if [ -f "$SCRIPT_DIR/pre-deploy-rpc-check.sh" ]; then
  if $SCRIPT_DIR/pre-deploy-rpc-check.sh; then
    echo -e "${GREEN}✅ RPC signature check passed${NC}"
  else
    echo -e "${RED}❌ RPC signature check failed${NC}"
    ((FAILURES++))
  fi
else
  echo -e "${YELLOW}⚠️  pre-deploy-rpc-check.sh not found, skipping${NC}"
fi
echo ""

# Summary
echo "=============================================="
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}  ✅ Full audit PASSED${NC}"
  echo "=============================================="
  exit 0
else
  echo -e "${RED}  ❌ Full audit FAILED ($FAILURES failures)${NC}"
  echo "=============================================="
  exit 1
fi
