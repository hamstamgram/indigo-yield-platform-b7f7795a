# Performance Metrics Test Specification

## Document Control
| Version | Date | Author | Reviewers |
|---------|------|--------|-----------|
| 1.0 | 2026-01-28 | Engineering | CTO, CFO, Lead Architect |

---

## Executive Summary

### Business Context (CTO Perspective)
The Performance page is a **critical investor-facing feature** that displays investment returns. Incorrect data presentation could result in:
- Regulatory violations (SEC, FINRA reporting requirements)
- Investor lawsuits for misrepresentation
- Reputational damage affecting AUM growth
- Loss of investor trust and mass redemptions

### Financial Accuracy Requirements (CFO Perspective)
Performance metrics must adhere to:
- **GIPS (Global Investment Performance Standards)** compliance
- **Modified Dietz Method** for time-weighted return calculations
- **Audit trail requirements** for all displayed figures
- **Reconciliation** with official monthly statements within 0.01% tolerance

---

## Architecture Overview

### Data Flow
```
investor_yield_events (Source of Truth)
         ↓
performanceService.getPerAssetStats()
         ↓
    Aggregation Layer (MTD/QTD/YTD/ITD)
         ↓
    usePerAssetStats() Hook
         ↓
    InvestorPerformancePage Component
         ↓
    PerformanceCard Display
```

### Critical Tables
| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `investor_yield_events` | Individual yield credits | investor_id = auth.uid() |
| `investor_positions` | Current balances | investor_id = auth.uid() |
| `investor_fund_performance` | Pre-calculated snapshots | investor_id = auth.uid() |

---

## Test Categories

### 1. Unit Tests

#### 1.1 Yield Aggregation Logic
```typescript
describe('performanceService.getPerAssetStats', () => {

  // MTD Calculation Tests
  describe('MTD (Month-to-Date) Aggregation', () => {
    it('should include only yields from current calendar month', async () => {
      // Given: Yields on Jan 5, Jan 15, Dec 28 (previous month)
      // When: getPerAssetStats called in January
      // Then: MTD includes only Jan 5 + Jan 15 yields
    });

    it('should handle month boundary at midnight UTC correctly', async () => {
      // Given: Yield at 2026-01-31T23:59:59Z and 2026-02-01T00:00:00Z
      // When: getPerAssetStats called on Feb 1
      // Then: Only Feb 1 yield in MTD
    });

    it('should return 0 for MTD when no yields in current month', async () => {
      // Given: All yields in previous months
      // When: getPerAssetStats called
      // Then: MTD netIncome = 0, rateOfReturn = 0
    });

    it('should handle first day of month correctly', async () => {
      // Given: System date is Jan 1
      // When: getPerAssetStats called
      // Then: MTD should be 0 (no yields possible yet)
    });
  });

  // QTD Calculation Tests
  describe('QTD (Quarter-to-Date) Aggregation', () => {
    it('should aggregate Q1 yields (Jan-Mar) correctly', async () => {
      // Given: Yields in Jan, Feb, Mar, and April
      // When: getPerAssetStats called in March
      // Then: QTD includes Jan + Feb + Mar only
    });

    it('should aggregate Q2 yields (Apr-Jun) correctly', async () => {
      // Given: Yields in Mar, Apr, May
      // When: getPerAssetStats called in May
      // Then: QTD includes Apr + May only
    });

    it('should aggregate Q3 yields (Jul-Sep) correctly', async () => {
      // Given: Yields in Jun, Jul, Aug
      // When: getPerAssetStats called in August
      // Then: QTD includes Jul + Aug only
    });

    it('should aggregate Q4 yields (Oct-Dec) correctly', async () => {
      // Given: Yields in Sep, Oct, Nov
      // When: getPerAssetStats called in November
      // Then: QTD includes Oct + Nov only
    });

    it('should handle quarter boundary correctly', async () => {
      // Given: Yield on Mar 31 and Apr 1
      // When: getPerAssetStats called in April
      // Then: Mar 31 NOT in QTD, Apr 1 IS in QTD
    });
  });

  // YTD Calculation Tests
  describe('YTD (Year-to-Date) Aggregation', () => {
    it('should include only current year yields', async () => {
      // Given: Yields in Dec 2025, Jan 2026, Feb 2026
      // When: getPerAssetStats called in Feb 2026
      // Then: YTD includes Jan + Feb 2026 only
    });

    it('should handle year boundary at midnight UTC', async () => {
      // Given: Yield at 2025-12-31T23:59:59Z and 2026-01-01T00:00:00Z
      // When: getPerAssetStats called in 2026
      // Then: Only 2026 yield in YTD
    });

    it('should handle leap year correctly', async () => {
      // Given: Yields on Feb 28 and Feb 29 in leap year
      // When: getPerAssetStats called
      // Then: Both yields included correctly
    });
  });

  // ITD Calculation Tests
  describe('ITD (Inception-to-Date) Aggregation', () => {
    it('should include ALL historical yields regardless of date', async () => {
      // Given: Yields from 2020, 2021, 2022, 2023, 2024, 2025, 2026
      // When: getPerAssetStats called
      // Then: ITD includes sum of ALL yields
    });

    it('should handle investor with single historical yield', async () => {
      // Given: One yield from 3 years ago
      // When: getPerAssetStats called
      // Then: ITD shows that single yield
    });

    it('should handle investor with yields across multiple funds', async () => {
      // Given: USDT yields + BTC yields + ETH yields
      // When: getPerAssetStats called
      // Then: Each fund shows its own ITD total
    });
  });

  // Rate of Return Calculation Tests
  describe('Rate of Return Calculation', () => {
    it('should calculate RoR using Modified Dietz formula', async () => {
      // Formula: RoR = (Net Income / (Beginning Balance + Weighted Cash Flows)) * 100
      // Given: Beginning = 10000, Net Income = 100
      // When: RoR calculated
      // Then: RoR = (100 / 10000) * 100 = 1.00%
    });

    it('should handle zero beginning balance (new investor)', async () => {
      // Given: Beginning balance = 0, Net Income = 100
      // When: RoR calculated
      // Then: RoR = 100% (or special handling)
    });

    it('should handle negative net income (fees > gross)', async () => {
      // Given: Net Income = -50, Beginning Balance = 10000
      // When: RoR calculated
      // Then: RoR = -0.50%
    });

    it('should handle very small balances without precision loss', async () => {
      // Given: Balance = 0.00000001 BTC, Net Income = 0.000000001 BTC
      // When: RoR calculated
      // Then: Correct percentage with proper decimal handling
    });

    it('should handle very large balances without overflow', async () => {
      // Given: Balance = 999,999,999.99 USDT, Net Income = 10,000,000
      // When: RoR calculated
      // Then: Correct percentage without numeric overflow
    });
  });
});
```

