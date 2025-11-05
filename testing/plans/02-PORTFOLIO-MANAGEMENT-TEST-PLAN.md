# Portfolio Management Test Plan

## Module Overview

**Module:** Portfolio Management & Calculations
**Severity:** CRITICAL (financial calculations, real money)
**Risk Level:** HIGHEST (incorrect calculations = financial loss)
**Test Coverage Target:** 100% (zero tolerance for calculation errors)

---

## 1. Unit Tests - Financial Calculations

### 1.1 Net Asset Value (NAV) Calculation

**Formula:** NAV = (Total Assets - Total Liabilities) / Total Shares

**File:** `lib/calculations/navCalculation.ts`

| Test Case | Inputs | Expected Output | Priority |
|-----------|--------|----------------|----------|
| Basic NAV | Assets: $1,000,000<br>Liabilities: $50,000<br>Shares: 95,000 | $10.00 per share | P0 |
| Zero liabilities | Assets: $500,000<br>Liabilities: $0<br>Shares: 50,000 | $10.00 per share | P0 |
| Fractional shares | Assets: $100,000<br>Liabilities: $0<br>Shares: 33,333.33 | $3.00 per share | P0 |
| Decimal precision | Assets: $1,234,567.89<br>Liabilities: $123,456.78<br>Shares: 111,111.11 | Exact to 4 decimals | P0 |
| Negative NAV | Assets: $50,000<br>Liabilities: $100,000<br>Shares: 10,000 | Error: Invalid NAV | P1 |
| Zero shares | Assets: $100,000<br>Liabilities: $0<br>Shares: 0 | Error: Division by zero | P1 |
| Very large numbers | Assets: $999,999,999.99<br>Liabilities: $0<br>Shares: 1,000,000 | Correct result | P1 |

**Test File:** `tests/unit/calculations/navCalculation.test.ts`

```typescript
import { calculateNAV } from '@/lib/calculations/navCalculation';
import { Decimal } from 'decimal.js';

describe('NAV Calculation', () => {
  it('should calculate basic NAV correctly', () => {
    const result = calculateNAV({
      totalAssets: new Decimal(1000000),
      totalLiabilities: new Decimal(50000),
      totalShares: new Decimal(95000),
    });

    expect(result.toNumber()).toBe(10.0);
  });

  it('should handle decimal precision correctly', () => {
    const result = calculateNAV({
      totalAssets: new Decimal('1234567.89'),
      totalLiabilities: new Decimal('123456.78'),
      totalShares: new Decimal('111111.11'),
    });

    // Result should be 9.9999999999...
    expect(result.toFixed(4)).toBe('10.0000');
  });

  it('should throw error for negative NAV', () => {
    expect(() => {
      calculateNAV({
        totalAssets: new Decimal(50000),
        totalLiabilities: new Decimal(100000),
        totalShares: new Decimal(10000),
      });
    }).toThrow('NAV cannot be negative');
  });

  it('should throw error for zero shares', () => {
    expect(() => {
      calculateNAV({
        totalAssets: new Decimal(100000),
        totalLiabilities: new Decimal(0),
        totalShares: new Decimal(0),
      });
    }).toThrow('Total shares must be greater than zero');
  });

  it('should handle very large numbers without overflow', () => {
    const result = calculateNAV({
      totalAssets: new Decimal('999999999.99'),
      totalLiabilities: new Decimal(0),
      totalShares: new Decimal(1000000),
    });

    expect(result.toFixed(2)).toBe('999.99');
  });
});
```

### 1.2 Internal Rate of Return (IRR) Calculation

**Description:** Calculate annualized return considering cash flows

**File:** `lib/calculations/irrCalculation.ts`

| Test Case | Cash Flows | Expected IRR | Priority |
|-----------|------------|--------------|----------|
| Single investment | [-$10,000, $11,000] | 10% | P0 |
| Multiple investments | [-$10k, -$5k, $20k] | ~12.94% | P0 |
| No return | [-$10,000, $10,000] | 0% | P0 |
| Loss scenario | [-$10,000, $8,000] | -20% | P0 |
| No cash flows | [] | Error | P1 |
| Single cash flow | [-$10,000] | Error | P1 |

**Test File:** `tests/unit/calculations/irrCalculation.test.ts`

