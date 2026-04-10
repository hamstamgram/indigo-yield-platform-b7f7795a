

# XRP Fund Replay & Discrepancy Report

## Current Ledger State (DB) — Verified Internally Consistent

Positions match ledger with **zero variance**:

| Investor | Position | Ledger Sum | Cost Basis | Match |
|----------|----------|------------|------------|-------|
| Sam Johnson | 330,202.112959 | 330,202.112959 | 328,603.00 | EXACT |
| Ryan Van Der Wall | 143.896859 | 143.896859 | 63.284 | EXACT |
| Indigo Fees | 576.510181 | 576.510181 | 253.136 | EXACT |
| **TOTAL** | **330,922.520000** | **330,922.520000** | **328,919.42** | **EXACT** |

Conservation identity holds across all 4 yield distributions (residual = 0 on all).

---

## Timeline Replay vs Excel Expected Values

### Period 1: Nov 30 Reporting — CLEAN
| Field | Excel Expected | DB | Status |
|-------|---------------|-----|--------|
| AUM | 184,358 | 184,358 | MATCH |
| Prior baseline | 184,003 | 184,003 | MATCH |
| Gross yield | 355 | 355 | MATCH |
| Sam (80%) | 284.00 | 284.00 | MATCH |
| Ryan IB (4%) | 14.20 | 14.20 | MATCH |
| Indigo Fees (16%) | 56.80 | 56.80 | MATCH |

### Period 2: Dec 15 Checkpoint — NEEDS EXCEL VERIFICATION
| Field | DB Value |
|-------|----------|
| AUM | 279,719 |
| Prior | 279,231 |
| Gross yield | 488 (raw), 487.796 (after proportional split) |
| Purpose | transaction (checkpoint — not investor-visible) |

This checkpoint was applied with proportional allocation across 3 participants (Sam, Ryan, Indigo) rather than the simple 80/16/4 fee template. The amounts are small and the conservation identity holds, but the checkpoint itself shifts from the Excel's simple fee-template model.

### Period 3: Dec 31 Reporting — NEEDS EXCEL VERIFICATION
| Field | DB Value |
|-------|----------|
| AUM | 330,976 |
| Prior | 329,819 |
| Gross yield | 1,157 (raw), 1,156.316 (distributed) |
| Sam yield | 924.917 |
| Ryan IB | 46.246 |
| Indigo fees | 185.017 |

### Period 4: Jan 31 Reporting — DISCREPANCY (CRITICAL)
| Field | DB Value | Expected |
|-------|----------|----------|
| AUM | **795** | ~331,612 |
| Prior | 792 | ~331,295 |
| Gross yield | **3** | ~317 |

**Root cause**: The `recorded_aum` of 795 is garbage data. The fund had ~331k in positions at this time. This means Jan yield was underpaid by ~99.9%. Ryan got 0 IB commission for Jan. The fund's yield allocation for January is essentially zero instead of the real ~317 XRP.

---

## Discrepancies Found

### 1. CRITICAL: 14 Garbage AUM Records (value = 795.000)
`fund_daily_aum` contains 14 entries with `total_aum = 795.000` from `position_recompute` source. These pollute the AUM history and caused the Jan 31 yield to use wrong inputs. The 795 value appears to be from an old/broken recompute that may have only counted one small position.

### 2. CRITICAL: Jan 31 Yield Distribution Massively Underpaid
Because it used AUM=795 instead of ~331k, the entire January yield allocation is ~0.6 XRP instead of ~317 XRP. This means:
- Sam is owed ~253 XRP in missed yield
- Indigo Fees is owed ~50 XRP in missed fees
- Ryan is owed ~12.7 XRP in missed IB commissions

### 3. MEDIUM: Stray 0.1 YIELD to Indigo Fees (Nov 30)
A `YIELD` transaction of 0.1 XRP to Indigo Fees with `purpose=transaction`, no `distribution_id`. This appears to be a manual test entry. It inflates Indigo's position by 0.1 XRP.

### 4. MEDIUM: Deposits for Ryan (63.284) and Indigo (253.136) on Jan 5
These look like manual deposits to "top up" IB and fee accounts. However, in the Excel model, IB and fee balances accumulate purely through yield allocations — they don't receive deposits. These deposits inflate cost_basis and change the accounting model. Need to verify if the Excel expects these.

### 5. LOW: Voided Feb 28 and Mar 31 Yield Distributions
Both were voided (correctly). Feb 28 used AUM=795/795 (zero yield). Mar 31 used AUM=500,000 (arbitrary). The voiding was the right call, but these periods have no valid yield recorded.

### 6. INFO: Multiple Voided Withdrawals
17 voided withdrawal/dust_sweep transactions exist from testing. All properly voided — no ledger impact.

---

## Proposed Fix Plan

### Step 1: Delete garbage AUM records (migration)
Remove all `fund_daily_aum` rows where `total_aum = 795` for the XRP fund. These are clearly corrupt.

### Step 2: Void the Jan 31 yield distribution
Void distribution `7aa69026-b8bc-4b87-99e1-27011b1ecc23` and its 3 associated transactions (Ryan YIELD 0.48, Indigo FEE_CREDIT 0.12, Indigo YIELD 2.40). This underpaid distribution needs to be replaced.

### Step 3: Remove the stray 0.1 YIELD
Void the orphan 0.1 YIELD to Indigo Fees (no distribution_id, Nov 30, purpose=transaction).

### Step 4: Verify Jan 5 deposits against Excel
Confirm whether the Excel expects Ryan and Indigo to receive deposits of 63.284 and 253.136 respectively, or if these should be voided.

### Step 5: Re-apply Jan 31 yield with correct AUM
Use the V5 yield engine to record January yield with the correct AUM (to be determined from the Excel). This will correctly allocate yield to all participants.

### Step 6: Apply missing Feb and Mar yield (if Excel has them)
If the Excel shows yield for Feb and Mar, apply those distributions using the correct AUM values.

### Step 7: Run integrity pack
Verify zero violations across all 13 checks after corrections.

---

## What I Need From You

1. **The Excel file** — or tell me the expected AUM values for Jan 31, Feb 28, and Mar 31 from the XRP sheet so I can apply the correct yield distributions.
2. **Confirm the Jan 5 deposits** — are the 63.284 (Ryan) and 253.136 (Indigo) deposits real, or were they test entries?
3. **Confirm the stray 0.1 YIELD** — should this be voided?

Once confirmed, I'll execute all fixes in a single session with full ledger reconciliation.

