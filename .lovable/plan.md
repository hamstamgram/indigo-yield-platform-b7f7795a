

# P0 Diagnostic Results and Fix Plan

## Diagnostic Summary

I ran all three diagnostic queries directly against your production database. Here are the findings:

---

## P0-1: The BTC Void Blocker -- RESOLVED (already fixed)

**Finding**: The deployed `void_transaction` function NO LONGER calls `check_historical_lock`. The previous "Failed to fetch" error (which blocked you) was caused by the swapped-parameter bug in `recompute_on_void` that we fixed in the last session. The `void_yield_distribution` function also has no historical lock check.

**Current state**: 12 non-voided BTC yield distributions exist (Jul 2024 through Mar 2025). Each distribution has ~5 related transactions (YIELD x3, FEE_CREDIT x1, plus allocations). Total BTC ledger: 91 non-voided transactions.

**Action required**: You should now be able to void BTC yield distributions in reverse chronological order (Mar 31 first, then Feb 28, etc.) using the admin UI. The timeout fix from last session ensures each void completes within the API gateway limit. No code changes needed.

**Recommended void order**: Mar 31 -> Feb 28 -> Jan 31 -> Dec 31 -> Dec 14 (tx) -> Nov 30 -> Nov 9 (tx) -> Oct 31 -> Sep 30 -> Aug 31 -> Aug 21 (tx) -> Jul 31.

---

## P0-2: The ETH Full Exit Bug -- NO GHOST DUST

**Finding**: Indigo LP's ETH position is clean:
- `current_value = 0.000000000000000000`
- `is_active = false`
- The withdrawal on July 31, 2025 properly executed with dust sweep (0.002384777400 ETH swept to Indigo Fees)

**However**: Indigo LP received yield allocations on ETH for July 11 (`0.950887948900 gross`) and July 30 (`0.819661149900 gross`) -- BEFORE the July 31 exit. These allocations are correct because Indigo LP held the position during those periods.

**The July 31 reporting distribution** has `gross_yield_amount = 0` and **zero allocations**. This is suspicious -- a month-end reporting distribution with zero yield means no performance was recorded for July even though two transaction-purpose distributions were applied (July 11 and July 30).

**Root cause of August drift**: The dual-AUM system requires a `reporting`-purpose AUM snapshot at month-end to anchor the next month's opening balance. If the July 31 reporting distribution recorded `0` gross, the August opening AUM may be based on pre-exit positions, not post-exit. This would include Indigo LP's ~178 ETH in the denominator for August, corrupting the yield calculation even though the position is inactive.

**Fix needed**: Verify `fund_daily_aum` for ETH around July 31 with `purpose = 'reporting'`. If the reporting AUM includes Indigo LP's balance, the July 31 reporting distribution and its AUM snapshot need to be voided and re-applied with the correct post-exit AUM.

---

## P0-3: The Precision Bug -- CONFIRMED (ROUND to 8, not 2)

**Finding**: The rounding is not to 2 decimal places -- it's `ROUND(..., 8)` in the baseline yield engine and `ROUND(..., 10)` in later migrations. There are no `numeric(10,2)` declarations anywhere.

**However**, the allocation-level conservation check reveals systematic drift:

| Distribution | Header Gross | Alloc Gross Sum | Gap |
|---|---|---|---|
| Jul 2024 | 0.02200000 | 0.02200000 | 0 (1 alloc, no rounding) |
| Oct 2024 | 0.11064513 | 0.11070000 | -0.00005487 (over-allocated!) |
| Dec 2024 | 0.05182858 | 0.05200000 | -0.00017142 (over-allocated!) |
| Jan 2025 | 0.05978627 | 0.06000000 | -0.00021373 (over-allocated!) |

**Root cause**: The early BTC distributions (seeded March 20, 2026) used the baseline `ROUND(..., 8)` engine which rounds each investor's gross to 8 dp. With 3-6 participants, the sum of rounded allocations can exceed or undershoot the header gross. The residual assignment logic is supposed to absorb this, but it was rounding the entered `gross_yield` (e.g., 0.0220) rather than the computed `gross_yield_amount` (0.022000000000000000).

Additionally, `yield_allocations.fee_amount` is ALWAYS 0 across all distributions. Fees are tracked via `fee_allocations` and `platform_fee_ledger`, but the `fee_amount` column in `yield_allocations` is never populated by the yield engine. This means any allocation-level conservation check that sums `fee_amount` from yield_allocations will show a gap equal to the total fees.

The `v_yield_conservation_violations` view uses header-level checks with a `> 0.01` tolerance, which is why it returns empty -- but this tolerance is far too coarse for crypto (0.01 BTC = ~$1,000).

---

## Fix Plan

### Step 1: Tighten conservation violation threshold (Migration)

Update `v_yield_conservation_violations` to use asset-appropriate thresholds instead of the flat `0.01`:
- BTC/ETH: `> 0.00000001` (1 satoshi / 1 gwei)
- USDT/USDC/EURC: `> 0.0001`
- SOL/XRP/ADA: `> 0.00001`

### Step 2: Upgrade baseline yield ROUND precision (Migration)

Update `apply_segmented_yield_distribution_v5` to use `ROUND(..., 18)` (matching the `numeric(38,18)` column precision) instead of `ROUND(..., 10)`. Also update `preview_segmented_yield_distribution_v5` and `calc_avg_daily_balance` to match.

### Step 3: Verify ETH AUM state (Diagnostic query -- no code change)

Query `fund_daily_aum` for ETH around July 31, 2025 to confirm whether the reporting AUM snapshot captured Indigo LP's exit. If it didn't, void and re-apply the July 31 reporting distribution with the correct post-exit AUM.

### Step 4: Retry BTC void cascade (Manual admin action -- no code change)

With the timeout fix already deployed, void the 12 BTC distributions in reverse chronological order through the admin UI. Each void affects ~5 transactions and should complete in under 5 seconds.

---

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Tighten `v_yield_conservation_violations` threshold per asset |
| Same migration | Upgrade ROUND precision in yield engine functions to 18 dp |
| Same migration | Upgrade ROUND precision in preview and ADB functions |

## Risk Assessment

- Step 1 (threshold): Zero risk -- read-only view, just tighter alerting
- Step 2 (ROUND 18): Low risk -- only affects future distributions, existing data unchanged
- Step 3 (ETH AUM): Diagnostic only, identifies if manual correction is needed
- Step 4 (BTC void): Already tested architecture, just needs manual execution