```typescript
import { calculateIRR } from '@/lib/calculations/irrCalculation';

describe('IRR Calculation', () => {
  it('should calculate IRR for single investment', () => {
    const cashFlows = [-10000, 11000];
    const dates = [
      new Date('2024-01-01'),
      new Date('2025-01-01'),
    ];

    const irr = calculateIRR(cashFlows, dates);
    expect(irr).toBeCloseTo(0.10, 4); // 10%
  });

  it('should handle multiple investments', () => {
    const cashFlows = [-10000, -5000, 20000];
    const dates = [
      new Date('2024-01-01'),
      new Date('2024-07-01'),
      new Date('2025-01-01'),
    ];

    const irr = calculateIRR(cashFlows, dates);
    expect(irr).toBeCloseTo(0.1294, 2); // ~12.94%
  });

  it('should return 0 for break-even scenario', () => {
    const cashFlows = [-10000, 10000];
    const dates = [
      new Date('2024-01-01'),
      new Date('2025-01-01'),
    ];

    const irr = calculateIRR(cashFlows, dates);
    expect(irr).toBeCloseTo(0, 4);
  });

  it('should throw error for insufficient cash flows', () => {
    expect(() => {
      calculateIRR([-10000], [new Date()]);
    }).toThrow('At least two cash flows required');
  });
});
```

### 1.3 Portfolio Allocation Calculation

**Description:** Calculate percentage allocation of each asset

**Test Cases:**

| Test Case | Holdings | Expected Allocations | Priority |
|-----------|----------|---------------------|----------|
| Equal holdings | 2 assets @ $50k each | 50% / 50% | P0 |
| Unequal holdings | Asset A: $70k, B: $30k | 70% / 30% | P0 |
| Single asset | 1 asset @ $100k | 100% | P0 |
| Zero value asset | Asset A: $100k, B: $0 | 100% / 0% | P1 |
| Empty portfolio | No holdings | N/A or 0% | P1 |

**Test File:** `tests/unit/calculations/allocationCalculation.test.ts`

```typescript
import { calculateAllocation } from '@/lib/calculations/allocationCalculation';

describe('Portfolio Allocation', () => {
  it('should calculate equal allocations', () => {
    const holdings = [
      { assetId: 'A', value: 50000 },
      { assetId: 'B', value: 50000 },
    ];

    const result = calculateAllocation(holdings);

    expect(result).toEqual([
      { assetId: 'A', value: 50000, allocation: 0.5 },
      { assetId: 'B', value: 50000, allocation: 0.5 },
    ]);
  });

  it('should handle unequal allocations', () => {
    const holdings = [
      { assetId: 'A', value: 70000 },
      { assetId: 'B', value: 30000 },
    ];

    const result = calculateAllocation(holdings);

    expect(result[0].allocation).toBeCloseTo(0.7, 4);
    expect(result[1].allocation).toBeCloseTo(0.3, 4);
  });

  it('should handle single asset', () => {
    const holdings = [
      { assetId: 'A', value: 100000 },
    ];

    const result = calculateAllocation(holdings);

    expect(result[0].allocation).toBe(1.0);
  });

  it('should sum to 100%', () => {
    const holdings = [
      { assetId: 'A', value: 33333 },
      { assetId: 'B', value: 33333 },
      { assetId: 'C', value: 33334 },
    ];

    const result = calculateAllocation(holdings);
    const totalAllocation = result.reduce((sum, h) => sum + h.allocation, 0);

    expect(totalAllocation).toBeCloseTo(1.0, 10);
  });
});
```

### 1.4 Realized/Unrealized Gains Calculation

**Description:** Calculate gains/losses for tax reporting

**Test File:** `tests/unit/calculations/gainsCalculation.test.ts`

```typescript
import { calculateGains } from '@/lib/calculations/gainsCalculation';

describe('Gains Calculation', () => {
  it('should calculate realized gains on sale', () => {
    const costBasis = 10000;
    const salePrice = 12000;
    const quantity = 100;

    const result = calculateGains({
      costBasis,
      salePrice,
      quantity,
      type: 'realized',
    });

    expect(result.gain).toBe(2000);
    expect(result.gainPercent).toBeCloseTo(0.20, 4);
  });

  it('should calculate unrealized gains', () => {
    const costBasis = 10000;
    const currentValue = 11500;
    const quantity = 100;

    const result = calculateGains({
      costBasis,
      currentValue,
      quantity,
      type: 'unrealized',
    });

    expect(result.gain).toBe(1500);
    expect(result.gainPercent).toBeCloseTo(0.15, 4);
  });

  it('should handle losses', () => {
    const costBasis = 10000;
    const salePrice = 8000;
    const quantity = 100;

    const result = calculateGains({
      costBasis,
      salePrice,
      quantity,
      type: 'realized',
    });

    expect(result.gain).toBe(-2000);
    expect(result.gainPercent).toBeCloseTo(-0.20, 4);
  });
});
```

