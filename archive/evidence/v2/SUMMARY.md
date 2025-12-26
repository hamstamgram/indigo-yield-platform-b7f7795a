# INDIGO Platform Evidence Pack v2 Summary

**Generated:** 2024-12-21  
**Version:** 2.0.0

---

## Overview

This evidence pack provides verification and proof for the INDIGO token-denominated platform's:
- Database schema and security (RLS)
- Calculation accuracy (reconciliation formula)
- Token conservation (yield distribution)
- One-report-per-period enforcement
- No-USD compliance

---

## PASS/FAIL Summary Table

| Check | Evidence File | Status |
|-------|---------------|--------|
| All routes have guards | FRONTEND/routes_inventory.json | ✅ PASS |
| RLS enabled on key tables | DATABASE/rls_policies.sql | ✅ PASS |
| Unique constraint on generated_statements | DATABASE/constraints_indexes.sql | ✅ PASS |
| Unique constraint on investor_fund_performance | DATABASE/constraints_indexes.sql | ✅ PASS |
| Fee allocation idempotency | DATABASE/constraints_indexes.sql | ✅ PASS |
| IB allocation idempotency | DATABASE/constraints_indexes.sql | ✅ PASS |
| Transaction reference_id unique | DATABASE/constraints_indexes.sql | ✅ PASS |
| Audit triggers on key tables | DATABASE/triggers_and_audit.sql | ✅ PASS |
| Edge function filters purpose='reporting' ONLY | generate-fund-performance/index.ts:189 | ✅ PASS (FIXED) |
| Reconciliation formula correct | CALCULATIONS/reconciliation_proofs.md | ✅ PASS |
| Token conservation verified | CALCULATIONS/token_conservation_proof.sql | ✅ PASS |
| No USD in investor-facing code | NO_USD_PROOF/no_usd_scan.txt | ✅ PASS |
| Performance edge case tests | src/test/unit/performanceEdgeCases.test.ts | ✅ PASS |
| Yield idempotency tests | src/test/integration/yieldIdempotency.test.ts | ✅ PASS |

---

## Files in This Pack

### DATABASE/
| File | Description |
|------|-------------|
| schema_dump.sql | Table definitions for key tables |
| rls_policies.sql | Row Level Security policies |
| triggers_and_audit.sql | Audit trigger functions |
| constraints_indexes.sql | Unique constraints and indexes |

### CALCULATIONS/
| File | Description |
|------|-------------|
| seed_test_data.sql | Deterministic test data for reconciliation |
| reconciliation_proofs.md | Formula verification with examples |
| token_conservation_proof.sql | Yield distribution conservation queries |

### REPORTS/
| File | Description |
|------|-------------|
| one_report_per_period_proof.md | Duplicate prevention evidence |

### NO_USD_PROOF/
| File | Description |
|------|-------------|
| no_usd_scan.txt | Ripgrep scan results |
| ui_scan_checklist.md | Manual UI verification checklist |

### FRONTEND/
| File | Description |
|------|-------------|
| routes_inventory.json | All routes with guards |
| actions_inventory.md | All buttons and handlers |

### TESTS/
| File | Description |
|------|-------------|
| src/test/unit/performanceEdgeCases.test.ts | Edge case unit tests |
| src/test/integration/yieldIdempotency.test.ts | Idempotency integration tests |

---

## Key Fixes Applied

### 1. Edge Function Purpose Filter (P1 Fix)

**File:** `supabase/functions/generate-fund-performance/index.ts`

**Before:**
```typescript
.or("purpose.is.null,purpose.eq.reporting") // Included NULL purpose
```

**After:**
```typescript
.eq("purpose", "reporting") // STRICT: Only reporting purpose
```

**Impact:** Prevents transaction-purpose yield entries from appearing in investor statements.

---

## Verification Commands

### Run Unit Tests
```bash
npm run test src/test/unit/performanceEdgeCases.test.ts
```

### Run Integration Tests
```bash
npm run test src/test/integration/yieldIdempotency.test.ts
```

### Verify No USD in Investor Routes
```bash
rg -i 'USD|\$[0-9]|formatCurrency' src/routes/investor src/components/investor --type ts --type tsx
```

Expected: No matches (or only stablecoin symbols USDT/USDC)

---

## Manual Verification Checklist

- [ ] Navigate to /statements as investor - only reporting data visible
- [ ] Navigate to /admin/investor-reports - generate statement for period
- [ ] Attempt to generate same statement again - should show "already exists"
- [ ] Check any investor balance display - should show token symbol (e.g., "10.04 BTC")
- [ ] Check reconciliation: beginning + additions - redemptions + net_income = ending
- [ ] Verify no "$" or "USD" labels in investor-facing pages

---

## Conclusion

**All critical checks PASS.** The platform correctly:
1. Separates transaction/reporting purposes
2. Enforces one statement per investor per period
3. Maintains token conservation in yield distributions
4. Displays all amounts in native token units (no USD)
5. Has proper RLS and audit logging
