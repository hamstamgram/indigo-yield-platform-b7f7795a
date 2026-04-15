# Go-Live Deferred Technical Debt

**Date:** 2026-04-14
**Classification:** Acceptable post-launch debt — no financial correctness impact
**Total Items:** 6 (D-1 through D-6)

---

## D-1: void_yield_distribution voided_count
**Status:** ✅ FIXED — migration 20260414000000 applied 2026-04-14

---

## D-2: Period dates in yield apply response
**Status:** ✅ FIXED — migration 20260414000001 applied 2026-04-14

---

## D-3: Enum validation vs live DB
**Status:** ✅ MITIGATED — assertUnreachable() in lib/rpc/normalization.ts handles fallthrough

---

## D-4: Duplicate Transaction type definitions
**Evidence:** Type audit R3-R5
**Issue:** TransactionRecord (transactionsV2Service.ts) and TransactionRow (adminTransactionHistoryService.ts) duplicate generated DB types
**Why Acceptable:** No runtime impact — duplicate type definitions don't affect data flow
**Fix:** Import from src/types/domains/transaction.ts, remove local duplicates
**Effort:** 2-3 hours
**Ticket:** [Create post-launch]

---

## D-5: Runtime enum validation on app load
**Evidence:** Type audit D-5
**Issue:** No startup check that frontend enum values match backend database enums
**Why Acceptable:** Static enum values rarely change in production; fallthrough warning added as mitigation
**Fix:** Add startup call to query pg_enum and compare to dbEnums.ts values
**Effort:** 4 hours
**Ticket:** [Create post-launch]

---

## D-6: Yield cascade failure scenarios undocumented
**Evidence:** Release baseline D-6
**Issue:** No documented runbook for: yield apply creates 0 allocations, yield void partial cascade
**Why Acceptable:** Post-release watch plan covers monitoring signals; playbook can be written from production observations
**Fix:** Add scenarios to docs/audit/41-post-release-watch-plan.md after first real yield cycle
**Effort:** 1 hour
**Ticket:** [Create after first production yield apply]

---

## Summary

| Item | Type | Priority | Status |
|------|------|----------|--------|
| D-1: voided_count | Backend | P0 | ✅ Fixed |
| D-2: period dates | Backend | P1 | ✅ Fixed |
| D-3: enum validation | DevOps | P1 | ✅ Mitigated |
| D-4: Duplicate TX types | Frontend | P2 | Deferred |
| D-5: Runtime enum check | Frontend | P3 | Deferred |
| D-6: Yield cascade docs | Backend | P3 | Deferred |