---

## 2. Integration Tests

### 2.1 Portfolio Value Update on Deposit

**Scenario:** User deposits funds, portfolio value updates correctly

**Test Steps:**
1. Record initial portfolio value
2. Execute deposit transaction
3. Wait for transaction to complete
4. Refresh portfolio data
5. Verify portfolio value increased by deposit amount
6. Verify transaction recorded in history
7. Verify allocation recalculated

**Assertions:**
- Portfolio value = previous value + deposit amount
- Transaction logged with correct timestamp
- Cash allocation percentage updated
- Performance metrics recalculated

**Test File:** `tests/integration/portfolio/depositUpdate.test.ts`

```typescript
import { supabase } from '@/lib/supabaseClient';
import { createDeposit } from '@/lib/transactions';
import { getPortfolioValue } from '@/lib/portfolio';

describe('Portfolio Update on Deposit', () => {
  it('should update portfolio value after deposit', async () => {
    const userId = 'test-user-001';

    // Get initial portfolio value
    const initialValue = await getPortfolioValue(userId);

    // Execute deposit
    const depositAmount = 5000;
    const transaction = await createDeposit({
      userId,
      amount: depositAmount,
      paymentMethod: 'bank_transfer',
    });

    expect(transaction.status).toBe('completed');

    // Get updated portfolio value
    const updatedValue = await getPortfolioValue(userId);

    // Verify increase
    expect(updatedValue).toBe(initialValue + depositAmount);

    // Verify transaction logged
    const { data: txHistory } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction.id)
      .single();

    expect(txHistory).toBeTruthy();
    expect(txHistory.amount).toBe(depositAmount);
    expect(txHistory.type).toBe('deposit');
  });
});
```

### 2.2 Portfolio Performance Calculation

**Scenario:** Calculate historical performance over time

**Test Steps:**
1. Seed historical price data
2. Seed historical holdings
3. Calculate performance for 1 day, 1 week, 1 month, 1 year
4. Verify calculations against expected values
5. Test with various start dates

**Test File:** `tests/integration/portfolio/performanceCalculation.test.ts`

```typescript
import { calculatePerformance } from '@/lib/portfolio/performance';

describe('Portfolio Performance Calculation', () => {
  beforeEach(async () => {
    // Seed test data
    await seedHistoricalData();
  });

  it('should calculate 1-day performance', async () => {
    const userId = 'test-user-001';
    const performance = await calculatePerformance(userId, '1D');

    expect(performance).toMatchObject({
      period: '1D',
      startValue: expect.any(Number),
      endValue: expect.any(Number),
      absoluteReturn: expect.any(Number),
      percentReturn: expect.any(Number),
    });

    // Verify calculation
    const expectedReturn =
      (performance.endValue - performance.startValue) / performance.startValue;
    expect(performance.percentReturn).toBeCloseTo(expectedReturn, 6);
  });

  it('should calculate YTD performance', async () => {
    const userId = 'test-user-001';
    const performance = await calculatePerformance(userId, 'YTD');

    expect(performance.period).toBe('YTD');
    expect(performance.startDate).toBe('2025-01-01');
  });

  it('should handle portfolio with no previous data', async () => {
    const newUserId = 'new-user-001';
    const performance = await calculatePerformance(newUserId, '1D');

    expect(performance.absoluteReturn).toBe(0);
    expect(performance.percentReturn).toBe(0);
  });
});
```

---

## 3. E2E Tests

### 3.1 Complete Portfolio Journey

