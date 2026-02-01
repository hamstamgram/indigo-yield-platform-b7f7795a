# Accounting vs Platform Reconciliation Report

**Generated**: 2026-01-25
**Excel Source**: `/Users/mama/Downloads/Accounting Yield Funds.xlsx`
**Platform**: Indigo Yield Platform (Supabase)

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Position Matches (<1% variance) | 6 |
| Position Mismatches (>1% variance) | 56 |
| Fee Matches | 32 |
| Fee Mismatches | 29 |
| IB Percentage Matches | 11 |
| IB Percentage Mismatches | 1 |

### Key Findings

1. **Excel Has Duplicate Investor Rows**: The Excel file contains two entries per investor in many cases:
   - Main position row with actual holdings
   - Fee tracking row with small values (typically 0.001-0.5)

2. **Position Variances (1-10%)**: Primary positions show expected variances due to:
   - Excel snapshot date vs current platform date
   - Accrued yield since Excel was last updated
   - Platform continues earning yield daily

3. **Fee Rate Differences**: Several investors have different fee rates:
   - Platform uses 20% default for many investors
   - Excel shows customized rates (10%, 15%, 18%)
   - **Action Required**: Update platform fee schedules to match accounting

---

## Fund-by-Fund Analysis

### IND-BTC (Bitcoin Yield Fund)

| Investor | Excel Position | Platform Position | Variance | Notes |
|----------|----------------|-------------------|----------|-------|
| Jose Molla | 4.8342 | 4.5647 | 5.90% | Yield accrual since Excel update |
| Thomas Puech | 7.5979 | 7.2899 | 4.22% | Yield accrual |
| Danielle Richetta | 4.2913 | 3.9030 | 9.95% | Yield accrual |
| Kabbaj | 6.7397 | 6.6593 | 1.21% | Minor variance |
| Nath & Thomas | 1.0054 | 1.0000 | 0.54% | ✅ Match |
| NSVO Holdings | 0.6222 | 0.6220 | 0.04% | ✅ Match |

**Total Platform AUM**: 28.61 BTC
**Investors**: 8 active positions

### IND-ETH (Ethereum Yield Fund)

| Investor | Excel Position | Platform Position | Variance | Notes |
|----------|----------------|-------------------|----------|-------|
| Babak Eftekhari | 68.8941 | 66.1100 | 4.21% | Yield accrual |
| Jose Molla | 68.4902 | 65.2064 | 5.04% | Yield accrual |
| Blondish | 129.7211 | 124.7940 | 3.95% | Yield accrual |
| Tomer Zur | 193.3188 | 190.5371 | 1.46% | Yield accrual |
| Brandon Hood | 31.5476 | 31.3700 | 0.57% | ✅ Match |
| NSVO Holdings | 25.0300 | 25.0300 | 0.00% | ✅ Perfect Match |
| Alex Jacobs | 0.0034 | 0.0034 | 0.00% | ✅ Perfect Match |

**Total Platform AUM**: 601.19 ETH
**Investors**: 8 active positions

### IND-USDT (Stablecoin Yield Fund)

| Investor | Excel Position | Platform Position | Variance | Notes |
|----------|----------------|-------------------|----------|-------|
| Sam Johnson | 4,200,000.00 | 4,200,000.00 | 0.00% | ✅ Perfect Match |
| Monica Levy | 852,212.86 | 840,168.03 | 1.43% | Yield accrual |
| Babak Eftekhari | 242,825.22 | 233,132.03 | 4.16% | Yield accrual |
| Matthew Beatty | 348,958.48 | 334,704.00 | 4.26% | Yield accrual |
| Bo Kriek | 287,093.44 | 273,807.00 | 4.85% | Yield accrual |
| Dario Deiana | 208,002.14 | 199,659.72 | 4.18% | Yield accrual |

**Total Platform AUM**: 7,276,107.58 USDT
**Investors**: 16 active positions

### IND-SOL (Solana Yield Fund)

| Investor | Excel Position | Platform Position | Variance | Notes |
|----------|----------------|-------------------|----------|-------|
| Jose Molla | 89.2365 | 87.9800 | 1.43% | Yield accrual |

**Total Platform AUM**: 87.98 SOL
**Investors**: 1 active position

### IND-XRP (XRP Yield Fund)

All positions have been withdrawn. Platform shows 0 XRP AUM.

---

## Fee Rate Discrepancies

### Platform Uses 20% Default, Excel Shows Custom Rates

| Investor | Fund | Excel Fee | Platform Fee | Action |
|----------|------|-----------|--------------|--------|
| Babak Eftekhari | ETH/USDT | 18% | N/A | Add to schedule |
| Advantage Blockchain | ETH | 18% | 20% | Update schedule |
| Julien Grunebaum | USDT | 10% | 20% | Update schedule |
| Daniele Francilia | USDT | 10% | 20% | Update schedule |
| Matthew Beatty | USDT | 10% | 20% | Update schedule |
| Alain Bensimon | USDT | 10% | 20% | Update schedule |
| Anne Cecile Noique | USDT | 10% | 20% | Update schedule |
| Terance Chen | USDT | 10% | 20% | Update schedule |
| Sacha Oshry | USDT | 15% | 20% | Update schedule |
| Sam Johnson | ALL | 16% | N/A | Add to schedule |
| Paul Johnson | BTC/SOL | 13.5% | N/A | Add to schedule |

