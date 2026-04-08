# Gate 2: Financial Integrity Validation

**Date:** ____
**Status:** Pending
**Sign-off:** CFO ☐ · CTO ☐

---

## 1. Position-Ledger Reconciliation

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| `batch_reconcile_all_positions()` | Run as admin | ☐ | Expected: 0 drift |
| `v_ledger_reconciliation` view | `SELECT * FROM v_ledger_reconciliation WHERE drift <> 0` | ☐ | Expected: 0 rows |

---

## 2. AUM Cross-Check

| Fund | `get_funds_aum_snapshot()` | Sum of `investor_positions` (active) | Delta | Result |
|------|---------------------------|--------------------------------------|-------|--------|
| Fund A | — | — | — | ☐ |
| Fund B | — | — | — | ☐ |
| Fund C | — | — | — | ☐ |

---

## 3. Fee Conservation

For each non-voided yield distribution, verify:
`total_amount = investor_net_amount + platform_fee + ib_commission`

| Distribution ID | Total | Investor Net | Platform Fee | IB Commission | Balanced? |
|----------------|-------|-------------|-------------|---------------|-----------|
| (sample) | — | — | — | — | ☐ |

Query: `SELECT * FROM v_yield_conservation_violations`
Expected: 0 rows

---

## 4. Voided Distribution `63b032b8` Verification

| Table | Record Status | Result |
|-------|--------------|--------|
| `yield_distributions` | `is_voided = true` | ☐ |
| `transactions_v2` (5 linked) | All `is_voided = true` | ☐ |
| `fee_allocations` (linked) | All `is_voided = true` | ☐ |
| `ib_allocations` (linked) | All `is_voided = true` | ☐ |

---

## 5. Spot-Check: 3 Investor Accounts

| Investor | Dashboard Balance | Ledger Query Balance | Delta | Result |
|----------|------------------|---------------------|-------|--------|
| Investor 1 | — | — | — | ☐ |
| Investor 2 | — | — | — | ☐ |
| Investor 3 | — | — | — | ☐ |

---

## 6. Position Snapshot Verification

| Check | Result | Notes |
|-------|--------|-------|
| `create_daily_position_snapshot()` executes | ☐ | |
| Snapshot values match `investor_positions.current_value` | ☐ | |

---

## Summary

| Area | Result |
|------|--------|
| Position-Ledger Reconciliation | ☐ |
| AUM Cross-Check | ☐ |
| Fee Conservation | ☐ |
| Voided Distribution Cascade | ☐ |
| Investor Spot-Checks (3) | ☐ |
| Snapshot Verification | ☐ |

---

*Report template created: 2026-04-08*
*Execute queries → fill results → CFO + CTO sign-off*