#### 1.2 Visibility Scope Filtering
```typescript
describe('Visibility Scope Filtering', () => {
  it('should only include investor_visible yields', async () => {
    // Given: Yields with visibility_scope = 'investor_visible' and 'admin_only'
    // When: getPerAssetStats called by investor
    // Then: Only investor_visible yields included
  });

  it('should exclude voided yields', async () => {
    // Given: Valid yield + voided yield (is_voided = true)
    // When: getPerAssetStats called
    // Then: Voided yield NOT included
  });

  it('should handle yield that was voided and re-issued', async () => {
    // Given: Original yield (voided) + corrected yield
    // When: getPerAssetStats called
    // Then: Only corrected yield included
  });
});
```

---

### 2. Integration Tests

#### 2.1 Database Query Tests
```typescript
describe('Database Integration', () => {
  it('should respect RLS policies - investor cannot see other investor yields', async () => {
    // Given: Investor A logged in, Investor B has yields
    // When: getPerAssetStats called
    // Then: Zero yields returned (not Investor B's data)
  });

  it('should handle database timeout gracefully', async () => {
    // Given: Database query takes > 30 seconds
    // When: getPerAssetStats called
    // Then: Timeout error with user-friendly message
  });

  it('should handle database connection failure', async () => {
    // Given: Supabase connection unavailable
    // When: getPerAssetStats called
    // Then: Error handled, fallback message shown
  });

  it('should handle concurrent requests correctly', async () => {
    // Given: Multiple simultaneous getPerAssetStats calls
    // When: All requests execute
    // Then: All return consistent, correct data
  });
});
```

#### 2.2 Multi-Fund Tests
```typescript
describe('Multi-Fund Scenarios', () => {
  it('should aggregate yields per fund independently', async () => {
    // Given: Investor has USDT, BTC, and ETH positions
    // When: getPerAssetStats called
    // Then: Each fund shows its own yields, no cross-contamination
  });

  it('should handle investor with position in fund but no yields', async () => {
    // Given: Investor deposited recently, no yield distribution yet
    // When: getPerAssetStats called
    // Then: Fund shows balance with 0 yield, 0% return
  });

  it('should handle fund with zero current balance but historical yields', async () => {
    // Given: Investor withdrew all funds but had yields before withdrawal
    // When: getPerAssetStats called
    // Then: Fund NOT shown (filtered by current_value > 0)
  });
});
```

