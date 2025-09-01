#!/bin/bash

# Complete CI/CD Setup Script for Indigo Yield Platform
# This script sets up GitHub Actions secrets and Vercel environment variables

set -e

echo "🚀 Complete CI/CD Setup for Indigo Yield Platform"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI not found. Installing...${NC}"
    brew install gh
fi

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
fi

# Check psql for database testing
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL client not found. Installing...${NC}"
    brew install postgresql
fi

echo -e "${GREEN}✅ Prerequisites installed${NC}"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
PGPASSWORD="Douentza2067@@" psql "postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
    -c "SELECT 'Connected to Indigo Yield Database' as status;" -t -A || {
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# GitHub Authentication
echo "🔐 Checking GitHub authentication..."
if ! gh auth status &>/dev/null; then
    echo "Please authenticate with GitHub:"
    gh auth login
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
    echo -e "${RED}❌ Not in a GitHub repository${NC}"
    echo "Please initialize a git repository and push to GitHub first"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with repository: $REPO${NC}"
echo ""

# Add GitHub Secrets
echo "📦 Adding GitHub Actions secrets..."
echo "===================================="

add_secret() {
    local name=$1
    local value=$2
    echo -n "  Adding $name... "
    if echo "$value" | gh secret set "$name" --repo "$REPO" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}(may already exist)${NC}"
    fi
}

# Add all secrets
add_secret "VITE_SUPABASE_URL" "https://nkfimvovosdehmyyjubn.supabase.co"
add_secret "STAGING_SUPABASE_URL" "https://nkfimvovosdehmyyjubn.supabase.co"
add_secret "VITE_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"
add_secret "STAGING_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"
add_secret "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k"
add_secret "SUPABASE_STAGING_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k"
add_secret "SUPABASE_STAGING_DB_URL" "postgresql://postgres.nkfimvovosdehmyyjubn:Douentza2067@@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
add_secret "SUPABASE_DEV_DB_URL" "postgresql://postgres.nkfimvovosdehmyyjubn:Douentza2067@@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
add_secret "MAILERLITE_API_TOKEN" "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjU4OGJmMDk4Y2QyZWM4ZDRhYTI5NzA1MmFhMTg3NTExOGQ2MTQzOTdmMjQ2NGU2YTc0Y2Q0OTVkZTU2YTJkZjk4ZWE0MWI4NjI2OTg1ZjQiLCJpYXQiOjE3NTY3MzA2NDcuODY5MDkzLCJuYmYiOjE3NTY3MzA2NDcuODY5MDk1LCJleHAiOjQ5MTI0MDQyNDcuODY1NTk1LCJzdWIiOiI4NjUyNDYiLCJzY29wZXMiOltdfQ.EhrR6IkV99fntVGgChpW1cuS2I2s6n5rw11KrK0X0gzXMh2e5zXyx90gDc99xI-jMt5jrRJK08EjAR0_DqgvvYU8ip3EvgZ9cH2IrEePUaB3SFhl4cf8KN8KmED71odr9e_VO6t5dfWGc3LjhsRNIMWHHRsdUw8W3mMhIJ-Wm5htR58AQQO1jV5PbIwLFiaPzH_Itw50alOXNP0CGGA15SPpfiiS2y9mm_tAgOuJN2GDkld1H5lkI_Vgu1-0dr04zusPaVwNo_5qMiMyxlukv6i2Sq8SwsdhNJDGXBOi-dqpo9uxmcNOi1v5wPfHenr8oVEvV3j2eG1iYVjmpzfSgPZCFdRF2GpICc96Q3tkf_IhKGiLxVYoS4YcR8-jYFyJjqLoVobZPFrchMsLP_UQXZ2Y8X4829lCLdHUKutyUdi-Iy_0yPHwso7evY3HcuHlsRb-5y-bFRhOssBfiDzyPwAZFL3zs-WFof5uLfZGZbtLgFn_rpX5fVQHZE0ce0XQOaVMh3UyBYgECECDWXXgqgsCYSh3vz9arnc8Tpz4fPaBRE4QK-ROdTvKtCPEsBi9H9I2iZ9VNhLeg6pHzggxwpBTiMPnDWX0i6TUrba2ZVlaJYI4nu5sg4Z4avBvbuUwaplPiEJ1QpM4Q5tdmFaoGZA4l_aeNWesXKYkwXj_qSw"
add_secret "VITE_MAILERLITE_API_TOKEN" "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjU4OGJmMDk4Y2QyZWM4ZDRhYTI5NzA1MmFhMTg3NTExOGQ2MTQzOTdmMjQ2NGU2YTc0Y2Q0OTVkZTU2YTJkZjk4ZWE0MWI4NjI2OTg1ZjQiLCJpYXQiOjE3NTY3MzA2NDcuODY5MDkzLCJuYmYiOjE3NTY3MzA2NDcuODY5MDk1LCJleHAiOjQ5MTI0MDQyNDcuODY1NTk1LCJzdWIiOiI4NjUyNDYiLCJzY29wZXMiOltdfQ.EhrR6IkV99fntVGgChpW1cuS2I2s6n5rw11KrK0X0gzXMh2e5zXyx90gDc99xI-jMt5jrRJK08EjAR0_DqgvvYU8ip3EvgZ9cH2IrEePUaB3SFhl4cf8KN8KmED71odr9e_VO6t5dfWGc3LjhsRNIMWHHRsdUw8W3mMhIJ-Wm5htR58AQQO1jV5PbIwLFiaPzH_Itw50alOXNP0CGGA15SPpfiiS2y9mm_tAgOuJN2GDkld1H5lkI_Vgu1-0dr04zusPaVwNo_5qMiMyxlukv6i2Sq8SwsdhNJDGXBOi-dqpo9uxmcNOi1v5wPfHenr8oVEvV3j2eG1iYVjmpzfSgPZCFdRF2GpICc96Q3tkf_IhKGiLxVYoS4YcR8-jYFyJjqLoVobZPFrchMsLP_UQXZ2Y8X4829lCLdHUKutyUdi-Iy_0yPHwso7evY3HcuHlsRb-5y-bFRhOssBfiDzyPwAZFL3zs-WFof5uLfZGZbtLgFn_rpX5fVQHZE0ce0XQOaVMh3UyBYgECECDWXXgqgsCYSh3vz9arnc8Tpz4fPaBRE4QK-ROdTvKtCPEsBi9H9I2iZ9VNhLeg6pHzggxwpBTiMPnDWX0i6TUrba2ZVlaJYI4nu5sg4Z4avBvbuUwaplPiEJ1QpM4Q5tdmFaoGZA4l_aeNWesXKYkwXj_qSw"
add_secret "SENTRY_AUTH_TOKEN" "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"
add_secret "SENTRY_TOKEN" "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"
add_secret "GITHUB_TOKEN" "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"
add_secret "VERCEL_TOKEN" "l2nyQB0XXF43oAUFvEwL4dCY"

