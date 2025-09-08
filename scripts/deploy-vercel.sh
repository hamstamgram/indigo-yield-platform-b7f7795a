#!/bin/bash

echo "🚀 Preparing for Vercel Deployment"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test || {
    echo -e "${RED}Tests failed! Fix issues before deploying.${NC}"
    exit 1
}

echo -e "${YELLOW}🔨 Building project...${NC}"
npm run build || {
    echo -e "${RED}Build failed! Check for errors.${NC}"
    exit 1
}

echo -e "${GREEN}✅ Build successful!${NC}"

# Check if dist folder exists and has content
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}Error: dist folder is empty or doesn't exist${NC}"
    exit 1
fi

echo -e "${YELLOW}📊 Build stats:${NC}"
du -sh dist
echo "Files in dist:"
ls -la dist | head -10

echo -e "${GREEN}✅ Ready for deployment!${NC}"
echo ""
echo "To deploy to Vercel, run:"
echo "  vercel --prod"
echo ""
echo "Or for staging:"
echo "  vercel"
echo ""
echo -e "${YELLOW}⚠️  Make sure to set environment variables in Vercel dashboard:${NC}"
echo "  - VITE_SUPABASE_URL"
echo "  - VITE_SUPABASE_ANON_KEY"
echo "  - VITE_SENTRY_DSN (optional)"
echo ""
