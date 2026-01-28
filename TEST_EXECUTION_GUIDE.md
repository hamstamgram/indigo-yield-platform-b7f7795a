# Test Execution Guide - Indigo Yield Platform

Step-by-step guide for running the complete test suite.

---

## 🚨 CRITICAL: Fix Tests First

Before running any tests, fix the Jest/Vitest conflict:

```bash
cd /Users/mama/indigo-yield-platform-v01

# Run automated fix
./scripts/fix-test-imports.sh

# OR manual fix
find tests/unit -name "*.test.ts" -exec sed -i '' 's/from "vitest"/from "@jest\/globals"/g' {} \;
npm install --save-dev @jest/globals
```

---

## 1️⃣ Unit Tests (Jest)

### Quick Run
```bash
npm test
```

**Expected Output**:
```
Test Suites: 26 passed, 26 total
Tests:       200+ passed, 200+ total
Time:        ~5-10s
```

### With Coverage
```bash
npm run test:coverage
```

**Coverage Report Location**: `coverage/lcov-report/index.html`

**Open in Browser**:
```bash
open coverage/lcov-report/index.html
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Specific Test Files
```bash
# Positions only
npx jest tests/unit/positions.test.js

# Yields only
npx jest tests/unit/yields.test.js

# Utils only
npx jest tests/unit/utils/

# Pattern matching
npx jest --testNamePattern="yield"
```

### Debug Failing Tests
```bash
# Verbose output
npx jest --verbose

# Detect open handles
npx jest --detectOpenHandles

# Run in band (no parallel)
npx jest --runInBand
```

---

## 2️⃣ Integration Tests (Playwright)

### Prerequisites
```bash
# Install Playwright browsers (first time only)
npx playwright install --with-deps
```

### Run Integration Tests
```bash
npm run test:integration
```

**Tests**: Authentication, admin workflows, investor workflows, user management, reports, withdrawals.

### Specific Integration Tests
```bash
# Auth tests only
npm run test:auth
npm run test:auth:headed  # With browser UI

# Supabase tests
npm run test:supabase

# Cross-platform verification
npm run test:cross-platform
```

---

## 3️⃣ E2E Tests (Playwright)

### Prerequisites
```bash
# Ensure dev server is NOT running (Playwright will start it)
# If running: pkill -f "vite"

# Check Playwright installation
npx playwright --version
```

### Run All E2E Tests
```bash
npm run test:e2e
```

**Duration**: ~5-15 minutes (depends on parallelization)

**Tests Run**:
- Admin portal workflows
- Investor portal workflows
- IB portal workflows
- Transaction flows
- Yield distribution
- Report generation
- Golden path scenarios

### Run Specific E2E Tests
```bash
# Golden path only (critical workflows)
npm run test:golden

# Admin workflows
npx playwright test tests/e2e/admin-transactions.spec.ts
npx playwright test tests/e2e/admin-yield-workflow.spec.ts

# Investor workflows
npx playwright test tests/e2e/investor-portal.spec.ts
npx playwright test tests/e2e/investor-reporting.spec.ts

# IB workflows
npx playwright test tests/e2e/ib-portal.spec.ts
npx playwright test tests/e2e/ib-assignment-workflow.spec.ts

# Transactions
npx playwright test tests/e2e/transactions/

# Dashboard
npx playwright test tests/e2e/dashboard/
```

### E2E with Browser UI
```bash
# See tests run in browser
npm run test:e2e:headed

# Specific test with UI
npx playwright test tests/e2e/golden-path.spec.ts --headed
```

### E2E Debug Mode
```bash
# Interactive debugging
npm run test:e2e:debug

# Specific test debug
npx playwright test tests/e2e/golden-path.spec.ts --debug
```

### E2E with Trace
```bash
# Generate trace for debugging
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

---

## 4️⃣ Accessibility Tests (axe-core)

### Run All Accessibility Tests
```bash
npm run test:accessibility
```

**Tests**:
- Button accessibility
- Form accessibility
- Input accessibility
- Modal accessibility
- Navigation accessibility
- Table accessibility
- WCAG compliance

### Specific Accessibility Tests
```bash
# Buttons only
npx playwright test tests/accessibility/button.spec.ts

# Forms only
npx playwright test tests/accessibility/form.spec.ts

# WCAG compliance
npx playwright test tests/accessibility/wcag-compliance.spec.ts
```

### Generate Accessibility Report
```bash
# Run with reporter
npx playwright test tests/accessibility/ --reporter=html

# Open report
npx playwright show-report
```

---

## 5️⃣ Full Test Suite

### Run Everything
```bash
npm run test:all
```

**Execution Order**:
1. Unit tests (Jest)
2. Integration tests (Playwright)
3. E2E tests (Playwright)
4. Accessibility tests (axe-core)

**Duration**: ~20-30 minutes

### CI Mode (GitHub Actions)
```bash
npm run test:ci
```

**Optimizations**:
- No parallelization (workers=1)
- 2 retries on failure
- JSON/HTML reports
- Coverage collection

---

## 6️⃣ Contract Verification Tests

### Schema Verification
```bash
npm run contracts:verify-schema
```

**Purpose**: Verify frontend types match database schema.

### RPC Signature Verification
```bash
npm run contracts:verify
```

**Purpose**: Verify RPC calls match server signatures.

