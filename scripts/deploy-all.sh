#!/bin/bash

# Indigo Yield Platform - Complete Deployment Script
# Date: 2025-09-03
# This script guides you through the complete deployment process

echo "========================================="
echo "🚀 Indigo Yield Platform Deployment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
    echo "Run: brew install supabase/tap/supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Step 2: Database Migrations
echo -e "${YELLOW}Step 2: Database Migrations${NC}"
echo "Please apply these migrations in your Supabase SQL Editor:"
echo ""
echo "1. CRITICAL - Fix RLS recursion (apply FIRST):"
echo "   supabase/migrations/009_fix_profiles_rls_recursion.sql"
echo ""
echo "2. Excel backend support:"
echo "   supabase/migrations/003_excel_backend.sql"
echo ""
echo "3. Withdrawals system:"
echo "   supabase/migrations/004_withdrawals.sql"
echo ""
echo "4. Fund classes:"
echo "   supabase/migrations/005_excel_classes.sql"
echo ""
echo "5. Cutover guards:"
echo "   supabase/migrations/006_cutover_guards.sql"
echo ""
read -p "Press Enter after applying all migrations..."

# Step 3: Deploy Edge Functions
echo -e "${YELLOW}Step 3: Deploying Edge Functions${NC}"

echo "Deploying excel_import..."
supabase functions deploy excel_import

echo "Deploying parity_check..."
supabase functions deploy parity_check

echo "Deploying status..."
supabase functions deploy status

echo "Deploying excel_export..."
supabase functions deploy excel_export

echo "Deploying verify_recaptcha..."
supabase functions deploy verify_recaptcha

echo -e "${GREEN}✅ Edge functions deployed${NC}"
echo ""

# Step 4: Environment Variables
echo -e "${YELLOW}Step 4: Environment Variables${NC}"
echo "Add these to your .env.local:"
echo ""
echo "PROJECT_REF=nkfimvovosdehmyyjubn"
echo "EXCEL_IMPORT_ENABLED=true"
echo "EDIT_WINDOW_DAYS=7"
echo ""
read -p "Press Enter after setting environment variables..."

# Step 5: Build and Test
echo -e "${YELLOW}Step 5: Building application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed. Please fix errors and try again.${NC}"
    exit 1
fi

# Step 6: Service Health Check
echo -e "${YELLOW}Step 6: Checking service health...${NC}"
npm run check:services

# Step 7: Deployment
echo -e "${YELLOW}Step 7: Deployment${NC}"
echo "Build complete. Push to main branch and Lovable will auto-deploy."
echo "Production URL: https://indigo-yield-platform.lovable.app/"

echo ""
echo "========================================="
echo -e "${GREEN}🎉 Deployment Process Complete!${NC}"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Navigate to /admin/excel-first-run"
echo "2. Upload ops/import/first_run.xlsx"
echo "3. Run dry-run, then actual import"
echo "4. Verify parity check passes"
echo "5. Lock imports when complete"
echo ""
echo "Monitor at:"
echo "- Service health: /status"
echo "- Admin dashboard: /admin"
echo "- Withdrawals: /admin/withdrawals"
