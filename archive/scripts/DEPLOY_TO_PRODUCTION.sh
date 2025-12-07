#!/bin/bash

# Indigo Yield Platform - Production Deployment Script
# Version: 1.0
# Date: 2025-09-03

echo "🚀 Indigo Yield Platform - Production Deployment"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-deployment checks
echo "📋 Step 1: Pre-deployment Checks"
echo "---------------------------------"

# Check if production env exists
if [ -f .env.production ]; then
    echo -e "${GREEN}✅ Production environment file found${NC}"
else
    echo -e "${RED}❌ Production environment file missing${NC}"
    exit 1
fi

# Check if build exists
if [ -d dist ]; then
    echo -e "${GREEN}✅ Build directory exists${NC}"
else
    echo -e "${RED}❌ Build directory missing - run: npm run build${NC}"
    exit 1
fi

echo ""

# Step 2: Fix remaining issues
echo "📋 Step 2: Fixing Remaining Issues"
echo "-----------------------------------"

# Fix the public profiles bucket
echo "🔧 Fixing public profiles bucket..."
cat << 'EOF' > scripts/fix-storage-buckets.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function fixStorageBuckets() {
  console.log('🔧 Fixing storage bucket configuration...\n');
  
  // Update profiles bucket to private
  const { data: updateProfiles, error: updateError } = await supabase.storage
    .updateBucket('profiles', { public: false });
  
  if (updateError) {
    console.log('❌ Error updating profiles bucket:', updateError.message);
  } else {
    console.log('✅ Profiles bucket set to private');
  }
  
  // Create profile-photos bucket if missing
  const { data: createPhotos, error: createError } = await supabase.storage
    .createBucket('profile-photos', { public: false });
  
  if (createError && createError.message.includes('already exists')) {
    console.log('✅ Profile-photos bucket already exists');
  } else if (createError) {
    console.log('❌ Error creating profile-photos bucket:', createError.message);
  } else {
    console.log('✅ Profile-photos bucket created');
  }
  
  console.log('\n✅ Storage configuration complete');
}

fixStorageBuckets();
EOF

node scripts/fix-storage-buckets.mjs

echo ""

# Step 3: Build for production
echo "📋 Step 3: Building for Production"
echo "-----------------------------------"
read -p "Do you want to rebuild for production? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building..."
    npm run build
fi

echo ""

# Step 4: Database backup reminder
echo "📋 Step 4: Database Backup"
echo "--------------------------"
echo -e "${YELLOW}⚠️  IMPORTANT: Backup your production database before deployment${NC}"
echo "Run this in Supabase dashboard SQL editor:"
echo ""
echo "-- Create backup of critical tables"
echo "CREATE TABLE profiles_backup_$(date +%Y%m%d) AS SELECT * FROM profiles;"
echo "CREATE TABLE deposits_backup_$(date +%Y%m%d) AS SELECT * FROM deposits;"
echo "CREATE TABLE balances_backup_$(date +%Y%m%d) AS SELECT * FROM balances;"
echo ""
read -p "Have you backed up the production database? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Please backup the database before continuing${NC}"
    exit 1
fi

echo ""

# Step 5: Deployment options
echo "📋 Step 5: Choose Deployment Method"
echo "------------------------------------"
echo "1) Deploy to Vercel"
echo "2) Deploy to Netlify"
echo "3) Deploy to Custom Server"
echo "4) Generate deployment package only"
echo ""
read -p "Select option (1-4): " deployment_choice

case $deployment_choice in
    1)
        echo "Deploying to Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod
        else
            echo "Installing Vercel CLI..."
            npm i -g vercel
            vercel --prod
        fi
        ;;
    2)
        echo "Deploying to Netlify..."
        if command -v netlify &> /dev/null; then
            netlify deploy --prod --dir=dist
        else
            echo "Installing Netlify CLI..."
            npm i -g netlify-cli
            netlify deploy --prod --dir=dist
        fi
        ;;
    3)
        echo "Creating deployment package..."
        tar -czf indigo-yield-deploy-$(date +%Y%m%d-%H%M%S).tar.gz dist/
        echo -e "${GREEN}✅ Deployment package created${NC}"
        echo "Upload this file to your server and extract with:"
        echo "tar -xzf indigo-yield-deploy-*.tar.gz"
        ;;
    4)
        echo "Creating deployment package..."
        zip -r indigo-yield-deploy-$(date +%Y%m%d-%H%M%S).zip dist/
        echo -e "${GREEN}✅ Deployment package created${NC}"
        ;;
esac

echo ""

# Step 6: Post-deployment verification
echo "📋 Step 6: Post-Deployment Verification"
echo "----------------------------------------"
echo ""
echo "After deployment, verify:"
echo "  □ Application loads correctly"
echo "  □ Authentication works"
echo "  □ Database connection is active"
echo "  □ File uploads work"
echo "  □ Email notifications send"
echo "  □ Excel import/export functions"
echo ""

# Step 7: Monitoring setup
echo "📋 Step 7: Setup Monitoring"
echo "---------------------------"
echo ""
echo "Recommended monitoring:"
echo "  1. Sentry for error tracking: https://sentry.io"
echo "  2. LogRocket for session replay: https://logrocket.com"
echo "  3. Supabase Dashboard for database metrics"
echo "  4. Uptime monitoring: https://uptimerobot.com"
echo ""

echo -e "${GREEN}🎉 Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor application logs"
echo "2. Run smoke tests"
echo "3. Verify all features"
echo "4. Monitor error rates"
echo ""
echo "Support: Check Supabase dashboard for Edge Function logs"
echo "Dashboard: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn"
