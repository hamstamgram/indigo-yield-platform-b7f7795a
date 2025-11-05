#!/bin/bash

# Dashboard and Transaction Pages Test Runner
# This script runs all Playwright tests for the 8 pages

set -e

echo "=================================="
echo "Dashboard & Transaction Test Suite"
echo "=================================="
echo ""
echo "Testing 8 Pages:"
echo "  Dashboard (3): /dashboard, /dashboard/portfolio, /dashboard/performance"
echo "  Transactions (5): /transactions, /transactions/:id, /transactions/deposit,"
echo "                    /transactions/pending, /transactions/recurring"
echo ""
echo "=================================="
echo ""

# Check if dev server is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "⚠️  Warning: Dev server not detected at http://localhost:5173"
    echo "Please start the dev server with: npm run dev"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Starting test execution..."
echo ""

# Create test reports directory
mkdir -p test-reports/screenshots

# Run tests with custom config
export PLAYWRIGHT_BASE_URL=http://localhost:5173

echo "📊 Running Dashboard Tests..."
npx playwright test tests/e2e/dashboard --config=playwright.config.test.ts --reporter=list || true

echo ""
echo "💰 Running Transaction Tests..."
npx playwright test tests/e2e/transactions --config=playwright.config.test.ts --reporter=list || true

echo ""
echo "=================================="
echo "✅ Test execution completed!"
echo ""
echo "📊 Reports generated:"
echo "  - HTML Report: test-reports/html/index.html"
echo "  - JSON Report: test-reports/results.json"
echo "  - Screenshots: test-reports/screenshots/"
echo ""
echo "To view HTML report: npx playwright show-report test-reports/html"
echo "=================================="
