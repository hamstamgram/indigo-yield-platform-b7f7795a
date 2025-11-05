#!/bin/bash

###############################################################################
# Authentication Integration Test Runner
#
# This script runs all authentication integration tests for the Indigo Yield
# Platform across web and iOS platforms.
#
# Usage:
#   ./run-auth-tests.sh [options]
#
# Options:
#   --web-only       Run only web platform tests
#   --ios-only       Run only iOS platform tests
#   --integration    Run only Supabase integration tests
#   --cross-platform Run only cross-platform tests
#   --all            Run all tests (default)
#   --report         Generate HTML test report
#   --headed         Run tests in headed mode (visible browser)
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
RUN_WEB=true
RUN_IOS=false
RUN_INTEGRATION=false
RUN_CROSS_PLATFORM=false
GENERATE_REPORT=false
HEADED=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --web-only)
      RUN_WEB=true
      RUN_IOS=false
      RUN_INTEGRATION=false
      RUN_CROSS_PLATFORM=false
      shift
      ;;
    --ios-only)
      RUN_WEB=false
      RUN_IOS=true
      RUN_INTEGRATION=false
      RUN_CROSS_PLATFORM=false
      shift
      ;;
    --integration)
      RUN_WEB=false
      RUN_IOS=false
      RUN_INTEGRATION=true
      RUN_CROSS_PLATFORM=false
      shift
      ;;
    --cross-platform)
      RUN_WEB=false
      RUN_IOS=false
      RUN_INTEGRATION=false
      RUN_CROSS_PLATFORM=true
      shift
      ;;
    --all)
      RUN_WEB=true
      RUN_IOS=true
      RUN_INTEGRATION=true
      RUN_CROSS_PLATFORM=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --headed)
      HEADED=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Print banner
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Indigo Yield Authentication Integration Tests             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check environment
echo -e "${YELLOW}🔍 Checking environment...${NC}"

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ .env file not found${NC}"
  exit 1
fi

# Check Supabase configuration
if ! grep -q "VITE_SUPABASE_URL" .env; then
  echo -e "${RED}❌ VITE_SUPABASE_URL not configured${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Environment configured${NC}"

# Check dependencies
echo -e "${YELLOW}📦 Checking dependencies...${NC}"

if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not found${NC}"
  exit 1
fi

if [ "$RUN_IOS" = true ]; then
  if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode not found (required for iOS tests)${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Dependencies available${NC}"

# Install npm packages if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing npm packages...${NC}"
  npm install
fi

# Create test results directory
mkdir -p test-results
mkdir -p test-reports

# Run Web Platform Tests
if [ "$RUN_WEB" = true ]; then
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}🌐 Running Web Platform Authentication Tests${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""

  PLAYWRIGHT_OPTS=""
  if [ "$HEADED" = true ]; then
    PLAYWRIGHT_OPTS="--headed"
  fi

  if npx playwright test tests/auth-integration.spec.ts $PLAYWRIGHT_OPTS --reporter=html,junit; then
    echo -e "${GREEN}✅ Web platform tests PASSED${NC}"
  else
    echo -e "${RED}❌ Web platform tests FAILED${NC}"
    exit 1
  fi
fi

# Run Supabase Integration Tests
if [ "$RUN_INTEGRATION" = true ]; then
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}💾 Running Supabase Integration Tests${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""

  PLAYWRIGHT_OPTS=""
  if [ "$HEADED" = true ]; then
    PLAYWRIGHT_OPTS="--headed"
  fi

  if npx playwright test tests/supabase-integration.spec.ts $PLAYWRIGHT_OPTS --reporter=html,junit; then
    echo -e "${GREEN}✅ Supabase integration tests PASSED${NC}"
  else
    echo -e "${RED}❌ Supabase integration tests FAILED${NC}"
    exit 1
  fi
fi

# Run Cross-Platform Tests
if [ "$RUN_CROSS_PLATFORM" = true ]; then
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}🔄 Running Cross-Platform Verification Tests${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""

  PLAYWRIGHT_OPTS=""
  if [ "$HEADED" = true ]; then
    PLAYWRIGHT_OPTS="--headed"
  fi

  if npx playwright test tests/cross-platform-verification.spec.ts $PLAYWRIGHT_OPTS --reporter=html,junit; then
    echo -e "${GREEN}✅ Cross-platform tests PASSED${NC}"
  else
    echo -e "${RED}❌ Cross-platform tests FAILED${NC}"
    exit 1
  fi
fi

# Run iOS Tests
if [ "$RUN_IOS" = true ]; then
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}📱 Running iOS Authentication Tests${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""

  cd ios

  # Build and test iOS app
  if xcodebuild test \
    -scheme IndigoInvestor \
    -destination 'platform=iOS Simulator,name=iPhone 15' \
    -resultBundlePath ../test-results/ios-test-results \
    | xcpretty; then
    echo -e "${GREEN}✅ iOS tests PASSED${NC}"
  else
    echo -e "${RED}❌ iOS tests FAILED${NC}"
    cd ..
    exit 1
  fi

  cd ..
fi

# Generate HTML Report
if [ "$GENERATE_REPORT" = true ]; then
  echo ""
  echo -e "${YELLOW}📊 Generating test report...${NC}"

  # Open Playwright HTML report
  if [ -f "playwright-report/index.html" ]; then
    echo -e "${GREEN}✅ Test report generated: playwright-report/index.html${NC}"

    # Open in browser (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open playwright-report/index.html
    fi
  fi
fi

# Print summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All Tests Completed Successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Test Results:${NC}"
echo -e "  • Test Reports: test-reports/"
echo -e "  • Test Results: test-results/"
echo -e "  • HTML Report: playwright-report/index.html"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  • Review test report: ${BLUE}test-reports/AUTH_INTEGRATION_REPORT.md${NC}"
echo -e "  • View detailed results: ${BLUE}open playwright-report/index.html${NC}"
echo -e "  • Check iOS results: ${BLUE}test-results/ios-test-results${NC}"
echo ""
echo -e "${GREEN}🎉 Authentication integration testing complete!${NC}"
echo ""