---

### 3. End-to-End Tests

#### 3.1 UI Display Tests
```typescript
describe('Performance Page E2E', () => {
  beforeEach(async () => {
    await loginAsInvestor('qa.investor@indigo.fund', 'QaTest2026!');
    await navigateTo('/investor/performance');
  });

  describe('Tab Navigation', () => {
    it('should display MTD data when MTD tab selected', async () => {
      await clickTab('MTD');
      expect(await getText('.period-label')).toBe('Showing Month-to-Date performance');
    });

    it('should display QTD data when QTD tab selected', async () => {
      await clickTab('QTD');
      expect(await getText('.period-label')).toBe('Showing Quarter-to-Date performance');
    });

    it('should display YTD data when YTD tab selected', async () => {
      await clickTab('YTD');
      expect(await getText('.period-label')).toBe('Showing Year-to-Date performance');
    });

    it('should display ITD data when ITD tab selected', async () => {
      await clickTab('ITD');
      expect(await getText('.period-label')).toBe('Showing Inception-to-Date performance');
    });

    it('should persist tab selection on page refresh', async () => {
      await clickTab('ITD');
      await page.reload();
      // Note: Current implementation may not persist - verify expected behavior
    });
  });

  describe('Performance Card Display', () => {
    it('should display all active fund positions', async () => {
      const cards = await getPerformanceCards();
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should show correct fund name and asset symbol', async () => {
      const card = await getCardByAsset('USDT');
      expect(await card.getText('.fund-name')).toBe('Stablecoin Fund');
      expect(await card.getText('.asset-symbol')).toBe('USDT');
    });

    it('should display rate of return with correct sign and color', async () => {
      const card = await getCardByAsset('USDT');
      const ror = await card.getText('.rate-of-return');
      // Positive: green, Negative: red, Zero: neutral
    });

    it('should format currency values correctly', async () => {
      const card = await getCardByAsset('USDT');
      const balance = await card.getText('.ending-balance');
      // Should show "25,094.67 USDT" format
      expect(balance).toMatch(/^[\d,]+\.\d{2} USDT$/);
    });

    it('should format crypto values with 8 decimals for BTC', async () => {
      const card = await getCardByAsset('BTC');
      const balance = await card.getText('.ending-balance');
      // Should show "0.50000000 BTC" or "0.50 BTC" depending on design
    });
  });
});
```

#### 3.2 Cross-Portal Consistency Tests
```typescript
describe('Cross-Portal Data Consistency', () => {
  it('should match Yield History total with Performance ITD', async () => {
    // Login as investor
    // Get ITD net income from Performance page
    // Navigate to Yield History
    // Compare with "Total Yield Earned"
    // Values must match exactly
  });

  it('should match admin-side investor view', async () => {
    // Login as admin
    // View investor profile performance
    // Login as investor
    // View own performance
    // Values must match
  });

  it('should match monthly statement figures', async () => {
    // Generate monthly statement for investor
    // Compare performance metrics
    // All figures must reconcile
  });
});
```

---

### 4. Edge Cases

#### 4.1 Temporal Edge Cases
```typescript
describe('Temporal Edge Cases', () => {
  it('should handle timezone differences correctly', async () => {
    // Given: Server in UTC, User in PST
    // When: Yield event_date is midnight UTC
    // Then: Correct period assignment regardless of user timezone
  });

  it('should handle daylight saving time transitions', async () => {
    // Given: Yield on DST transition day
    // When: Period calculation performed
    // Then: Correct month/quarter assignment
  });

  it('should handle end-of-month processing window', async () => {
    // Given: Yield distributed on Jan 31 at 11:59 PM UTC
    // When: MTD calculated on Feb 1
    // Then: Yield in January MTD, not February
  });

  it('should handle fiscal year vs calendar year', async () => {
    // Note: Current implementation uses calendar year
    // Future consideration for fiscal year reporting
  });
});
```

#### 4.2 Data Quality Edge Cases
```typescript
describe('Data Quality Edge Cases', () => {
  it('should handle NULL net_yield_amount gracefully', async () => {
    // Given: Yield event with NULL net_yield_amount
    // When: Aggregation performed
    // Then: Treat as 0, no crash
  });

  it('should handle duplicate yield events', async () => {
    // Given: Same reference_id appearing twice (should not happen)
    // When: Aggregation performed
    // Then: Log warning, include only once
  });

  it('should handle extremely old yield events', async () => {
    // Given: Yield from year 2000 (edge case)
    // When: ITD calculated
    // Then: Included correctly
  });

  it('should handle yield with future event_date', async () => {
    // Given: Yield dated for next month (admin error)
    // When: Current period calculations
    // Then: Not included in current periods
  });
});
```

