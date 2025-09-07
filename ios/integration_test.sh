#!/bin/bash

# Integration Test Suite for IndigoInvestor iOS App
# This script tests the connection between iOS app and Supabase backend

echo "🧪 IndigoInvestor Integration Test Suite"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${BLUE}Running: ${test_name}${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found. Run setup_backend.sh first.${NC}"
    exit 1
fi

# Load environment variables
source .env

# Validate Supabase credentials
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Supabase credentials not configured in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Test 1: Supabase URL connectivity
echo "========================================="
echo "Test Suite 1: Backend Connectivity"
echo "========================================="
echo ""

run_test "Supabase URL Reachable" "curl -s -o /dev/null -w '%{http_code}' '$SUPABASE_URL' | grep -q '200'"

run_test "Supabase Auth Endpoint" "curl -s -o /dev/null -w '%{http_code}' '${SUPABASE_URL}/auth/v1/health' | grep -E '200|404'"

run_test "Supabase REST Endpoint" "curl -s -o /dev/null -w '%{http_code}' '${SUPABASE_URL}/rest/v1/' -H 'apikey: $SUPABASE_ANON_KEY' | grep -q '200'"

# Test 2: Database Schema
echo "========================================="
echo "Test Suite 2: Database Schema Verification"
echo "========================================="
echo ""

# Create a simple Node.js script to test database
cat > test_db.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
    try {
        // Test table existence by attempting to query
        const tables = ['investors', 'portfolios', 'transactions', 'statements'];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('id')
                .limit(1);
            
            if (error && error.code !== 'PGRST116') {
                console.error(`Table ${table}: ERROR - ${error.message}`);
                return false;
            } else {
                console.log(`Table ${table}: OK`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Database test failed:', error);
        return false;
    }
}

testDatabase().then(success => {
    process.exit(success ? 0 : 1);
});
EOF

# Check if Node.js is installed
if command -v node &> /dev/null; then
    # Install Supabase client if not present
    if [ ! -d "node_modules/@supabase/supabase-js" ]; then
        echo -e "${YELLOW}Installing test dependencies...${NC}"
        npm install @supabase/supabase-js &> /dev/null
    fi
    
    run_test "Database Tables Exist" "node test_db.js"
    rm test_db.js
else
    echo -e "${YELLOW}⚠️  Node.js not found. Skipping database tests.${NC}"
fi

# Test 3: iOS Build
echo "========================================="
echo "Test Suite 3: iOS App Build"
echo "========================================="
echo ""

# Check if Xcode is installed
if command -v xcodebuild &> /dev/null; then
    run_test "iOS Project Builds" "cd IndigoInvestor && xcodebuild -scheme IndigoInvestor -destination 'platform=iOS Simulator,name=iPhone 15' -derivedDataPath build clean build CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO | grep -q 'BUILD SUCCEEDED'"
else
    echo -e "${YELLOW}⚠️  Xcode not found. Skipping iOS build tests.${NC}"
fi

# Test 4: Security Configuration
echo "========================================="
echo "Test Suite 4: Security Configuration"
echo "========================================="
echo ""

run_test "Keychain Access Available" "security list-keychains | grep -q 'login.keychain'"

run_test "Biometric Capability Check" "[ -f 'IndigoInvestor/Info.plist' ] && grep -q 'NSFaceIDUsageDescription' IndigoInvestor/Info.plist"

# Test 5: Asset Resources
echo "========================================="
echo "Test Suite 5: Asset Resources"
echo "========================================="
echo ""

run_test "App Icons Configured" "[ -d 'IndigoInvestor/Resources/Assets.xcassets/AppIcon.appiconset' ] && ls IndigoInvestor/Resources/Assets.xcassets/AppIcon.appiconset/*.png 2>/dev/null | grep -q 'png'"

run_test "Launch Screen Exists" "[ -f 'IndigoInvestor/Resources/LaunchScreen.storyboard' ]"

run_test "Brand Colors Defined" "[ -f 'IndigoInvestor/Resources/Assets.xcassets/IndigoBrand.colorset/Contents.json' ]"

# Test 6: Documentation
echo "========================================="
echo "Test Suite 6: Documentation"
echo "========================================="
echo ""

run_test "README Exists" "[ -f 'README.md' ]"

run_test "Deployment Guide Exists" "[ -f 'DEPLOYMENT_GUIDE.md' ]"

run_test "Development Status Exists" "[ -f 'IndigoInvestor/DEVELOPMENT_STATUS.md' ] || [ -f 'DEVELOPMENT_STATUS.md' ]"

# Summary
echo "========================================="
echo -e "${BLUE}Integration Test Summary${NC}"
echo "========================================="
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! The app is ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the output above.${NC}"
    exit 1
fi
