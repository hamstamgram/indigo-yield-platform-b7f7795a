#!/bin/bash

# Script to add GitHub Actions secrets using GitHub CLI
# Make sure you have GitHub CLI installed: brew install gh
# Login first with: gh auth login

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

# Function to add secret
add_secret() {
    local name=$1
    local value=$2
    echo "Adding $name..."
    echo "$value" | gh secret set "$name" --repo "$REPO"
}

# Supabase Secrets
echo "🗄️ Adding Supabase secrets..."
add_secret "VITE_SUPABASE_URL" "https://nkfimvovosdehmyyjubn.supabase.co"
add_secret "STAGING_SUPABASE_URL" "https://nkfimvovosdehmyyjubn.supabase.co"
add_secret "VITE_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"
add_secret "STAGING_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg"
add_secret "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k"
add_secret "SUPABASE_STAGING_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k"

# MailerLite Secret
echo "📧 Adding MailerLite secret..."
add_secret "MAILERLITE_API_TOKEN" "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjU4OGJmMDk4Y2QyZWM4ZDRhYTI5NzA1MmFhMTg3NTExOGQ2MTQzOTdmMjQ2NGU2YTc0Y2Q0OTVkZTU2YTJkZjk4ZWE0MWI4NjI2OTg1ZjQiLCJpYXQiOjE3NTY3MzA2NDcuODY5MDkzLCJuYmYiOjE3NTY3MzA2NDcuODY5MDk1LCJleHAiOjQ5MTI0MDQyNDcuODY1NTk1LCJzdWIiOiI4NjUyNDYiLCJzY29wZXMiOltdfQ.EhrR6IkV99fntVGgChpW1cuS2I2s6n5rw11KrK0X0gzXMh2e5zXyx90gDc99xI-jMt5jrRJK08EjAR0_DqgvvYU8ip3EvgZ9cH2IrEePUaB3SFhl4cf8KN8KmED71odr9e_VO6t5dfWGc3LjhsRNIMWHHRsdUw8W3mMhIJ-Wm5htR58AQQO1jV5PbIwLFiaPzH_Itw50alOXNP0CGGA15SPpfiiS2y9mm_tAgOuJN2GDkld1H5lkI_Vgu1-0dr04zusPaVwNo_5qMiMyxlukv6i2Sq8SwsdhNJDGXBOi-dqpo9uxmcNOi1v5wPfHenr8oVEvV3j2eG1iYVjmpzfSgPZCFdRF2GpICc96Q3tkf_IhKGiLxVYoS4YcR8-jYFyJjqLoVobZPFrchMsLP_UQXZ2Y8X4829lCLdHUKutyUdi-Iy_0yPHwso7evY3HcuHlsRb-5y-bFRhOssBfiDzyPwAZFL3zs-WFof5uLfZGZbtLgFn_rpX5fVQHZE0ce0XQOaVMh3UyBYgECECDWXXgqgsCYSh3vz9arnc8Tpz4fPaBRE4QK-ROdTvKtCPEsBi9H9I2iZ9VNhLeg6pHzggxwpBTiMPnDWX0i6TUrba2ZVlaJYI4nu5sg4Z4avBvbuUwaplPiEJ1QpM4Q5tdmFaoGZA4l_aeNWesXKYkwXj_qSw"
add_secret "VITE_MAILERLITE_API_TOKEN" "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjU4OGJmMDk4Y2QyZWM4ZDRhYTI5NzA1MmFhMTg3NTExOGQ2MTQzOTdmMjQ2NGU2YTc0Y2Q0OTVkZTU2YTJkZjk4ZWE0MWI4NjI2OTg1ZjQiLCJpYXQiOjE3NTY3MzA2NDcuODY5MDkzLCJuYmYiOjE3NTY3MzA2NDcuODY5MDk1LCJleHAiOjQ5MTI0MDQyNDcuODY1NTk1LCJzdWIiOiI4NjUyNDYiLCJzY29wZXMiOltdfQ.EhrR6IkV99fntVGgChpW1cuS2I2s6n5rw11KrK0X0gzXMh2e5zXyx90gDc99xI-jMt5jrRJK08EjAR0_DqgvvYU8ip3EvgZ9cH2IrEePUaB3SFhl4cf8KN8KmED71odr9e_VO6t5dfWGc3LjhsRNIMWHHRsdUw8W3mMhIJ-Wm5htR58AQQO1jV5PbIwLFiaPzH_Itw50alOXNP0CGGA15SPpfiiS2y9mm_tAgOuJN2GDkld1H5lkI_Vgu1-0dr04zusPaVwNo_5qMiMyxlukv6i2Sq8SwsdhNJDGXBOi-dqpo9uxmcNOi1v5wPfHenr8oVEvV3j2eG1iYVjmpzfSgPZCFdRF2GpICc96Q3tkf_IhKGiLxVYoS4YcR8-jYFyJjqLoVobZPFrchMsLP_UQXZ2Y8X4829lCLdHUKutyUdi-Iy_0yPHwso7evY3HcuHlsRb-5y-bFRhOssBfiDzyPwAZFL3zs-WFof5uLfZGZbtLgFn_rpX5fVQHZE0ce0XQOaVMh3UyBYgECECDWXXgqgsCYSh3vz9arnc8Tpz4fPaBRE4QK-ROdTvKtCPEsBi9H9I2iZ9VNhLeg6pHzggxwpBTiMPnDWX0i6TUrba2ZVlaJYI4nu5sg4Z4avBvbuUwaplPiEJ1QpM4Q5tdmFaoGZA4l_aeNWesXKYkwXj_qSw"

# Sentry Secrets
echo "🐛 Adding Sentry secrets..."
add_secret "SENTRY_AUTH_TOKEN" "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"
add_secret "SENTRY_TOKEN" "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"

# GitHub Token
echo "🔑 Adding GitHub token..."
add_secret "GITHUB_TOKEN" "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"

# Database URLs with password
echo "🗄️ Adding database URLs..."
add_secret "SUPABASE_STAGING_DB_URL" "postgresql://postgres.nkfimvovosdehmyyjubn:Douentza2067@@aws-0-us-east-2.pooler.supabase.com:6543/postgres"
add_secret "SUPABASE_DEV_DB_URL" "postgresql://postgres.nkfimvovosdehmyyjubn:Douentza2067@@aws-0-us-east-2.pooler.supabase.com:6543/postgres"

# Vercel Token
echo "▲ Adding Vercel token..."
add_secret "VERCEL_TOKEN" "l2nyQB0XXF43oAUFvEwL4dCY"

echo ""
echo "✅ All primary secrets added successfully!"
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