**Test File:** `tests/e2e/portfolio/completeJourney.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Portfolio Management Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[name="email"]', 'investor1@test.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display portfolio dashboard with correct values', async ({ page }) => {
    // Navigate to portfolio
    await page.click('a:has-text("Portfolio")');
    await expect(page).toHaveURL('/portfolio');

    // Verify total value displayed
    const totalValue = await page.locator('[data-testid="portfolio-total-value"]').textContent();
    expect(totalValue).toMatch(/\$[\d,]+\.\d{2}/);

    // Verify allocation chart visible
    await expect(page.locator('[data-testid="allocation-chart"]')).toBeVisible();

    // Verify holdings table
    await expect(page.locator('[data-testid="holdings-table"]')).toBeVisible();
    const holdings = await page.locator('[data-testid="holdings-table"] tbody tr').count();
    expect(holdings).toBeGreaterThan(0);
  });

  test('should update portfolio after deposit', async ({ page }) => {
    // Get initial value
    await page.goto('/portfolio');
    const initialValueText = await page.locator('[data-testid="portfolio-total-value"]').textContent();
    const initialValue = parseFloat(initialValueText!.replace(/[$,]/g, ''));

    // Navigate to deposit
    await page.click('a:has-text("Deposit")');
    await expect(page).toHaveURL('/deposit');

    // Fill deposit form
    await page.fill('[name="amount"]', '1000');
    await page.selectOption('[name="paymentMethod"]', 'bank_transfer');
    await page.fill('[name="bankAccount"]', '****1234');

    // Submit deposit
    await page.click('button:has-text("Submit Deposit")');

    // Wait for confirmation
    await expect(page.locator('text=Deposit submitted successfully')).toBeVisible();

    // Navigate back to portfolio
    await page.click('a:has-text("Portfolio")');

    // Wait for portfolio to update (may take a few seconds)
    await page.waitForTimeout(2000);
    await page.reload();

    // Verify updated value
    const updatedValueText = await page.locator('[data-testid="portfolio-total-value"]').textContent();
    const updatedValue = parseFloat(updatedValueText!.replace(/[$,]/g, ''));

    expect(updatedValue).toBeCloseTo(initialValue + 1000, 2);
  });

  test('should display performance chart with correct data', async ({ page }) => {
    await page.goto('/portfolio/performance');

    // Verify chart loaded
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();

    // Switch to different time periods
    await page.click('button:has-text("1M")');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="performance-1M"]')).toBeVisible();

    await page.click('button:has-text("1Y")');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="performance-1Y"]')).toBeVisible();

    // Verify performance metrics
    const returnValue = await page.locator('[data-testid="total-return"]').textContent();
    expect(returnValue).toMatch(/[+-]?\d+\.\d{2}%/);
  });

  test('should export portfolio statement', async ({ page }) => {
    await page.goto('/portfolio');

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Statement")');
    const download = await downloadPromise;

    // Verify file name and type
    expect(download.suggestedFilename()).toMatch(/portfolio-statement-.*\.pdf/);

    // Save and verify file exists
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});
```

### 3.2 iOS Portfolio Tests

**Test File:** `IndigoInvestorUITests/PortfolioUITests.swift`

```swift
import XCTest

class PortfolioUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI-Testing"]
        app.launch()

        // Login
        loginAsTestUser()
    }

    func testPortfolioDashboardDisplay() {
        // Navigate to Portfolio tab
        app.tabBars.buttons["Portfolio"].tap()

        // Verify total value displayed
        XCTAssertTrue(app.staticTexts.matching(identifier: "portfolioTotalValue").element.exists)

        // Verify allocation chart
        XCTAssertTrue(app.otherElements["allocationChart"].exists)

        // Verify holdings list
        let holdingsList = app.tables["holdingsList"]
        XCTAssertTrue(holdingsList.exists)
        XCTAssertGreaterThan(holdingsList.cells.count, 0)
    }

    func testPortfolioPerformanceChart() {
        app.tabBars.buttons["Portfolio"].tap()
        app.buttons["Performance"].tap()

        // Verify chart loaded
        XCTAssertTrue(app.otherElements["performanceChart"].waitForExistence(timeout: 3))

        // Tap different time periods
        app.buttons["1M"].tap()
        XCTAssertTrue(app.otherElements["performanceChart"].waitForExistence(timeout: 2))

        app.buttons["1Y"].tap()
        XCTAssertTrue(app.otherElements["performanceChart"].waitForExistence(timeout: 2))

        // Verify metrics displayed
        XCTAssertTrue(app.staticTexts["totalReturn"].exists)
        XCTAssertTrue(app.staticTexts["totalReturnPercentage"].exists)
    }

    func testAssetDetail() {
        app.tabBars.buttons["Portfolio"].tap()

        // Tap first holding
        let holdingsList = app.tables["holdingsList"]
        holdingsList.cells.element(boundBy: 0).tap()

        // Verify detail view
        XCTAssertTrue(app.navigationBars["Asset Detail"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.staticTexts["assetName"].exists)
        XCTAssertTrue(app.staticTexts["currentValue"].exists)
        XCTAssertTrue(app.staticTexts["costBasis"].exists)
        XCTAssertTrue(app.staticTexts["unrealizedGain"].exists)
    }
}
```