#### 4.3 Investor State Edge Cases
```typescript
describe('Investor State Edge Cases', () => {
  it('should handle brand new investor with no positions', async () => {
    // Given: Investor just registered, no deposits
    // When: Performance page loaded
    // Then: Empty state message displayed
  });

  it('should handle investor with deposit but pre-first yield', async () => {
    // Given: Deposited 5 days ago, yield distribution is monthly
    // When: Performance page loaded
    // Then: Shows balance with 0 yield, 0% return
  });

  it('should handle investor who withdrew everything', async () => {
    // Given: Previous positions, now all current_value = 0
    // When: Performance page loaded
    // Then: Empty state (no active positions)
  });

  it('should handle investor with only voided yields', async () => {
    // Given: All yields have is_voided = true
    // When: Performance page loaded
    // Then: Shows 0 net income
  });

  it('should handle investor with mixed visibility yields', async () => {
    // Given: Some yields investor_visible, some admin_only
    // When: Performance page loaded
    // Then: Only investor_visible yields shown
  });
});
```

#### 4.4 Numeric Edge Cases
```typescript
describe('Numeric Edge Cases', () => {
  it('should handle yield of exactly 0.00', async () => {
    // Given: Yield distribution with net_amount = 0
    // When: Aggregation performed
    // Then: Correctly shows 0, no division errors
  });

  it('should handle very small yields (8 decimal precision)', async () => {
    // Given: BTC yield of 0.00000001
    // When: Displayed
    // Then: Shows correctly without scientific notation
  });

  it('should handle rounding consistently', async () => {
    // Given: Multiple yields summing to 100.005
    // When: Displayed
    // Then: Consistent rounding (100.01 or 100.00)
  });

  it('should handle negative yield corrections', async () => {
    // Given: Original yield + negative correction
    // When: ITD calculated
    // Then: Correct net amount
  });

  it('should not have floating point precision errors', async () => {
    // Given: Yields of 0.1 + 0.2
    // When: Summed
    // Then: Equals 0.3 exactly, not 0.30000000000000004
  });
});
```

---

### 5. Performance Tests

#### 5.1 Load Testing
```typescript
describe('Performance Under Load', () => {
  it('should return results within 500ms for typical investor', async () => {
    // Given: Investor with ~50 yield events across 2 years
    // When: getPerAssetStats called
    // Then: Response time < 500ms
  });

  it('should return results within 2s for high-volume investor', async () => {
    // Given: Investor with 1000+ yield events across 5 years
    // When: getPerAssetStats called
    // Then: Response time < 2000ms
  });

  it('should handle 100 concurrent users', async () => {
    // Given: 100 simultaneous Performance page loads
    // When: All requests sent
    // Then: All complete successfully within 5s
  });
});
```

#### 5.2 Query Optimization
```typescript
describe('Query Optimization', () => {
  it('should use indexed columns for yield_events query', async () => {
    // Verify query uses: investor_id, is_voided, visibility_scope indexes
  });

  it('should not perform N+1 queries', async () => {
    // Given: Investor with 5 funds
    // When: getPerAssetStats called
    // Then: Maximum 3 database queries (positions, yields, funds)
  });
});
```

---

### 6. Security Tests

#### 6.1 Authorization Tests
```typescript
describe('Authorization Security', () => {
  it('should not return other investor data via API manipulation', async () => {
    // Given: Attacker modifies investor_id in request
    // When: API called
    // Then: RLS prevents data access, returns only own data
  });

  it('should not expose admin_only yields to investor', async () => {
    // Given: Yields with visibility_scope = 'admin_only'
    // When: Investor calls API
    // Then: admin_only yields not returned
  });

  it('should require authentication', async () => {
    // Given: No auth token
    // When: API called
    // Then: 401 Unauthorized
  });
});
```

#### 6.2 Data Exposure Tests
```typescript
describe('Data Exposure Prevention', () => {
  it('should not expose internal IDs in response', async () => {
    // Response should not contain database UUIDs that could be exploited
  });

  it('should not expose other investor information', async () => {
    // No fund_aum, other investor counts, or aggregate data
  });

  it('should sanitize error messages', async () => {
    // Given: Database error occurs
    // When: Error returned
    // Then: Generic message, no SQL/table names exposed
  });
});
```

---

### 7. Compliance Tests

#### 7.1 Regulatory Compliance
```typescript
describe('Regulatory Compliance', () => {
  it('should display performance figures consistent with official statements', async () => {
    // SEC requirement: Displayed returns must match official documents
  });

  it('should not project or estimate future returns', async () => {
    // UI should only show historical, realized returns
  });

  it('should include appropriate disclaimers', async () => {
    // "Past performance does not guarantee future results"
  });
});
```

