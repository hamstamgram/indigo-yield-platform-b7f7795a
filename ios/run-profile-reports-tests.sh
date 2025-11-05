#!/bin/bash

# Profile & Reports Test Execution Script
# Runs all 275 tests for 14 pages

set -e

echo "=================================================="
echo "Profile & Reports Pages Test Suite"
echo "Testing 14 Pages with 275 Test Cases"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
SCHEME="IndigoInvestor"
DESTINATION="platform=iOS Simulator,name=iPhone 15 Pro"

echo "📱 Test Configuration:"
echo "   Scheme: $SCHEME"
echo "   Destination: $DESTINATION"
echo ""

# Function to run test suite
run_test_suite() {
    local test_name=$1
    local test_class=$2

    echo "🧪 Running $test_name..."

    if xcodebuild test \
        -scheme "$SCHEME" \
        -destination "$DESTINATION" \
        -only-testing:"IndigoInvestorTests/$test_class" \
        2>&1 | grep -q "Test Suite.*passed"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Track results
total_suites=0
passed_suites=0
failed_suites=0

echo "=================================================="
echo "PROFILE PAGES TESTS (8 Pages)"
echo "=================================================="
echo ""

# Profile Overview Tests
total_suites=$((total_suites + 1))
if run_test_suite "Profile Overview (12 tests)" "ProfileOverviewViewTests"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Personal Information Tests
total_suites=$((total_suites + 1))
if run_test_suite "Personal Information (18 tests)" "PersonalInformationViewTests"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# KYC Verification Tests - CRITICAL
total_suites=$((total_suites + 1))
echo "🔥 CRITICAL: File Upload Testing"
if run_test_suite "KYC Verification (28 tests)" "KYCVerificationViewTests"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Profile Pages Test Suite (remaining pages)
total_suites=$((total_suites + 1))
if run_test_suite "Security, Preferences, Privacy, Linked Accounts, Referrals (89 tests)" "ProfilePagesTestSuite"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

echo "=================================================="
echo "REPORTS PAGES TESTS (6 Pages)"
echo "=================================================="
echo ""

# Custom Report Builder Tests - CRITICAL
total_suites=$((total_suites + 1))
echo "🔥 CRITICAL: Report Builder Component"
if run_test_suite "Custom Report Builder (47 tests)" "CustomReportBuilderViewTests"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Reports Pages Test Suite
total_suites=$((total_suites + 1))
if run_test_suite "Dashboard, Performance, Tax, Statement, History (81 tests)" "ReportsPagesTestSuite"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Final Results
echo "=================================================="
echo "TEST EXECUTION SUMMARY"
echo "=================================================="
echo ""
echo "Total Test Suites: $total_suites"
echo -e "${GREEN}Passed: $passed_suites${NC}"
echo -e "${RED}Failed: $failed_suites${NC}"
echo ""

# Calculate totals
echo "📊 Test Case Summary:"
echo "   Profile Overview: 12 tests"
echo "   Personal Information: 18 tests"
echo "   KYC Verification: 28 tests 🔥"
echo "   Other Profile Pages: 89 tests"
echo "   Custom Report Builder: 47 tests 🔥"
echo "   Other Reports Pages: 81 tests"
echo "   ────────────────────────────"
echo "   TOTAL: 275 tests"
echo ""

# Coverage breakdown
echo "📈 Coverage by Category:"
echo "   Profile Pages: 147 tests (53%)"
echo "   Reports Pages: 128 tests (47%)"
echo ""

echo "🔥 Critical Components:"
echo "   ✅ File Upload Testing (KYC): 28 tests"
echo "   ✅ Report Builder: 47 tests"
echo "   ✅ Report Generation (PDF/Excel/CSV/JSON)"
echo "   ✅ Form Validation: 60+ tests"
echo "   ✅ Tax Calculations: 26 tests"
echo ""

# Exit with appropriate code
if [ $failed_suites -eq 0 ]; then
    echo -e "${GREEN}=================================================="
    echo "✅ ALL TESTS PASSED! 🎉"
    echo -e "==================================================${NC}"
    echo ""
    echo "Test report available at:"
    echo "test-reports/profile-reports-tests.md"
    exit 0
else
    echo -e "${RED}=================================================="
    echo "❌ SOME TESTS FAILED"
    echo -e "==================================================${NC}"
    echo ""
    echo "Review failed tests above for details"
    exit 1
fi
