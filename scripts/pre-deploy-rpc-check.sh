#!/bin/bash
# ============================================================================
# Pre-Deploy RPC Signature Check
# ============================================================================
# Purpose: Quick CI-ready check for RPC signature alignment
# Runs before deployment to catch signature mismatches early
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "  Pre-Deploy RPC Signature Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

FAILURES=0

# Check for common signature errors in service files

echo "=== Checking void_transaction signature ==="
# Correct: p_transaction_id, p_admin_id, p_reason
# Wrong: p_void_reason, wrong order
if grep -rn "void_transaction" "$PROJECT_DIR/src/services/" 2>/dev/null | grep -E "p_void_reason|p_reason.*p_admin_id[^,]*\}" | grep -v "// "; then
  echo -e "${RED}❌ Found potential void_transaction signature issue${NC}"
  ((FAILURES++))
else
  echo -e "${GREEN}✅ void_transaction signatures look correct${NC}"
fi
echo ""

echo "=== Checking void_yield_distribution signature ==="
# Correct: p_distribution_id, p_admin_id, p_reason
if grep -rn "void_yield_distribution" "$PROJECT_DIR/src/services/" 2>/dev/null | grep -E "p_reason.*p_admin_id[^,]*\}" | grep -v "// "; then
  echo -e "${RED}❌ Found potential void_yield_distribution signature issue${NC}"
  ((FAILURES++))
else
  echo -e "${GREEN}✅ void_yield_distribution signatures look correct${NC}"
fi
echo ""

echo "=== Checking deposit RPC signature ==="
# Correct params: p_closing_aum, p_effective_date
# Wrong params: p_new_total_aum, p_tx_date
if grep -rn "apply_deposit_with_crystallization" "$PROJECT_DIR/src/services/" 2>/dev/null | grep -E "p_new_total_aum|p_tx_date" | grep -v "// "; then
  echo -e "${RED}❌ Found wrong parameter names in deposit RPC (should use p_closing_aum, p_effective_date)${NC}"
  ((FAILURES++))
else
  echo -e "${GREEN}✅ apply_deposit_with_crystallization signatures look correct${NC}"
fi
echo ""

echo "=== Checking withdrawal RPC signature ==="
# Correct params: p_new_total_aum, p_tx_date (opposite of deposit!)
if grep -rn "apply_withdrawal_with_crystallization" "$PROJECT_DIR/src/services/" 2>/dev/null | grep -E "p_closing_aum|p_effective_date" | grep -v "// "; then
  echo -e "${RED}❌ Found wrong parameter names in withdrawal RPC (should use p_new_total_aum, p_tx_date)${NC}"
  ((FAILURES++))
else
  echo -e "${GREEN}✅ apply_withdrawal_with_crystallization signatures look correct${NC}"
fi
echo ""

echo "=== Checking for 'as any' RPC type bypasses ==="
# Flag any RPC calls that use 'as any' to bypass type checking
BYPASSES=$(grep -rn "rpc\.call\|callRPC" "$PROJECT_DIR/src/services/" 2>/dev/null | grep "as any" | wc -l)
if [ "$BYPASSES" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $BYPASSES RPC calls using 'as any' type bypass${NC}"
  grep -rn "rpc\.call\|callRPC" "$PROJECT_DIR/src/services/" 2>/dev/null | grep "as any" | head -5
else
  echo -e "${GREEN}✅ No 'as any' type bypasses in RPC calls${NC}"
fi
echo ""

# Summary
echo "=============================================="
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}  ✅ Pre-deploy RPC check PASSED${NC}"
  echo "=============================================="
  exit 0
else
  echo -e "${RED}  ❌ Pre-deploy RPC check FAILED ($FAILURES issues)${NC}"
  echo "=============================================="
  exit 1
fi