#### 7.2 Audit Trail
```typescript
describe('Audit Trail', () => {
  it('should log Performance page access', async () => {
    // Verify audit_log entry created on page load
  });

  it('should preserve yield event history', async () => {
    // Voided yields kept with voided_at, voided_by
    // No hard deletes
  });
});
```

---

### 8. Regression Tests

#### 8.1 Previous Bug Prevention
```typescript
describe('Regression Prevention', () => {
  it('BUG-001: Should not show 0% when yields exist', async () => {
    // Root cause: investor_fund_performance empty, fallback showed 0
    // Fix: Query investor_yield_events in fallback
    // Verify: ITD shows correct yield amount
  });

  it('BUG-002: Should handle missing fund lookup gracefully', async () => {
    // Prevent "Unknown Fund" display
  });

  it('BUG-003: Should not double-count yields', async () => {
    // Ensure each yield counted exactly once
  });
});
```

---

### 9. Test Data Requirements

#### 9.1 QA Test Investor Setup
```sql
-- Required test data for comprehensive testing
-- Investor: qa.investor@indigo.fund

-- Multiple funds with positions
INSERT INTO investor_positions (investor_id, fund_id, current_value, is_active)
VALUES
  ('qa-investor-id', 'usdt-fund-id', 25000, true),
  ('qa-investor-id', 'btc-fund-id', 0.5, true);

-- Yields across multiple time periods
INSERT INTO investor_yield_events (
  investor_id, fund_id, event_date, net_yield_amount,
  visibility_scope, is_voided
) VALUES
  -- October 2025 (ITD only)
  ('qa-investor-id', 'usdt-fund-id', '2025-10-31', 94.67, 'investor_visible', false),
  -- November 2025 (ITD + Q4 2025)
  ('qa-investor-id', 'usdt-fund-id', '2025-11-30', 95.00, 'investor_visible', false),
  -- December 2025 (ITD + Q4 2025)
  ('qa-investor-id', 'usdt-fund-id', '2025-12-31', 96.00, 'investor_visible', false),
  -- January 2026 (ITD + YTD + Q1 + MTD)
  ('qa-investor-id', 'usdt-fund-id', '2026-01-31', 97.00, 'investor_visible', false);
```

#### 9.2 Expected Results
| Period | Expected Net Income | Expected RoR |
|--------|---------------------|--------------|
| MTD (Jan 2026) | 97.00 USDT | ~0.39% |
| QTD (Q1 2026) | 97.00 USDT | ~0.39% |
| YTD (2026) | 97.00 USDT | ~0.39% |
| ITD (All Time) | 382.67 USDT | ~1.53% |

---

### 10. Test Execution Checklist

#### Pre-Deployment
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript compilation successful
- [ ] No linting errors
- [ ] Code review approved

#### Post-Deployment
- [ ] Smoke test: Performance page loads
- [ ] QA Investor shows correct yields
- [ ] Tab switching works (MTD/QTD/YTD/ITD)
- [ ] Cross-portal consistency verified
- [ ] No console errors
- [ ] Performance within acceptable limits

#### Rollback Criteria
- Any investor sees incorrect financial data
- Performance page fails to load
- Data breach detected
- >1% of users report issues

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CTO | | | |
| CFO | | | |
| Lead Architect | | | |
| QA Lead | | | |
| Security Officer | | | |

---

## Appendix A: Modified Dietz Formula

```
Rate of Return = (EMV - BMV - CF) / (BMV + Σ(CFi × Wi))

Where:
- EMV = Ending Market Value
- BMV = Beginning Market Value
- CF = Sum of all cash flows
- CFi = Individual cash flow
- Wi = Weight (proportion of period remaining)

Simplified (midpoint assumption):
RoR = Net Income / (Beginning Balance + (Additions - Withdrawals) / 2)
```

## Appendix B: Period Definitions

| Period | Start | End | Quarter Mapping |
|--------|-------|-----|-----------------|
| MTD | 1st of current month | Today | N/A |
| QTD | 1st of current quarter | Today | Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec |
| YTD | Jan 1 of current year | Today | N/A |
| ITD | First ever transaction | Today | N/A |

## Appendix C: Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| PERF-001 | Database timeout | "Unable to load performance data. Please try again." |
| PERF-002 | No positions found | "No active investments found." |
| PERF-003 | Authentication required | "Please log in to view performance." |
| PERF-004 | Invalid period | "Invalid time period selected." |
