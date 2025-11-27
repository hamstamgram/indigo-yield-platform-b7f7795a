#!/bin/bash

# ============================================================================
# CREDENTIAL VALIDATION SCRIPT
# Indigo Yield Platform - Deployment Automation
# ============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  CREDENTIAL VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}✗ FATAL: .env.production not found${NC}"
    echo "Run: ./scripts/rotate-credentials.sh"
    exit 1
fi

echo -e "${BLUE}Checking file permissions...${NC}"
PERMS=$(stat -f "%OLp" .env.production 2>/dev/null || stat -c "%a" .env.production 2>/dev/null)
if [ "$PERMS" != "600" ]; then
    echo -e "${YELLOW}⚠  Warning: File permissions are $PERMS (should be 600)${NC}"
    echo "   Fix with: chmod 600 .env.production"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ File permissions correct (600)${NC}"
fi
echo ""

# Source the file
set -a
source .env.production 2>/dev/null || {
    echo -e "${RED}✗ FATAL: Cannot read .env.production${NC}"
    exit 1
}
set +a

echo -e "${BLUE}Validating CRITICAL variables...${NC}"

# Check VITE_SUPABASE_URL
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}✗ VITE_SUPABASE_URL is missing${NC}"
    ((ERRORS++))
elif [ "$VITE_SUPABASE_URL" != "https://nkfimvovosdehmyyjubn.supabase.co" ]; then
    echo -e "${YELLOW}⚠  VITE_SUPABASE_URL doesn't match expected value${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ VITE_SUPABASE_URL${NC}"
fi

# Check VITE_SUPABASE_ANON_KEY
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}✗ VITE_SUPABASE_ANON_KEY is missing${NC}"
    ((ERRORS++))
elif [[ $VITE_SUPABASE_ANON_KEY == *"PLACEHOLDER"* ]]; then
    echo -e "${RED}✗ VITE_SUPABASE_ANON_KEY still contains PLACEHOLDER${NC}"
    ((ERRORS++))
elif [[ ! $VITE_SUPABASE_ANON_KEY =~ ^eyJ ]]; then
    echo -e "${YELLOW}⚠  VITE_SUPABASE_ANON_KEY doesn't start with 'eyJ'${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ VITE_SUPABASE_ANON_KEY (format valid)${NC}"
fi

# Check SUPABASE_SERVICE_ROLE_KEY
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY is missing${NC}"
    ((ERRORS++))
elif [[ $SUPABASE_SERVICE_ROLE_KEY == *"PLACEHOLDER"* ]]; then
    echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY still contains PLACEHOLDER${NC}"
    ((ERRORS++))
elif [[ ! $SUPABASE_SERVICE_ROLE_KEY =~ ^eyJ ]]; then
    echo -e "${YELLOW}⚠  SUPABASE_SERVICE_ROLE_KEY doesn't start with 'eyJ'${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY (format valid)${NC}"
fi

# Check VITE_APP_ENV
if [ -z "$VITE_APP_ENV" ]; then
    echo -e "${RED}✗ VITE_APP_ENV is missing${NC}"
    ((ERRORS++))
elif [ "$VITE_APP_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠  VITE_APP_ENV is not 'production'${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ VITE_APP_ENV=production${NC}"
fi

# Check NEXT_PUBLIC_APP_URL
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo -e "${RED}✗ NEXT_PUBLIC_APP_URL is missing${NC}"
    ((ERRORS++))
elif [[ $NEXT_PUBLIC_APP_URL == *"your-project"* ]]; then
    echo -e "${YELLOW}⚠  NEXT_PUBLIC_APP_URL needs to be updated after first deploy${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ NEXT_PUBLIC_APP_URL${NC}"
fi

echo ""
echo -e "${BLUE}Validating HIGH priority variables...${NC}"

# Check Sentry DSN
if [ -z "$VITE_SENTRY_DSN" ]; then
    echo -e "${RED}✗ VITE_SENTRY_DSN is missing${NC}"
    ((ERRORS++))
elif [[ $VITE_SENTRY_DSN == *"PLACEHOLDER"* ]]; then
    echo -e "${RED}✗ VITE_SENTRY_DSN still contains PLACEHOLDER${NC}"
    ((ERRORS++))
elif [[ ! $VITE_SENTRY_DSN =~ ^https:// ]]; then
    echo -e "${YELLOW}⚠  VITE_SENTRY_DSN doesn't start with 'https://'${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ VITE_SENTRY_DSN (format valid)${NC}"
fi

if [ -z "$SENTRY_DSN" ]; then
    echo -e "${YELLOW}⚠  SENTRY_DSN is missing${NC}"
    ((WARNINGS++))
elif [ "$SENTRY_DSN" != "$VITE_SENTRY_DSN" ]; then
    echo -e "${YELLOW}⚠  SENTRY_DSN should match VITE_SENTRY_DSN${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ SENTRY_DSN${NC}"
fi

# Check PostHog keys
if [ -z "$VITE_POSTHOG_KEY" ]; then
    echo -e "${RED}✗ VITE_POSTHOG_KEY is missing${NC}"
    ((ERRORS++))
elif [[ $VITE_POSTHOG_KEY == *"PLACEHOLDER"* ]]; then
    echo -e "${RED}✗ VITE_POSTHOG_KEY still contains PLACEHOLDER${NC}"
    ((ERRORS++))
elif [[ ! $VITE_POSTHOG_KEY =~ ^phc_ ]]; then
    echo -e "${YELLOW}⚠  VITE_POSTHOG_KEY doesn't start with 'phc_'${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ VITE_POSTHOG_KEY (format valid)${NC}"
fi

if [ -z "$VITE_POSTHOG_HOST" ]; then
    echo -e "${YELLOW}⚠  VITE_POSTHOG_HOST is missing${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ VITE_POSTHOG_HOST${NC}"
fi

if [ -z "$POSTHOG_API_KEY" ]; then
    echo -e "${RED}✗ POSTHOG_API_KEY is missing${NC}"
    ((ERRORS++))
elif [[ $POSTHOG_API_KEY == *"PLACEHOLDER"* ]]; then
    echo -e "${RED}✗ POSTHOG_API_KEY still contains PLACEHOLDER${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ POSTHOG_API_KEY${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL VALIDATIONS PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Execute database patch: ./scripts/execute-db-patch.sh"
    echo "2. Configure Lovable: ./scripts/configure-lovable.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠  PASSED WITH $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "Review warnings above. You may proceed if acceptable."
    exit 0
else
    echo -e "${RED}✗ VALIDATION FAILED${NC}"
    echo -e "${RED}Errors: $ERRORS | Warnings: $WARNINGS${NC}"
    echo ""
    echo "Fix errors and run validation again."
    exit 1
fi
