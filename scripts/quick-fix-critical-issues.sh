#!/bin/bash
# ==============================================================================
# Quick Fix Script for Critical Database Issues
# Date: 2025-12-08
# Purpose: Apply critical fixes identified in database audit
# ==============================================================================

set -e  # Exit on error

echo "======================================================================"
echo "INDIGO YIELD PLATFORM - CRITICAL DATABASE FIXES"
echo "======================================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "supabase/migrations/20251208_post_audit_fixes.sql" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Check for supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Warning: Supabase CLI not found. Will provide manual instructions.${NC}"
    MANUAL_MODE=1
else
    MANUAL_MODE=0
fi

echo "Step 1: Checking migration status..."
if [ $MANUAL_MODE -eq 0 ]; then
    supabase migration list
else
    echo -e "${YELLOW}Manual: Run 'supabase migration list' to check status${NC}"
fi
echo ""

echo "Step 2: Applying post-audit fixes..."
echo "This will:"
echo "  - Fix onboarding_submissions FK constraint"
echo "  - Update broken RLS policies"
echo "  - Update v_live_investor_balances view"
echo "  - Add performance indexes"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

if [ $MANUAL_MODE -eq 0 ]; then
    echo "Applying migration..."
    supabase db push
    echo -e "${GREEN}✓ Migration applied${NC}"
else
    echo -e "${YELLOW}Manual: Run the following command:${NC}"
    echo "  supabase db push"
    echo ""
    echo "Or connect to your database and run:"
    echo "  psql -f supabase/migrations/20251208_post_audit_fixes.sql"
fi
echo ""

echo "Step 3: Running health check..."
if [ $MANUAL_MODE -eq 0 ]; then
    echo "Connecting to database..."
    supabase db execute -f scripts/verify-database-health.sql
else
    echo -e "${YELLOW}Manual: Run the following command:${NC}"
    echo "  psql -f scripts/verify-database-health.sql"
fi
echo ""

echo "Step 4: Checking for TypeScript code issues..."
echo "Searching for broken queries..."

# Search for potential broken queries
BROKEN_QUERIES=$(grep -r "from('investors')" src/ 2>/dev/null | wc -l | tr -d ' ')
BROKEN_JOINS=$(grep -r "\.investors(" src/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$BROKEN_QUERIES" -gt 0 ] || [ "$BROKEN_JOINS" -gt 0 ]; then
    echo -e "${RED}✗ Found potential issues in TypeScript code:${NC}"
    echo "  - $BROKEN_QUERIES queries using from('investors')"
    echo "  - $BROKEN_JOINS joins using .investors(...)"
    echo ""
    echo "To fix, replace:"
    echo "  from('investors') → from('profiles')"
    echo "  .select('*, investors(...)') → .select('*, profiles!investor_id(...)')"
    echo ""
    echo "Run this to see details:"
    echo "  grep -r \"from('investors')\" src/"
    echo "  grep -r \"\\.investors(\" src/"
else
    echo -e "${GREEN}✓ No obvious broken queries found${NC}"
fi
echo ""

echo "======================================================================"
echo "CRITICAL FIXES APPLIED"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. Review health check output above"
echo "2. Fix any TypeScript code issues identified"
echo "3. Run full test suite: npm test"
echo "4. Deploy to staging for verification"
echo ""
echo "Documentation:"
echo "  - Full audit: DATABASE_AUDIT_REPORT.md"
echo "  - Summary: DATABASE_AUDIT_SUMMARY.md"
echo "  - Migration guide: docs/V2_MIGRATION_GUIDE.md"
echo ""
echo "Health check can be re-run with:"
echo "  psql -f scripts/verify-database-health.sql"
echo ""