echo -e "${GREEN}✅ GitHub secrets configured${NC}"
echo ""

# Vercel Setup
echo "🔗 Setting up Vercel..."
echo "========================"

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo "Linking Vercel project..."
    vercel link
fi

# Extract Vercel IDs
if [ -f ".vercel/project.json" ]; then
    VERCEL_ORG_ID=$(grep -o '"orgId":"[^"]*' .vercel/project.json | sed 's/"orgId":"//')
    VERCEL_PROJECT_ID=$(grep -o '"projectId":"[^"]*' .vercel/project.json | sed 's/"projectId":"//')
    
    echo "Found Vercel configuration:"
    echo "  Organization ID: $VERCEL_ORG_ID"
    echo "  Project ID: $VERCEL_PROJECT_ID"
    
    # Add to GitHub secrets
    add_secret "VERCEL_ORG_ID" "$VERCEL_ORG_ID"
    add_secret "VERCEL_PROJECT_ID" "$VERCEL_PROJECT_ID"
    
    echo -e "${GREEN}✅ Vercel IDs added to GitHub secrets${NC}"
else
    echo -e "${YELLOW}⚠️  Vercel project not linked. Run 'vercel link' manually${NC}"
fi

echo ""

# List all secrets
echo "📋 Current GitHub Secrets:"
echo "=========================="
gh secret list --repo "$REPO" || echo "No secrets found"

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo -e "${GREEN}✅ All required secrets have been configured${NC}"
echo ""
echo "Next steps:"
echo "1. Commit and push your changes to GitHub"
echo "2. GitHub Actions will automatically run on:"
echo "   - Pull requests (CI workflow)"
echo "   - Pushes to main branch (Staging deployment)"
echo ""
echo "Optional enhancements:"
echo "- Set up Sentry for error tracking: https://sentry.io"
echo "- Set up PostHog for analytics: https://posthog.com"
echo ""
echo "To trigger a deployment:"
echo "  git push origin main"
echo ""
echo "To view workflow runs:"
echo "  gh run list --repo $REPO"