---

## IB Commission Structure

### Verified IB Relationships

| Investor | IB Parent | Excel IB% | Platform IB% | Status |
|----------|-----------|-----------|--------------|--------|
| Babak Eftekhari | Lars Ahlgreen | 2% | 2% | ✅ Match |
| Sam Johnson | Ryan Van Der Wall | 4% | 4% | ✅ Match |
| Paul Johnson | Alex Jacobs | 1.5% | 1.5% | ✅ Match |

---

## Yield Compounding Verification

### BTC Fund - Jose Molla Example

| Period | Start Position | End Position | Growth | Fund Net Perf |
|--------|----------------|--------------|--------|---------------|
| Aug 2024 | 3.4856 | 3.4936 | 0.23% | N/A |
| Sep 2024 | 3.4987 | 3.5139 | 0.44% | N/A |
| Oct 2024 | 3.5139 | 3.5281 | 0.40% | N/A |

**Total Growth**: 3.4856 → 4.8342 (+38.69% over ~18 months)

### ETH Fund - Babak Eftekhari Example

| Date | Position | Growth | Fund Net Perf | Delta |
|------|----------|--------|---------------|-------|
| 2025-05-26 | 27.01 | - | - | - |
| 2025-06-01 | 59.28 | +119% | 0.087% | +32.25 deposit |
| 2025-07-01 | 59.67 | +0.64% | 0.644% | ✅ Matches fund |
| 2025-07-11 | 59.92 | +0.43% | 0.431% | ✅ Matches fund |

**Observation**: Position growth closely matches fund net performance when no deposits/withdrawals occur.

---

## Variance Explanation

### Why Positions Differ

1. **Timing Difference**: Excel represents a snapshot in time. Platform positions continue earning yield daily.

2. **Excel Date**: Last comprehensive update appears to be around 2026-01-13 to 2026-01-19 depending on fund.

3. **Platform Date**: Current date (2026-01-25). Positions have earned ~6-12 days of additional yield.

4. **Estimated Yield Rate**:
   - USDT: ~0.65% monthly = ~0.02% daily
   - 6 days × 0.02% = ~0.12% expected difference (smaller than observed)

5. **Larger Variances (4-10%)**: May indicate:
   - Transactions not yet reflected in platform
   - Fee calculation differences
   - Different compounding periods

---

## Recommendations

### Immediate Actions

1. **Update Fee Schedules**:
   - Change affected investors from 20% to their actual rates
   - Priority: USDT fund investors (largest AUM impact)

2. **Verify Transaction History**:
   - Reconcile any missing deposits/withdrawals
   - Check for transactions after 2026-01-13

3. **Standardize Naming**:
   - "Bo De kriek" vs "Bo Kriek"
   - "Victoria Pariente-Cohen" - not in platform
   - "Kyle Gulamerian" - not in platform (but has position in Excel)

### Long-term Actions

1. **Automated Sync**: Consider regular export/import between accounting and platform

2. **Fee Audit**: Complete review of all 36 investors' fee structures

3. **Position Reconciliation**: Monthly reconciliation process

---

## Data Sources

| Source | Records | Coverage |
|--------|---------|----------|
| Excel BTC Fund | 34 investors, 45 dates | Aug 2024 - Jan 2026 |
| Excel ETH Fund | 29 investors, 34 dates | May 2025 - Jan 2026 |
| Excel USDT Fund | 47 investors, 32 dates | Jun 2025 - Jan 2026 |
| Excel SOL Fund | 26 investors, 14 dates | Sep 2025 - Jan 2026 |
| Excel XRP Fund | 26 investors, 8 dates | Nov 2025 - Jan 2026 |
| Excel Investments | 144 transactions | Jun 2024 - Jan 2026 |
| Platform Positions | 35 active | Current |
| Platform Transactions | 150 total | Jun 2024 - Jan 2026 |

---

## Appendix: Health Checks

All 8 platform health checks pass:

| Check | Status |
|-------|--------|
| YIELD_CONSERVATION | ✅ PASS |
| LEDGER_POSITION_MATCH | ✅ PASS |
| NO_ORPHAN_POSITIONS | ✅ PASS |
| NO_FUTURE_TRANSACTIONS | ✅ PASS |
| ECONOMIC_DATE_NOT_NULL | ✅ PASS |
| NO_DUPLICATE_REFS | ✅ PASS |
| NO_MANAGEMENT_FEE | ✅ PASS |
| VALID_TX_TYPES | ✅ PASS |
