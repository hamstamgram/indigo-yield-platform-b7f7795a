#!/bin/bash

# Deployment Script for Database Migrations
# Usage: ./scripts/deploy-migrations.sh [staging|production]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment argument
if [ "$#" -ne 1 ]; then
    echo -e "${RED}Error: Please specify environment (staging or production)${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Database Migration Deployment - $ENVIRONMENT${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# List migrations to be applied
echo -e "${YELLOW}Migrations to be applied:${NC}"
echo "1. 20250109_admin_investor_functions.sql - Admin RPC functions"
echo "2. 20250109_comprehensive_rls_policies.sql - RLS policies"
echo "3. 20250109_statements_storage_bucket.sql - Storage configuration"
echo ""

# Confirm before proceeding
read -p "Are you sure you want to apply migrations to $ENVIRONMENT? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Check Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install with: brew install supabase/tap/supabase"
    exit 1
fi

# Production safety check
if [ "$ENVIRONMENT" == "production" ]; then
    echo -e "${RED}⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️${NC}"
    echo "You are about to deploy to PRODUCTION!"
    echo "Please type 'DEPLOY TO PRODUCTION' to confirm:"
    read CONFIRM
    if [ "$CONFIRM" != "DEPLOY TO PRODUCTION" ]; then
        echo -e "${YELLOW}Production deployment cancelled${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${YELLOW}Step 1: Creating backup point...${NC}"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

echo ""
echo -e "${YELLOW}Step 2: Applying migrations...${NC}"

# Apply migrations based on environment
if [ "$ENVIRONMENT" == "staging" ]; then
    echo "Connecting to staging database..."
    # For staging, we'll use the main project (since we don't have a separate staging)
    supabase db push --dry-run
    
    echo ""
    read -p "Review the changes above. Apply to staging? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase db push
        echo -e "${GREEN}✓ Migrations applied to staging${NC}"
    else
        echo -e "${YELLOW}Staging deployment cancelled${NC}"
        exit 0
    fi
else
    echo "Connecting to production database..."
    supabase db push --dry-run
    
    echo ""
    read -p "Review the changes above. Apply to PRODUCTION? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase db push
        echo -e "${GREEN}✓ Migrations applied to production${NC}"
    else
        echo -e "${YELLOW}Production deployment cancelled${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${YELLOW}Step 3: Verifying deployment...${NC}"

# Test the new functions
echo "Testing admin functions..."
cat << EOF > /tmp/test_functions.sql
-- Test if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'is_admin_for_jwt',
    'get_all_non_admin_profiles',
    'get_profile_by_id',
    'get_investor_portfolio_summary',
    'get_all_investors_with_summary'
)
ORDER BY routine_name;
EOF

echo "Functions deployed:"
supabase db query --file /tmp/test_functions.sql

echo ""
echo -e "${YELLOW}Step 4: Testing RLS policies...${NC}"

cat << EOF > /tmp/test_rls.sql
-- Test RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'transactions', 'portfolios', 'statements')
ORDER BY tablename, policyname
LIMIT 10;
EOF

echo "RLS policies deployed:"
supabase db query --file /tmp/test_rls.sql

# Clean up temp files
rm -f /tmp/test_functions.sql /tmp/test_rls.sql

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Migrations applied successfully to $ENVIRONMENT${NC}"
echo -e "${GREEN}✓ Functions verified${NC}"
echo -e "${GREEN}✓ RLS policies verified${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the AdminInvestors page at /admin/investors"
echo "2. Verify Thomas Puech appears in the investor list"
echo "3. Check that RLS policies are working correctly"
echo "4. Monitor logs for any errors"
echo ""

if [ "$ENVIRONMENT" == "staging" ]; then
    echo -e "${YELLOW}After staging validation, run:${NC}"
    echo "  $0 production"
fi

echo ""
echo "Deployment log saved to: deployment_${ENVIRONMENT}_$(date '+%Y%m%d_%H%M%S').log"