### Frontend Query Scan
```bash
npm run contracts:scan
```

**Purpose**: Identify all database queries in frontend code.

### Full Contract Suite
```bash
npm run test:contracts
```

**Runs**: Schema snapshot, verification, and frontend scan.

---

## 7️⃣ Database Tests

### Smoke Test
```bash
npm run db:smoke-test
```

**Tests**:
- Database connectivity
- Table existence
- RPC function availability
- View accessibility
- RLS policies active

### CI Smoke Test
```bash
npm run db:smoke-test:ci
```

**Purpose**: Fast database validation in CI/CD.

---

## 8️⃣ Audit & Integrity Tests

### Full Audit Suite
```bash
npm run audit:full
```

**Runs**:
- Playwright audit
- Lighthouse CI audit
- Header security audit
- RLS policy audit

### RLS Audit
```bash
npm run audit:rls
```

**Purpose**: Verify Row-Level Security policies on all tables.

### SQL Hygiene Check
```bash
npm run sql:hygiene
```

**Purpose**: Detect anti-patterns in SQL code.

---

## 📊 Test Reports

### View HTML Report (Playwright)
```bash
npx playwright show-report
```

**Location**: `test-reports/playwright/index.html`

### View Coverage Report (Jest)
```bash
open coverage/lcov-report/index.html
```

**Location**: `coverage/lcov-report/index.html`

### Generate Audit Report
```bash
npm run audit:report
```

**Location**: `audit-reports/`

---

## 🐛 Debugging Failed Tests

### Jest Tests
```bash
# Run with verbose output
npx jest --verbose

# Run specific test file
npx jest tests/unit/positions.test.js --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest tests/unit/positions.test.js
```

### Playwright Tests
```bash
# Debug mode (interactive)
npx playwright test tests/e2e/golden-path.spec.ts --debug

# Generate trace
npx playwright test tests/e2e/golden-path.spec.ts --trace on

# View trace
npx playwright show-trace trace.zip

# Take screenshots
npx playwright test --screenshot=on

# Record video
npx playwright test --video=on
```

---

## 🔄 Continuous Testing (Watch Mode)

### Jest Watch
```bash
npm run test:watch
```

**Features**:
- Re-runs on file changes
- Interactive filtering
- Coverage updates

### Playwright UI Mode
```bash
npx playwright test --ui
```

**Features**:
- Visual test runner
- Time travel debugging
- Live trace view

---

## ✅ Pre-Deployment Checklist

Run this before deploying to production:

```bash
#!/bin/bash
# Complete test suite for deployment

set -e

echo "🧪 Running pre-deployment tests..."

# 1. Fix any Jest/Vitest issues
echo "1️⃣ Checking Jest/Vitest compatibility..."
npm test 2>&1 | grep -q "Test Suites.*passed" || {
  echo "❌ Unit tests failing - run ./scripts/fix-test-imports.sh"
  exit 1
}

# 2. Unit tests with coverage
echo "2️⃣ Running unit tests with coverage..."
npm run test:coverage
COVERAGE=$(grep -o '[0-9]*%' coverage/lcov-report/index.html | head -1 | sed 's/%//')
if [ "$COVERAGE" -lt 80 ]; then
  echo "⚠️  Coverage is ${COVERAGE}% (target: >80%)"
fi

# 3. Integration tests
echo "3️⃣ Running integration tests..."
npm run test:integration

# 4. E2E golden path
echo "4️⃣ Running E2E golden path..."
npm run test:golden

# 5. Accessibility tests
echo "5️⃣ Running accessibility tests..."
npm run test:accessibility

# 6. Contract verification
echo "6️⃣ Verifying contracts..."
npm run test:contracts

# 7. Database smoke test
echo "7️⃣ Running database smoke test..."
npm run db:smoke-test

echo ""
echo "✅ All tests passed! Ready for deployment."
```

---

## 📝 Test Result Interpretation

### Jest Exit Codes
- `0`: All tests passed
- `1`: Test failures or errors
- `130`: Interrupted (Ctrl+C)

### Playwright Exit Codes
- `0`: All tests passed
- `1`: Test failures
- `2`: No tests found

### Coverage Thresholds
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  },
  './src/services/': {
    statements: 100,  // Critical services: 100%
    branches: 100,
    functions: 100,
    lines: 100
  }
}
```

---

## 🆘 Common Issues

### Issue: "Cannot find module '@jest/globals'"
```bash
npm install --save-dev @jest/globals
```

### Issue: "Playwright browsers not installed"
```bash
npx playwright install --with-deps
```

### Issue: "Port 8080 already in use"
```bash
# Kill existing server
pkill -f "vite"

# Or use different port
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e
```

### Issue: "Test timeout"
```bash
# Increase timeout in test file
test.setTimeout(60000); // 60 seconds

# Or in config
// playwright.config.ts
timeout: 60000
```

### Issue: "Flaky tests"
```bash
# Run with retries
npx playwright test --retries=3

# Run serially (no parallel)
npx playwright test --workers=1
```

---

## 📚 Additional Resources

- **Playwright Docs**: https://playwright.dev/
- **Jest Docs**: https://jestjs.io/
- **axe-core Docs**: https://github.com/dequelabs/axe-core
- **Testing Library**: https://testing-library.com/

---

**Last Updated**: 2026-01-27
**Platform Version**: 1.0.2
