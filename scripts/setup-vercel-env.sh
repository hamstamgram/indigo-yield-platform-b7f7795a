#!/bin/bash

# Setup Vercel Environment Variables
# Run this script after linking your Vercel project with: vercel link

echo "🚀 Setting up Vercel environment variables..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo "❌ Project not linked to Vercel. Running 'vercel link'..."
    vercel link
fi

# Supabase Configuration
echo "📦 Setting Supabase variables..."
vercel env add VITE_SUPABASE_URL production < <(echo "https://nkfimvovosdehmyyjubn.supabase.co")
vercel env add VITE_SUPABASE_URL preview < <(echo "https://nkfimvovosdehmyyjubn.supabase.co")
vercel env add VITE_SUPABASE_URL development < <(echo "https://nkfimvovosdehmyyjubn.supabase.co")

vercel env add VITE_SUPABASE_ANON_KEY production < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg")
vercel env add VITE_SUPABASE_ANON_KEY preview < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg")
vercel env add VITE_SUPABASE_ANON_KEY development < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg")

# Service Role Key (only for production/preview)
vercel env add SUPABASE_SERVICE_ROLE_KEY production < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k")
vercel env add SUPABASE_SERVICE_ROLE_KEY preview < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k")

# Resend Configuration
echo "📧 Setting Resend variables..."
vercel env add RESEND_API_KEY production < <(echo "your_resend_api_key")
vercel env add RESEND_API_KEY preview < <(echo "your_resend_api_key")
vercel env add RESEND_API_KEY development < <(echo "your_resend_api_key")

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "📝 Next steps:"
echo "1. Get your Supabase database password from: https://supabase.com/dashboard"
echo "2. Set up Sentry (optional): https://sentry.io"
echo "3. Set up PostHog (optional): https://posthog.com"
echo ""
echo "To view all environment variables:"
echo "  vercel env ls"
echo ""
echo "To pull environment variables for local development:"
echo "  vercel env pull .env.local"
