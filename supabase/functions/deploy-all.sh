#!/bin/bash

# Deploy All Edge Functions Script
# This script deploys all Supabase Edge Functions for the Indigo Yield Platform

set -e  # Exit on error

echo "🚀 Deploying Indigo Yield Platform Edge Functions..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to deploy with error handling
deploy_function() {
  local func_name=$1
  echo -e "${BLUE}📦 Deploying ${func_name}...${NC}"

  if supabase functions deploy "$func_name"; then
    echo -e "${GREEN}✅ ${func_name} deployed successfully${NC}"
    echo ""
  else
    echo -e "${RED}❌ Failed to deploy ${func_name}${NC}"
    echo ""
    return 1
  fi
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
echo "🔐 Checking authentication..."
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with Supabase${NC}"
    echo "Run: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Verify linked project
echo "🔗 Verifying project link..."
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${RED}❌ Project not linked${NC}"
    echo "Run: supabase link --project-ref your-project-ref"
    exit 1
fi

echo -e "${GREEN}✅ Project linked${NC}"
echo ""

# Deploy Priority 1: Core Functions
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Priority 1: Core Functions${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

deploy_function "generate-report"

# Deploy Priority 2: Transaction Functions
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Priority 2: Transaction Functions${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

deploy_function "process-deposit"
deploy_function "process-withdrawal"

# Deploy Priority 3: Analytics Functions
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Priority 3: Analytics Functions${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

deploy_function "calculate-performance"
deploy_function "generate-tax-documents"

# Deploy Priority 4: Compliance Functions
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Priority 4: Compliance Functions${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

deploy_function "run-compliance-checks"

# Deploy Priority 5: Integration Functions
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Priority 5: Integration Functions${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

deploy_function "process-webhooks"

# Deploy Existing Functions (if needed)
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Existing Functions (Optional)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

echo "Do you want to redeploy existing functions? (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  deploy_function "send-email"
  deploy_function "calculate-yield"
  deploy_function "update-prices"
  deploy_function "get-crypto-prices"
  # Add more existing functions as needed
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete! ✨${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

# List all functions
echo "📋 Listing all deployed functions:"
echo ""
supabase functions list

echo ""
echo "🎉 All functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Set environment variables: supabase secrets set VARIABLE_NAME=value"
echo "2. Configure webhook endpoints in third-party services"
echo "3. Test functions using the provided examples"
echo "4. Monitor logs: supabase functions logs <function-name>"
echo ""
echo "For detailed documentation, see: supabase/functions/DEPLOYMENT_GUIDE.md"
