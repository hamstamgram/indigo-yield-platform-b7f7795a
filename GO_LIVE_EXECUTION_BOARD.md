# GO-LIVE EXECUTION BOARD — Same-Day Execution

**Generated:** April 14, 2026  
**Purpose:** Convert verification plan into actionable same-day batches

---

## A. Batch List (Exact Execution Order)

| Batch | Type | Description | Status |
|-------|------|-------------|--------|
| **Batch 1** | Manual | Investor partial withdrawal walkthrough: submit → list appears | ⬜ TODO |
| **Batch 2** | Manual | Full exit with dust verification: 99%+ → toggle → 2 TXs created | ⬜ TODO |
| **Batch 3** | Manual | Void completed withdrawal: position reactivation + AUM restore | ⬜ TODO |
| **Batch 4** | Playwright | E2E: Full withdrawal flow submit → admin approve → complete | ⬜ TODO |
| **Batch 5** | Manual | Yield apply → positions increase → void → positions restored | ⬜ TODO |
| **Batch 6** | Playwright | E2E: Void transaction verification + history filter | ⬜ TODO |
| **Batch 7** | Manual | Dashboard AUM refresh verification after all mutations | ⬜ TODO |
| **Batch 8** | Manual | Final smoke: all screens load + data visible | ⬜ TODO |
| **Batch 9** | Code | Any issues found during testing → immediate patch | ⬜ TODO |
| **Batch 10** | Decision | Final go/no-go decision | ⬜ TODO |

---

## B. Owner/Tool Per Batch

| Batch | Owner | Tool | Notes |
|-------|-------|------|-------|
| Batch 1 | QA Lead | Manual browser + DevTools | Test investor flow |
| Batch 2 | QA Lead | Manual browser + SQL query | Verify 2 TXs in DB |
| Batch 3 | QA Lead | Manual browser + DB query | Verify position reactivated |
| Batch 4 | QA Automation | Playwright | E2E test suite |
| Batch 5 | QA Lead | Manual browser | Test yield cascade |
| Batch 6 | QA Automation | Playwright | Void E2E test |
| Batch 7 | QA Lead | Browser + DB | Compare AUM values |
| Batch 8 | QA Lead | Browser | All critical screens |
| Batch 9 | Backend Lead | Code editor | Hot-fix if needed |
| Batch 10 | Release Manager | Decision | sign-off |

---

## C. Estimated Duration Per Batch

| Batch | Duration | Cumulative |
|-------|----------|-------------|
| Batch 1 | 15 min | 15 min |
| Batch 2 | 20 min | 35 min |
| Batch 3 | 15 min | 50 min |
| Batch 4 | 25 min | 75 min |
| Batch 5 | 15 min | 90 min |
| Batch 6 | 20 min | 110 min |
| Batch 7 | 10 min | 120 min |
| Batch 8 | 30 min | 150 min |
| Batch 9 | Variable | + |
| Batch 10 | 15 min | 165+ min |

**Total estimated: ~3 hours (without patches)**

---

## D. Go/No-Go Dependency For Each Batch

| Batch | Dependencies | Can Proceed If |
|-------|---------------|----------------|
| Batch 1 | None | Starts first |
| Batch 2 | Batch 1 completes without P0 | Pass: WR in list |
| Batch 3 | Batch 2 completes | Pass: Position restored |
| Batch 4 | Batch 1-3 pass | Pass: E2E flow works |
| Batch 5 | Batch 3 passes | Pass: Yield applied |
| Batch 6 | Batch 5 passes | Pass: Void works |
| Batch 7 | Batch 6 passes | Pass: AUM correct |
| Batch 8 | Batch 7 passes | Pass: All screens OK |
| Batch 9 | Any P0 found | All P0s resolved |
| Batch 10 | All above pass | All pass |

### Blocking Criteria (Stop for P0)
- Any P0 in critical path
- Dashboard shows wrong AUM
- Position math incorrect by > 0.00000001
- Void doesn't restore position
- Dust not routed correctly

---

## E. Exact Final Pre-Production Test Order

### 1. Highest-Risk Manual Walkthroughs (Do First)

```
Batch 1 → Batch 2 → Batch 3 → Batch 5 → Batch 7 → Batch 8
         ↑
         Must complete before Playwright
```

### 2. Highest-Value Playwright Additions (Do Second)

```
Batch 4 → Batch 6
   ↑
   Requires manual flows passing first
```

### 3. Highest-Priority Patch Batches (Do Third)

```
Batch 9: Only if P0 found in Batches 1-8
   ↑
   Conditional execution
```

### 4. Final Smoke Pass (Do Fourth)

```
Batch 8 re-validation: All critical paths re-tested
```

### 5. Final Go/No-Go Decision (Do Last)

```
Batch 10: Release sign-off
   ↑
   All above must pass
```

---

## F. Quick Test Scripts Reference

### Manual Test Commands

```bash
# Check withdrawal in DB
psql -c "SELECT id, status, requested_amount, processed_amount FROM withdrawal_requests ORDER BY created_at DESC LIMIT 1;"

# Check transactions after full exit
psql -c "SELECT id, type, amount, is_voided FROM transactions_v2 WHERE investor_id = '<INVESTOR_ID>' ORDER BY created_at DESC LIMIT 5;"

# Check position active state
psql -c "SELECT investor_id, fund_id, current_value, is_active FROM investor_positions WHERE investor_id = '<INVESTOR_ID>';"

# Check AUM
psql -c "SELECT asset, aum from fund_daily_aum ORDER BY calc_date DESC LIMIT 5;"
```

### Playwright Run

```bash
# Run withdrawal E2E test
npx playwright test tests/withdrawal-e2e.spec.ts

# Run void cascade test  
npx playwright test tests/void-cascade.spec.ts
```

---

## G. Immediate Actions Required Before Testing

| Action | Who | Status |
|--------|-----|--------|
| Verify test DB accessible | Backend | ⬜ |
| Confirm test investor exists with balance | Backend | ⬜ |
| Confirm admin credentials work | QA | ⬜ |
| Verify Playwright tests exist or create | Automation | ⬜ |
| Confirm DB query access | Backend | ⬜ |

---

## H. Decision Gate Summary

| Gate | Criteria | Pass |
|------|----------|------|
| Gate 1 (Post Batch 3) | Withdrawal flows complete, position math correct | ⬜ |
| Gate 2 (Post Batch 6) | E2E tests pass, void cascade works | ⬜ |
| Gate 3 (Post Batch 8) | Smoke pass - all screens work | ⬜ |
| Gate 4 (Post Batch 9) | No P0 blockers remain | ⬜ |
| **GO-LIVE** | All gates pass | ⬜ |

---

**Execution ready. Begin Batch 1 when ready.**

---

*End of Execution Board*