---

## 4. Data Integrity Tests

### 4.1 Portfolio Balance Consistency

**Test:** Verify portfolio balance matches sum of holdings

```typescript
describe('Portfolio Balance Consistency', () => {
  it('should match sum of individual holdings', async () => {
    const userId = 'test-user-001';

    // Get portfolio total
    const portfolio = await getPortfolio(userId);
    const totalValue = portfolio.totalValue;

    // Get all holdings
    const holdings = await getHoldings(userId);
    const sumOfHoldings = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    // Should match within rounding tolerance
    expect(Math.abs(totalValue - sumOfHoldings)).toBeLessThan(0.01);
  });

  it('should reconcile with transaction history', async () => {
    const userId = 'test-user-001';

    // Get all deposits
    const deposits = await getTransactions(userId, 'deposit');
    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);

    // Get all withdrawals
    const withdrawals = await getTransactions(userId, 'withdrawal');
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);

    // Get current portfolio value
    const currentValue = await getPortfolioValue(userId);

    // Get realized gains/losses
    const realizedGains = await getRealizedGains(userId);

    // Balance check
    const expectedValue = totalDeposits - totalWithdrawals + realizedGains;

    // Should match within tolerance (accounting for unrealized gains)
    // This is simplified; actual calculation more complex
    expect(currentValue).toBeGreaterThanOrEqual(expectedValue - 1000);
  });
});
```

### 4.2 Historical Data Integrity

**Test:** Verify no data loss or corruption over time

```typescript
describe('Historical Data Integrity', () => {
  it('should maintain consistent historical NAV', async () => {
    const userId = 'test-user-001';

    // Get historical NAV data
    const navHistory = await getHistoricalNAV(userId, '1Y');

    // Verify no gaps in data
    for (let i = 1; i < navHistory.length; i++) {
      const prevDate = new Date(navHistory[i - 1].date);
      const currDate = new Date(navHistory[i].date);
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      // Should be consecutive days (allowing for weekends/holidays)
      expect(dayDiff).toBeLessThanOrEqual(3);
    }

    // Verify no negative NAV values
    navHistory.forEach(point => {
      expect(point.nav).toBeGreaterThan(0);
    });

    // Verify reasonable changes (no sudden 10x jumps)
    for (let i = 1; i < navHistory.length; i++) {
      const changePercent = Math.abs(
        (navHistory[i].nav - navHistory[i - 1].nav) / navHistory[i - 1].nav
      );
      expect(changePercent).toBeLessThan(0.5); // < 50% daily change
    }
  });
});
```

---

## 5. Performance Tests

### 5.1 Portfolio Load Time

**Target:** < 1 second to load portfolio dashboard

**Test File:** `tests/performance/portfolioLoadTime.js` (k6)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1 second
  },
};

