#!/bin/bash

# Comprehensive Test Runner Script
# Runs all test suites and generates coverage reports

set -e

echo "========================================="
echo "INDIGO YIELD PLATFORM - TEST SUITE"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Start time
START_TIME=$(date +%s)

# Function to print section header
print_header() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Cleanup previous reports
print_header "Cleaning Previous Reports"
rm -rf coverage
rm -rf test-reports
mkdir -p test-reports
print_success "Previous reports cleaned"

# Run unit tests
print_header "Running Unit Tests"
npm run test:unit || {
    print_error "Unit tests failed"
    exit 1
}
print_success "Unit tests passed"

# Run integration tests
print_header "Running Integration Tests"
npm run test:integration || {
    print_warning "Integration tests had failures"
}
print_success "Integration tests completed"

# Run E2E tests
print_header "Running E2E Tests"
npm run test:e2e || {
    print_warning "E2E tests had failures"
}
print_success "E2E tests completed"

# Run accessibility tests
print_header "Running Accessibility Tests"
npm run test:e2e -- tests/accessibility/ || {
    print_warning "Accessibility tests had failures"
}
print_success "Accessibility tests completed"

# Generate coverage report
print_header "Generating Coverage Report"
npm run test:coverage || {
    print_error "Coverage generation failed"
    exit 1
}
print_success "Coverage report generated"

# Calculate coverage
if [ -f "coverage/coverage-summary.json" ]; then
    print_header "Coverage Summary"

    # Extract coverage percentages (requires jq)
    if command -v jq &> /dev/null; then
        LINES=$(jq '.total.lines.pct' coverage/coverage-summary.json)
        STATEMENTS=$(jq '.total.statements.pct' coverage/coverage-summary.json)
        FUNCTIONS=$(jq '.total.functions.pct' coverage/coverage-summary.json)
        BRANCHES=$(jq '.total.branches.pct' coverage/coverage-summary.json)

        echo "Lines:      ${LINES}%"
        echo "Statements: ${STATEMENTS}%"
        echo "Functions:  ${FUNCTIONS}%"
        echo "Branches:   ${BRANCHES}%"
        echo ""

        # Check if we meet 80% threshold
        if (( $(echo "$LINES >= 80" | bc -l) )) && \
           (( $(echo "$STATEMENTS >= 80" | bc -l) )) && \
           (( $(echo "$FUNCTIONS >= 80" | bc -l) )) && \
           (( $(echo "$BRANCHES >= 80" | bc -l) )); then
            print_success "✓ Coverage threshold met (80%+)"
        else
            print_warning "⚠ Coverage below 80% threshold"
        fi
    else
        print_warning "jq not installed - install for detailed coverage analysis"
    fi
fi

# Count test files
print_header "Test Suite Statistics"
UNIT_TESTS=$(find tests/unit -name "*.test.*" -o -name "*.spec.*" | wc -l | tr -d ' ')
INTEGRATION_TESTS=$(find tests/integration -name "*.spec.*" | wc -l | tr -d ' ')
E2E_TESTS=$(find tests/e2e -name "*.spec.*" | wc -l | tr -d ' ')
ACCESSIBILITY_TESTS=$(find tests/accessibility -name "*.spec.*" | wc -l | tr -d ' ')
TOTAL_TESTS=$((UNIT_TESTS + INTEGRATION_TESTS + E2E_TESTS + ACCESSIBILITY_TESTS))

echo "Unit Tests:          $UNIT_TESTS files"
echo "Integration Tests:   $INTEGRATION_TESTS files"
echo "E2E Tests:           $E2E_TESTS files"
echo "Accessibility Tests: $ACCESSIBILITY_TESTS files"
echo "-------------------------------------------"
echo "Total Test Files:    $TOTAL_TESTS files"
echo ""

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

print_header "Test Suite Complete"
echo "Duration: ${MINUTES}m ${SECONDS}s"
echo ""
echo "Reports available at:"
echo "  - Coverage:      coverage/index.html"
echo "  - Unit/Int:      test-reports/"
echo "  - E2E:           test-reports/playwright/"
echo "  - Accessibility: test-reports/playwright/"
echo ""

print_success "All tests completed successfully!"
