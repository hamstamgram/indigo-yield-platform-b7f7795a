# GO-LIVE QUICK REFERENCE

## Existing Test Assets

| Test File | Coverage | Use For |
|----------|----------|---------|
| `tests/e2e/golive-lifecycle.spec.ts` | **FULL** — Blocks A-G | Main E2E validation |
| `tests/e2e/smoke-critical-flows.spec.ts` | 10 critical screens | Smoke test |
| `tests/e2e/btc-ralph-loop-validation.spec.ts` | BTC lifecycle + yield | BTC fund validation |
| `tests/e2e/xrp-ralph-loop-validation.spec.ts` | XRP lifecycle | XRP fund validation |
| `tests/e2e/eth-ralph-loop-validation.spec.ts` | ETH lifecycle | ETH fund validation |
| `tests/e2e/yield-replay-*.spec.ts` | Yield replay tests | Yield validation |

---

## Quick Run Commands

```bash
# Run smoke test (fastest - 10 screens)
npx playwright test tests/e2e/smoke-critical-flows.spec.ts

# Run full lifecycle (comprehensive)
npx playwright test tests/e2e/golive-lifecycle.spec.ts

# Run single fund validation
npx playwright test tests/e2e/btc-ralph-loop-validation.spec.ts
```

---

## Critical Checks Summary

### P0 (Must Pass)

| # | Check | Test Location |
|---|-------|--------------|
| 1 | Full exit creates 2 transactions | golive-lifecycle Block B |
| 2 | Void restores position | golive-lifecycle Block D |
| 3 | Yield applies correctly | golive-lifecycle Block C |
| 4 | Dashboard AUM correct | golive-lifecycle Block F |
| 5 | Positions sum to AUM | golive-lifecycle Block E |

### Verification Queries

```sql
-- Check withdrawal created
SELECT id, status, requested_amount FROM withdrawal_requests 
ORDER BY created_at DESC LIMIT 5;

-- Check 2 transactions for full exit
SELECT id, type, amount, is_voided FROM transactions_v2 
WHERE investor_id = '<ID>' ORDER BY created_at DESC LIMIT 5;

-- Check position active state
SELECT current_value, is_active FROM investor_positions 
WHERE investor_id = '<ID>';

-- Check AUM
SELECT asset, aum FROM fund_daily_aum 
ORDER BY calc_date DESC LIMIT 5;
```

---

## Ready to Execute

**Manual Tests:** Use verification plan batches 1-3, 5, 7-8  
**Playwright:** Use `golive-lifecycle.spec.ts` for full E2E  
**DB Verification:** Use queries above for state validation

Go live execution ready.