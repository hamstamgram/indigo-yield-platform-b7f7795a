

# Platform Bug & Issue Audit — Findings Report

## Critical Issue #1: 5 Unvoided Transactions from Voided Distribution (DATA FIX)

**Severity: HIGH** — Active ledger corruption

Distribution `c9110b45` (BTC fund, 2025-03-31) was voided on 2026-03-27, but **5 transactions were not voided** during the cascade:

| Investor | Type | Amount |
|---|---|---|
| Jose Molla | YIELD | 0.01183... BTC |
| Indigo Fees | FEE_CREDIT | 0.00208... BTC |
| Thomas Puech | YIELD | 0.02591... BTC |
| Indigo Fees | YIELD | 0.00016... BTC |
| Indigo Fees | DUST | 0.000...001 BTC |

**Root cause:** This void happened on 2026-03-27, before the `void_yield_distribution` function was rebuilt with the canonical RPC flag (migration `20260408153659`). The function likely failed mid-execution — the distribution record was marked `is_voided=true`, but the transaction cascade was incomplete.

**Fix:** Data migration to void these 5 orphaned transactions and recompute affected positions (Jose Molla, Thomas Puech, Indigo Fees in BTC fund).

---

## Issue #2: 11 Legacy Withdrawal Requests with No Linked Transaction (INFORMATIONAL)

11 `withdrawal_requests` with `status=completed` have no transaction whose `reference_id` contains the withdrawal request ID. However, all 11 have matching unvoided WITHDRAWAL transactions linked by investor_id + fund_id — they just use the `WDR-{investor}-{date}-{hash}` reference format instead of embedding the withdrawal request UUID.

**Root cause:** These are pre-RPC legacy withdrawals imported during the seed/migration phase. The `reference_id` format was standardized later.

**Impact:** None on financial integrity — transactions exist and balances are correct. The `v_missing_withdrawal_transactions` view (P2 tech debt item #2) may flag these as false positives.

**Fix:** No data fix needed. This is already tracked in `POST_LAUNCH_TECH_DEBT.md` item #2.

---

## Issue #3: IB/Fees Positions with Zero Cost Basis (EXPECTED)

6 positions have `cost_basis=0` with positive `current_value`:
- 3 are **Indigo Fees** (system account) — fees accounts never have deposits, only FEE_CREDIT/YIELD/DUST
- 3 are **IB investors** (Alex Jacobs, Ryan Van Der Wall, Lars Ahlgreen) — they receive IB_CREDIT commissions, not deposits

**Impact:** None — this is correct behavior. Cost basis only tracks DEPOSIT amounts.

**Fix:** None needed. Could optionally exclude `fees_account` and IB-only investors from the `zero_cost_basis_with_value` check if it's added to the integrity monitor.

---

## Implementation Plan (1 migration)

### Migration: Void orphaned transactions from distribution c9110b45

```sql
-- 1. Void the 5 orphaned transactions
UPDATE transactions_v2
SET is_voided = true,
    voided_at = NOW(),
    void_reason = 'Orphaned: parent distribution c9110b45 was voided on 2026-03-27 but these transactions were missed'
WHERE distribution_id = 'c9110b45-9339-4090-b4f3-bad4b2784ca2'
  AND is_voided = false;

-- 2. Recompute positions for affected investors
SELECT recompute_investor_position('203caf71-a9ac-4e2a-bbd3-b45dd51758d4', '0a048d9b-c4cf-46eb-b428-59e10307df93');  -- Jose Molla BTC
SELECT recompute_investor_position('44801beb-4476-4a9b-9751-4e70267f6953', '0a048d9b-c4cf-46eb-b428-59e10307df93');  -- Thomas Puech BTC
SELECT recompute_investor_position('b464a3f7-60d5-4bc0-9833-7b413bcc6cae', '0a048d9b-c4cf-46eb-b428-59e10307df93');  -- Indigo Fees BTC
```

This requires the canonical RPC flag, so the UPDATE must be wrapped in a function or use `SET LOCAL`.

### No frontend changes needed

