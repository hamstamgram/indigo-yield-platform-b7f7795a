#!/bin/bash

###############################################################################
# Comprehensive Withdrawal Test Runner
# Run withdrawal transaction tests with proper environment setup
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Withdrawal Transaction Test Suite${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check for required environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}Error: SUPABASE_URL environment variable is not set${NC}"
  echo "Set it with: export SUPABASE_URL='https://your-project.supabase.co'"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}Error: Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY is set${NC}"
  echo "Set one with:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-key'"
  echo "  OR"
  echo "  export SUPABASE_ANON_KEY='your-anon-key'"
  exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables configured"
echo ""

# Parse command line arguments
TEST_SUITE=""
DEBUG_MODE=""
HEADED_MODE=""
REPORTER="list"

while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      DEBUG_MODE="--debug"
      shift
      ;;
    --headed)
      HEADED_MODE="--headed"
      shift
      ;;
    --html)
      REPORTER="html"
      shift
      ;;
    --suite)
      TEST_SUITE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./run-withdrawal-tests.sh [options]"
      echo ""
      echo "Options:"
      echo "  --debug          Run in debug mode"
      echo "  --headed         Run in headed mode (show browser)"
      echo "  --html           Generate HTML report"
      echo "  --suite NAME     Run specific test suite"
      echo "  --help           Show this help message"
      echo ""
      echo "Available test suites:"
      echo "  - 'Basic Withdrawal Flow'"
      echo "  - 'Partial vs Full Withdrawal'"
      echo "  - 'Yield Crystallization'"
      echo "  - 'Multi-Date Withdrawals'"
      echo "  - 'Amount Validation'"
      echo "  - 'Error Handling'"
      echo "  - 'Transaction Integrity'"
      echo ""
      echo "Examples:"
      echo "  ./run-withdrawal-tests.sh"
      echo "  ./run-withdrawal-tests.sh --debug"
      echo "  ./run-withdrawal-tests.sh --suite 'Basic Withdrawal Flow'"
      echo "  ./run-withdrawal-tests.sh --html"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build the test command
TEST_CMD="npx playwright test tests/comprehensive/transactions/withdrawal.spec.ts"

if [ -n "$TEST_SUITE" ]; then
  TEST_CMD="$TEST_CMD -g \"$TEST_SUITE\""
  echo -e "${YELLOW}Running test suite:${NC} $TEST_SUITE"
else
  echo -e "${YELLOW}Running all withdrawal tests${NC}"
fi

if [ -n "$DEBUG_MODE" ]; then
  TEST_CMD="$TEST_CMD $DEBUG_MODE"
  echo -e "${YELLOW}Debug mode:${NC} enabled"
fi

if [ -n "$HEADED_MODE" ]; then
  TEST_CMD="$TEST_CMD $HEADED_MODE"
  echo -e "${YELLOW}Headed mode:${NC} enabled"
fi

TEST_CMD="$TEST_CMD --reporter=$REPORTER"

echo ""
echo -e "${BLUE}Starting tests...${NC}"
echo ""

# Run the tests
eval $TEST_CMD

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}  All tests passed! ✓${NC}"
  echo -e "${GREEN}=========================================${NC}"
else
  echo -e "${RED}=========================================${NC}"
  echo -e "${RED}  Some tests failed ✗${NC}"
  echo -e "${RED}=========================================${NC}"
fi

# Show report if HTML reporter was used
if [ "$REPORTER" == "html" ]; then
  echo ""
  echo -e "${BLUE}Opening HTML report...${NC}"
  npx playwright show-report
fi

exit $EXIT_CODE