export default function () {
  const token = getAuthToken(); // Helper function

  const res = http.get('https://api.indigo.com/portfolio', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'load time < 1s': (r) => r.timings.duration < 1000,
    'portfolio data present': (r) => {
      const data = JSON.parse(r.body);
      return data.totalValue !== undefined;
    },
  });

  sleep(1);
}
```

### 5.2 Large Portfolio Performance

**Test:** Verify performance with 100+ holdings

```typescript
describe('Large Portfolio Performance', () => {
  it('should load portfolio with 100+ holdings in < 2s', async () => {
    // Create test user with 150 holdings
    const userId = await createLargePortfolio(150);

    const startTime = Date.now();
    const portfolio = await getPortfolio(userId);
    const endTime = Date.now();

    const loadTime = endTime - startTime;

    expect(loadTime).toBeLessThan(2000);
    expect(portfolio.holdings.length).toBe(150);
  });
});
```

---

## 6. Edge Cases & Error Handling

### 6.1 Edge Case Test Matrix

| Scenario | Expected Behavior | Test Priority |
|----------|------------------|---------------|
| Portfolio with 0 value | Display $0.00, no division errors | P1 |
| Negative asset value | Error or flag for review | P1 |
| Missing price data | Use last known price or mark stale | P0 |
| Concurrent deposits | Both recorded, no race condition | P0 |
| Extremely large portfolio | Performance degrades gracefully | P2 |
| Currency precision loss | No rounding errors in calculations | P0 |
| Historical data gap | Interpolate or mark as missing | P2 |

### 6.2 Error Handling Tests

```typescript
describe('Portfolio Error Handling', () => {
  it('should handle missing price data gracefully', async () => {
    const userId = 'test-user-missing-prices';

    // Portfolio with asset that has no recent price
    const portfolio = await getPortfolio(userId);

    // Should not crash
    expect(portfolio).toBeTruthy();

    // Should mark assets with stale prices
    const stalePriceAssets = portfolio.holdings.filter(h => h.priceStale);
    expect(stalePriceAssets.length).toBeGreaterThan(0);
  });

  it('should prevent concurrent modification conflicts', async () => {
    const userId = 'test-user-001';

    // Simulate two simultaneous deposits
    const deposit1 = createDeposit({ userId, amount: 1000 });
    const deposit2 = createDeposit({ userId, amount: 2000 });

    const [result1, result2] = await Promise.all([deposit1, deposit2]);

    // Both should succeed
    expect(result1.status).toBe('completed');
    expect(result2.status).toBe('completed');

    // Portfolio should reflect both
    const finalValue = await getPortfolioValue(userId);
    expect(finalValue).toBe(initialValue + 3000);
  });
});
```

---

## 7. Snapshot & Visual Regression Tests

### 7.1 Portfolio Dashboard Visual Tests

**Test File:** `tests/visual/portfolioDashboard.spec.ts`

```typescript
import { test } from '@playwright/test';

test.describe('Portfolio Visual Regression', () => {
  test('portfolio dashboard snapshot', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('portfolio-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('portfolio performance chart snapshot', async ({ page }) => {
    await page.goto('/portfolio/performance');
    await page.waitForSelector('[data-testid="performance-chart"]');

    await expect(page.locator('[data-testid="performance-chart"]'))
      .toHaveScreenshot('performance-chart.png');
  });
});
```

---

## 8. Test Data Fixtures

### 8.1 Sample Portfolio Data

**File:** `tests/fixtures/portfolioData.json`

```json
{
  "portfolios": [
    {
      "userId": "user-001",
      "totalValue": 125000.00,
      "cashBalance": 5000.00,
      "investedValue": 120000.00,
      "totalGain": 15000.00,
      "totalGainPercent": 0.1364,
      "holdings": [
        {
          "assetId": "asset-001",
          "assetName": "Fund A",
          "quantity": 1000,
          "costBasis": 50000.00,
          "currentValue": 60000.00,
          "unrealizedGain": 10000.00,
          "allocation": 0.48
        },
        {
          "assetId": "asset-002",
          "assetName": "Fund B",
          "quantity": 500,
          "costBasis": 50000.00,
          "currentValue": 55000.00,
          "unrealizedGain": 5000.00,
          "allocation": 0.44
        }
      ],
      "historicalNAV": [
        { "date": "2025-01-01", "nav": 10.00 },
        { "date": "2025-01-02", "nav": 10.05 },
        { "date": "2025-01-03", "nav": 10.12 }
      ]
    }
  ]
}
```

---

## 9. Test Execution Matrix

| Test Type | Frequency | Duration | Blocker |
|-----------|-----------|----------|---------|
| Unit Tests - Calculations | Every commit | < 5s | Yes |
| Integration - Value Updates | Every PR | < 1 min | Yes |
| E2E - Portfolio Journey | Every merge | < 3 min | Yes |
| Data Integrity Tests | Daily | < 10 min | No |
| Performance Tests | Weekly | < 15 min | No |
| Visual Regression | Every PR | < 2 min | No |

---

## 10. Acceptance Criteria

Portfolio module is production-ready when:

- [ ] 100% unit test coverage on calculations
- [ ] All financial calculations validated against manual calculations
- [ ] No rounding errors > $0.01
- [ ] Portfolio loads in < 1 second
- [ ] Data integrity tests pass 100%
- [ ] No flaky tests
- [ ] Visual regression tests baseline established
- [ ] Performance tests meet SLAs
- [ ] Edge cases documented and handled
- [ ] Audit trail for all value changes
- [ ] Independent financial audit passed

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
**Owner:** QA Team - Portfolio Module
**Approvers:** CFO, CTO, Head of Finance
