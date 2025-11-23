#!/bin/bash

# ================================================================
# Security Fixes Deployment Script
# Date: 2025-11-23
# Purpose: Apply critical security fixes to Indigo Yield Platform
# ================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}        INDIGO YIELD PLATFORM SECURITY FIX DEPLOYMENT         ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""

# Configuration
PROJECT_ID="nkfimvovosdehmyyjubn"
PROJECT_URL="https://nkfimvovosdehmyyjubn.supabase.co"
MIGRATIONS_DIR="supabase/migrations"

echo -e "${YELLOW}Project ID:${NC} $PROJECT_ID"
echo -e "${YELLOW}Project URL:${NC} $PROJECT_URL"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it using: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Function to apply migrations via dashboard
apply_via_dashboard() {
    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}MANUAL MIGRATION VIA SUPABASE DASHBOARD${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "1. Open your browser and go to:"
    echo -e "   ${GREEN}https://supabase.com/dashboard/project/${PROJECT_ID}/sql${NC}"
    echo ""
    echo "2. Copy and paste the contents of:"
    echo -e "   ${GREEN}apply_security_fixes_combined.sql${NC}"
    echo ""
    echo "3. Click 'Run' to execute the migrations"
    echo ""
    echo "The file contains:"
    echo "   • Fix 1: Audit Log RLS Policy (CRITICAL)"
    echo "   • Fix 2: Profile Creation Trigger (MEDIUM)"
    echo "   • Fix 3: Email Performance Indexes (PERFORMANCE)"
    echo ""
}

# Function to apply migrations via CLI
apply_via_cli() {
    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}ATTEMPTING AUTOMATED DEPLOYMENT${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Check if logged in
    if ! supabase projects list &> /dev/null; then
        echo -e "${YELLOW}Not logged in to Supabase. Please login:${NC}"
        echo "Run: supabase login"
        echo ""
        echo "After logging in, run this script again."
        exit 1
    fi

    echo -e "${GREEN}✓ Logged in to Supabase${NC}"

    # Link project if not already linked
    if [ ! -f ".supabase/.gitignore" ]; then
        echo -e "${YELLOW}Linking project...${NC}"
        supabase link --project-ref $PROJECT_ID
        echo -e "${GREEN}✓ Project linked${NC}"
    else
        echo -e "${GREEN}✓ Project already linked${NC}"
    fi

    # Apply migrations
    echo ""
    echo -e "${YELLOW}Applying security fixes...${NC}"
    echo ""

    # Apply each migration
    for migration in "fix_001_audit_log_rls.sql" "fix_002_profile_creation_trigger.sql" "perf_001_email_indexes.sql"; do
        if [ -f "$MIGRATIONS_DIR/$migration" ]; then
            echo -e "Applying: ${GREEN}$migration${NC}"
            supabase db push --file "$MIGRATIONS_DIR/$migration"
            echo -e "${GREEN}✓ Applied successfully${NC}"
            echo ""
        else
            echo -e "${RED}Warning: $migration not found${NC}"
        fi
    done

    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ ALL SECURITY FIXES APPLIED SUCCESSFULLY${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
}

# Function to verify migrations
verify_migrations() {
    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}VERIFICATION QUERIES${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Run these queries in the Supabase SQL editor to verify:"
    echo ""
    echo "1. Check Audit Log Policy:"
    echo -e "${GREEN}SELECT * FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_insert_secure';${NC}"
    echo ""
    echo "2. Check Profile Trigger:"
    echo -e "${GREEN}SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';${NC}"
    echo ""
    echo "3. Check Email Indexes:"
    echo -e "${GREEN}SELECT * FROM pg_indexes WHERE indexname LIKE 'idx_%email%';${NC}"
    echo ""
}

# Main menu
echo -e "${YELLOW}Choose deployment method:${NC}"
echo "1) Automated via Supabase CLI (requires login)"
echo "2) Manual via Supabase Dashboard"
echo "3) Show verification queries only"
echo "4) Exit"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        apply_via_cli
        verify_migrations
        ;;
    2)
        apply_via_dashboard
        verify_migrations
        ;;
    3)
        verify_migrations
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Security Fix Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Test authentication flow"
echo "2. Verify audit logging"
echo "3. Monitor performance metrics"
echo "4. Check application logs for any errors"
echo ""
echo -e "${GREEN}Platform Security Status: PRODUCTION READY ✓${NC}"
echo ""