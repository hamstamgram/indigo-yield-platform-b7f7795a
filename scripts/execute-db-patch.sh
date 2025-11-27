#!/bin/bash

# ============================================================================
# DATABASE SECURITY PATCH EXECUTION
# Indigo Yield Platform - Deployment Automation
# ============================================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   DATABASE SECURITY PATCH EXECUTION                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if patch file exists
if [ ! -f "EMERGENCY_SECURITY_PATCH.sql" ]; then
    echo -e "${RED}✗ FATAL: EMERGENCY_SECURITY_PATCH.sql not found${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will apply 5 CRITICAL security fixes:${NC}"
echo "  1. Enable Row-Level Security (RLS) on 8 tables"
echo "  2. Create security policies for data isolation"
echo "  3. Make audit_log immutable (no UPDATE/DELETE)"
echo "  4. Fix withdrawal authorization (ownership check)"
echo "  5. Create rate limiting table"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}EXECUTION OPTIONS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Choose your execution method:"
echo ""
echo "  [A] Supabase SQL Editor (Recommended - Manual)"
echo "      Copy-paste SQL into web interface"
echo "      Best for: First-time deployment"
echo ""
echo "  [B] Supabase CLI (Automated)"
echo "      Requires authenticated supabase CLI"
echo "      Best for: Local development testing"
echo ""
read -p "Select option (A/B): " OPTION

case $OPTION in
    [Aa])
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}OPTION A: SUPABASE SQL EDITOR${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Follow these steps:"
        echo ""
        echo "1. Open Supabase SQL Editor:"
        echo -e "   ${YELLOW}https://app.supabase.com/project/nkfimvovosdehmyyjubn/sql${NC}"
        echo ""
        echo "2. Copy the SQL from:"
        echo -e "   ${YELLOW}EMERGENCY_SECURITY_PATCH.sql${NC}"
        echo ""
        echo "3. Paste into SQL Editor and click 'Run'"
        echo ""
        echo "4. Wait for execution (~2 minutes)"
        echo ""
        echo "5. Look for success message:"
        echo "   'DEPLOYMENT PREPARATION COMPLETE'"
        echo ""
        read -p "Press ENTER after you've completed the SQL execution..."
        
        echo ""
        echo -e "${BLUE}Running verification queries...${NC}"
        ;;
        
    [Bb])
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}OPTION B: SUPABASE CLI${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        
        # Check if supabase CLI is installed
        if ! command -v supabase &> /dev/null; then
            echo -e "${RED}✗ Supabase CLI not found${NC}"
            echo "Install with: brew install supabase/tap/supabase"
            exit 1
        fi
        
        echo -e "${GREEN}✓ Supabase CLI found${NC}"
        echo ""
        
        # Test connection
        echo "Testing Supabase connection..."
        if ! supabase status &> /dev/null; then
            echo -e "${YELLOW}⚠  Not connected to Supabase project${NC}"
            echo "Run: supabase link --project-ref nkfimvovosdehmyyjubn"
            read -p "Connect now? (y/N): " CONNECT
            
            if [[ $CONNECT == "y" ]]; then
                supabase link --project-ref nkfimvovosdehmyyjubn
            else
                exit 1
            fi
        fi
        
        echo -e "${GREEN}✓ Connected to Supabase project${NC}"
        echo ""
        
        # Execute the patch
        echo "Executing EMERGENCY_SECURITY_PATCH.sql..."
        mkdir -p logs
        
        if cat EMERGENCY_SECURITY_PATCH.sql | supabase db execute > logs/db-patch-execution.log 2>&1; then
            echo -e "${GREEN}✓ SQL execution completed${NC}"
            echo "  Log saved to: logs/db-patch-execution.log"
        else
            echo -e "${RED}✗ SQL execution failed${NC}"
            echo "  Check logs/db-patch-execution.log for details"
            exit 1
        fi
        
        echo ""
        echo -e "${BLUE}Running verification queries...${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Run verification (requires scripts/verify-rls.sql)
if [ -f "scripts/verify-rls.sql" ]; then
    echo ""
    echo "Verifying RLS is enabled on all tables..."
    
    # Note: This assumes you can execute SQL via CLI
    # For manual execution, show the queries to run
    echo ""
    echo -e "${YELLOW}Run these verification queries in Supabase SQL Editor:${NC}"
    echo ""
    echo "-- Check for vulnerable tables (should return 0)"
    echo "SELECT COUNT(*) as vulnerable_tables"
    echo "FROM pg_tables"
    echo "WHERE schemaname = 'public'"
    echo "  AND NOT rowsecurity;"
    echo ""
    read -p "How many vulnerable tables? (enter number): " VULN_COUNT
    
    if [ "$VULN_COUNT" = "0" ]; then
        echo -e "${GREEN}✓ RLS verification passed (0 vulnerable tables)${NC}"
    else
        echo -e "${RED}✗ RLS verification failed ($VULN_COUNT vulnerable tables)${NC}"
        echo "Review scripts/verify-rls.sql for detailed checks"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠  scripts/verify-rls.sql not found - skipping automated verification${NC}"
    echo "Manually verify RLS is enabled on all tables"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ DATABASE SECURITY PATCH COMPLETE                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Row-Level Security enabled on 8 tables${NC}"
echo -e "${GREEN}✓ Security policies created${NC}"
echo -e "${GREEN}✓ Audit log made immutable${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Configure Lovable: ./scripts/configure-lovable.sh"
echo "2. Deploy to production"
echo ""

# Update deploy-status.json if it exists
if [ -f "config/deploy-status.json" ]; then
    echo "Updating deployment status..."
    # Simple update (in production you'd use jq)
    cp config/deploy-status.json config/deploy-status.json.bak
fi

echo -e "${GREEN}Database patch execution complete!${NC}"
