#!/bin/bash

# ============================================================================
# CREDENTIAL ROTATION SCRIPT
# Indigo Yield Platform - Deployment Automation
# ============================================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   INDIGO YIELD PLATFORM - CREDENTIAL ROTATION                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ⚠️  CRITICAL: SERVICE ROLE KEY WAS EXPOSED IN .env FILE     ║${NC}"
echo -e "${RED}║   The key has been removed but must be rotated immediately.   ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  CRITICAL: Credentials were exposed in git history${NC}"
echo -e "${YELLOW}⚠️  ALL credentials must be rotated before deployment${NC}"
echo ""

# Check if .env.production exists
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}Found existing .env.production - creating backup...${NC}"
    cp .env.production ".env.production.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Backup created${NC}"
    echo ""
fi

# Initialize .env.production
cat > .env.production << 'ENV_EOF'
# ============================================================================
# PRODUCTION ENVIRONMENT VARIABLES
# Generated: $(date)
# ============================================================================

ENV_EOF

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: SUPABASE CREDENTIALS (CRITICAL)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Open: https://app.supabase.com/project/nkfimvovosdehmyyjubn/settings/api"
echo "2. Click 'Reset' on the anon (public) key"
echo "3. Copy the new key"
echo ""
read -p "Press ENTER when ready to paste the new Supabase ANON key..."
echo -n "Paste new VITE_SUPABASE_ANON_KEY: "
read -r SUPABASE_ANON_KEY

if [[ ! $SUPABASE_ANON_KEY =~ ^eyJ ]]; then
    echo -e "${RED}✗ Warning: Supabase keys usually start with 'eyJ'${NC}"
    read -p "Continue anyway? (y/N): " confirm
    [[ $confirm != "y" ]] && exit 1
fi

echo ""
echo "4. Now click 'Reset' on the service_role key"
echo "5. Copy the new key (KEEP SECRET!)"
echo ""
read -p "Press ENTER when ready to paste the new Supabase SERVICE_ROLE key..."
echo -n "Paste new SUPABASE_SERVICE_ROLE_KEY: "
read -sp SERVICE_ROLE_KEY
echo ""

if [[ ! $SERVICE_ROLE_KEY =~ ^eyJ ]]; then
    echo -e "${RED}✗ Warning: Supabase keys usually start with 'eyJ'${NC}"
    read -p "Continue anyway? (y/N): " confirm
    [[ $confirm != "y" ]] && exit 1
fi

echo -e "${GREEN}✓ Supabase credentials collected${NC}"
echo ""

# Write Supabase vars
cat >> .env.production << ENV_EOF
# Supabase Configuration
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

ENV_EOF

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: SENTRY DSN (HIGH PRIORITY)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Go to https://sentry.io/"
echo "2. Create NEW project (React)"
echo "3. Copy the DSN from project settings"
echo ""
read -p "Press ENTER when ready to paste the new Sentry DSN..."
echo -n "Paste new SENTRY_DSN: "
read -r SENTRY_DSN

if [[ ! $SENTRY_DSN =~ ^https:// ]]; then
    echo -e "${RED}✗ Warning: Sentry DSN should start with 'https://'${NC}"
    read -p "Continue anyway? (y/N): " confirm
    [[ $confirm != "y" ]] && exit 1
fi

echo -e "${GREEN}✓ Sentry DSN collected${NC}"
echo ""

cat >> .env.production << ENV_EOF
# Sentry Configuration
VITE_SENTRY_DSN=$SENTRY_DSN
SENTRY_DSN=$SENTRY_DSN

ENV_EOF

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: POSTHOG KEYS (HIGH PRIORITY)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Go to https://posthog.com/"
echo "2. Create NEW project"
echo "3. Copy the Project API Key (starts with phc_)"
echo ""
read -p "Press ENTER when ready to paste the new PostHog key..."
echo -n "Paste new VITE_POSTHOG_KEY: "
read -r POSTHOG_KEY

if [[ ! $POSTHOG_KEY =~ ^phc_ ]]; then
    echo -e "${RED}✗ Warning: PostHog keys usually start with 'phc_'${NC}"
    read -p "Continue anyway? (y/N): " confirm
    [[ $confirm != "y" ]] && exit 1
fi

echo ""
echo "4. Now copy the PostHog API Key (for server-side)"
echo ""
read -p "Press ENTER when ready to paste the PostHog API key..."
echo -n "Paste new POSTHOG_API_KEY: "
read -sp POSTHOG_API_KEY
echo ""

echo -e "${GREEN}✓ PostHog keys collected${NC}"
echo ""

cat >> .env.production << ENV_EOF
# PostHog Configuration
VITE_POSTHOG_KEY=$POSTHOG_KEY
VITE_POSTHOG_HOST=https://app.posthog.com
POSTHOG_API_KEY=$POSTHOG_API_KEY

ENV_EOF

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: APPLICATION CONFIGURATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

cat >> .env.production << ENV_EOF
# Application Configuration
VITE_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://your-project.lovable.app

ENV_EOF

# Set secure permissions
chmod 600 .env.production

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ CREDENTIAL ROTATION COMPLETE                              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Created .env.production with 10 variables${NC}"
echo -e "${GREEN}✓ Set secure file permissions (600)${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Run: ./scripts/validate-credentials.sh"
echo "2. Verify all credentials are NEW (not from .env.example)"
echo "3. Update NEXT_PUBLIC_APP_URL after first Lovable deployment"
echo ""
echo -e "${RED}⚠️  NEVER commit .env.production to git!${NC}"
echo ""
