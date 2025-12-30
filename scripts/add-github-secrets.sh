#!/bin/bash

# Script to add GitHub Actions secrets using GitHub CLI
# Make sure you have GitHub CLI installed: brew install gh
# Login first with: gh auth login
#
# SECURITY: This script is a TEMPLATE. You must provide your own secret values.
# NEVER commit actual secrets to the repository!

echo "🔐 Adding GitHub Actions Secrets..."
echo "=================================="

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Installing..."
    brew install gh
    echo "Please run 'gh auth login' to authenticate"
    exit 1
fi

# Get repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
    echo "❌ Not in a GitHub repository or not authenticated"
    echo "Please run 'gh auth login' first"
    exit 1
fi

echo "📦 Adding secrets to repository: $REPO"
echo ""
echo "⚠️  IMPORTANT: This script requires you to set environment variables first!"
echo ""

# Function to add secret from env var
add_secret_from_env() {
    local name=$1
    local env_var=$2
    local value="${!env_var}"
    
    if [ -z "$value" ]; then
        echo "⚠️  Skipping $name - $env_var not set"
        return 1
    fi
    
    echo "Adding $name..."
    echo "$value" | gh secret set "$name" --repo "$REPO"
}

echo "📝 Required Environment Variables:"
echo "  export SUPABASE_URL=your_supabase_url"
echo "  export SUPABASE_ANON_KEY=your_anon_key"
echo "  export SUPABASE_SERVICE_KEY=your_service_role_key"
echo "  export MAILERLITE_TOKEN=your_mailerlite_token"
echo "  export SENTRY_TOKEN=your_sentry_token"
echo "  export GH_PAT=your_github_pat"
echo "  export VERCEL_TOKEN=your_vercel_token"
echo "  export SUPABASE_DB_URL=your_db_url"
echo ""

# Supabase Secrets
echo "🗄️ Adding Supabase secrets..."
add_secret_from_env "VITE_SUPABASE_URL" "SUPABASE_URL"
add_secret_from_env "STAGING_SUPABASE_URL" "SUPABASE_URL"
add_secret_from_env "VITE_SUPABASE_ANON_KEY" "SUPABASE_ANON_KEY"
add_secret_from_env "STAGING_SUPABASE_ANON_KEY" "SUPABASE_ANON_KEY"
add_secret_from_env "SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_SERVICE_KEY"
add_secret_from_env "SUPABASE_STAGING_SERVICE_ROLE_KEY" "SUPABASE_SERVICE_KEY"

# MailerLite Secret
echo "📧 Adding MailerLite secret..."
add_secret_from_env "MAILERLITE_API_TOKEN" "MAILERLITE_TOKEN"
add_secret_from_env "VITE_MAILERLITE_API_TOKEN" "MAILERLITE_TOKEN"

# Sentry Secrets
echo "🐛 Adding Sentry secrets..."
add_secret_from_env "SENTRY_AUTH_TOKEN" "SENTRY_TOKEN"
add_secret_from_env "SENTRY_TOKEN" "SENTRY_TOKEN"

# GitHub Token
echo "🔑 Adding GitHub token..."
add_secret_from_env "GITHUB_TOKEN" "GH_PAT"

# Database URLs
echo "🗄️ Adding database URLs..."
add_secret_from_env "SUPABASE_STAGING_DB_URL" "SUPABASE_DB_URL"
add_secret_from_env "SUPABASE_DEV_DB_URL" "SUPABASE_DB_URL"

# Vercel Token
echo "▲ Adding Vercel token..."
add_secret_from_env "VERCEL_TOKEN" "VERCEL_TOKEN"

echo ""
echo "✅ Secret addition complete!"
echo ""
echo "⚠️  Still needed:"
echo "  1. VERCEL_ORG_ID - Run 'vercel link' to get this"
echo "  2. VERCEL_PROJECT_ID - Run 'vercel link' to get this"
echo ""
echo "📝 Optional (but recommended):"
echo "  3. SENTRY_DSN - Create project at https://sentry.io"
echo "  4. SENTRY_ORG - Your Sentry organization slug"
echo "  5. SENTRY_PROJECT - Your Sentry project slug"
echo "  6. POSTHOG_API_KEY - Sign up at https://posthog.com"
echo ""
echo "To add these manually, use:"
echo "  gh secret set SECRET_NAME --repo $REPO"
echo ""
echo "To list all secrets:"
echo "  gh secret list --repo $REPO"
