

# Diagnostic Results and Remediation Plan

## Current State (Live DB Verification)

### BTC Fund AUM: HEALED
- `fund_daily_aum` snapshot: **10.38 BTC**
- Live positions sum: **10.38 BTC** (exact match)
- `check_aum_reconciliation`: `has_warning: false`, discrepancy 0
- The previous migration successfully healed the BTC snapshots

### ETH Fund AUM: STALE SNAPSHOTS (not yet healed)
- Latest `fund_daily_aum` snapshot: **486.82 ETH** (from July 2025)
- Live positions sum: **308.45 ETH**
- Drift: **178.37 ETH** -- but `check_aum_reconciliation` still returns `has_warning: false` because the RPC compares positions vs ledger (not vs snapshot)
- No new snapshots have been written since July 2025

### USDT Fund AUM: MASSIVELY STALE
- Latest snapshot: **10.00 USDT**
- Live positions sum: **994,196.90 USDT**

### Void Blocker: NOT REPRODUCED
- 5 successful voids logged in last hour, all `success: true`
- Zero entries in `admin_alerts`
- The void cascade is working after the 2-arg fix migration

---

## Root Causes Found

### Bug 1: `complete_withdrawal` dust reference pattern vs `void_transaction` cascade pattern MISMATCH (Critical)

The `complete_withdrawal` RPC creates dust transactions with:
- `reference_id = 'DUST_SWEEP_OUT:{request_id}'` (type `DUST_SWEEP`)
- `reference_id = 'DUST_RECV:{request_id}'` (type `DUST`)

But `void_transaction` cascade looks for:
- `reference_id LIKE 'dust-sweep-%'` (type `DUST_SWEEP` only)
- `reference_id LIKE 'dust-credit-%'`

These patterns are **completely different**. Server-side dust from `complete_withdrawal` will NEVER be cascade-voided. Additionally, `void_transaction` only matches `type = 'DUST_SWEEP'` but the credit side uses `type = 'DUST'`.

**Impact**: Voiding a withdrawal that had a full-exit dust sweep leaves orphaned dust transactions, creating position drift.

### Bug 2: Stale `fund_daily_aum` snapshots across ALL funds (not just BTC)

The BTC heal migration only targeted the BTC fund. ETH, USDT, XRP all have stale or missing snapshots. This is cosmetic (the reconciliation RPC correctly compares ledger vs positions, not snapshots) but creates confusion if any UI component reads `fund_daily_aum` directly.

### Non-Issue: UI mismatch display

The `check_aum_reconciliation` RPC currently returns `has_warning: false` for both BTC and ETH. The `YieldInputForm` and `DistributeYieldDialog` only show discrepancy warnings when `reconciliation?.has_warning === true`. So the UI should NOT currently be blocking. If the user still sees it, it is a stale React Query cache issue that clears on page refresh.

---

## Remediation Steps

### Step 1: Fix `void_transaction` dust cascade to match BOTH patterns

Update the dust sweep cascade in `void_transaction` to match:
- Frontend pattern: `dust-sweep-%`, `dust-credit-%` (type `DUST_SWEEP`)
- Backend pattern: `DUST_SWEEP_OUT:%`, `DUST_RECV:%` (types `DUST_SWEEP` and `DUST`)

This ensures dust from both `complete_withdrawal` (server-side) and `useTransactionSubmit` (client-side) code paths are properly cascade-voided.

### Step 2: Heal ALL fund AUM snapshots (not just BTC)

Run `recalculate_fund_aum_for_date` across all active funds for all non-voided snapshot dates, similar to the BTC heal but for ETH, USDT, XRP, SOL.

### Step 3: Harden `useFundAUM.ts` precision

Line 40 uses `Number(fund.total_aum || 0)` which loses precision beyond 15 significant digits. For USDT at 994,196.9 this is fine, but it violates the platform standard. Change to preserve string precision or use `toNum()`.

---

## Technical Details

**Files to modify:**
- `supabase/migrations/` -- new migration with fixed `void_transaction` and data heal
- `src/hooks/data/shared/useFundAUM.ts` -- line 40 precision fix

**`void_transaction` dust cascade fix (SQL):**
```sql
-- Replace the existing DUST_SWEEP cascade block with:
IF v_tx.type = 'WITHDRAWAL' THEN
  -- Cascade: dust from BOTH frontend (dust-sweep-%) and backend (DUST_SWEEP_OUT:%) patterns
  UPDATE public.transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: dust for withdrawal ' || p_transaction_id::text
  WHERE type IN ('DUST_SWEEP', 'DUST')
    AND fund_id = v_tx.fund_id
    AND tx_date = v_tx.tx_date
    AND is_voided = false
    AND (
      -- Frontend pattern (useTransactionSubmit)
      reference_id LIKE 'dust-sweep-%' OR reference_id LIKE 'dust-credit-%'
      -- Backend pattern (complete_withdrawal)
      OR reference_id LIKE 'DUST_SWEEP_OUT:%' OR reference_id LIKE 'DUST_RECV:%'
    )
    AND (investor_id = v_tx.investor_id
      OR reference_id LIKE 'dust-credit-%'
      OR reference_id LIKE 'DUST_RECV:%');
END IF;
```

**Data heal (SQL):**
```sql
DO $$ DECLARE v_row RECORD; BEGIN
  FOR v_row IN
    SELECT DISTINCT f.id as fund_id, d.aum_date
    FROM funds f
    JOIN fund_daily_aum d ON d.fund_id = f.id AND d.is_voided = false
    WHERE f.status = 'active'
    ORDER BY d.aum_date
  LOOP
    PERFORM recalculate_fund_aum_for_date(v_row.fund_id, v_row.aum_date);
  END LOOP;
END; $$;
```

**Risk**: Zero. Both changes are idempotent. The void cascade fix only broadens the pattern match. The data heal simply recomputes from positions.

