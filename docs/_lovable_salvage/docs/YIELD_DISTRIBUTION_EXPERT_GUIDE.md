# Yield Distribution Expert Guide

**Date:** 2026-01-27
**Purpose:** Complete reference for manual yield distribution - Platform is source of truth

---

## Critical Principle

> **Excel = Reference for monthly fund performance rates ONLY**
> **Platform = Source of truth for everything else**

| Data Point | Source |
|------------|--------|
| Monthly fund gross yield % | Excel (input) |
| Investor fee rates | **Platform** (`investor_fee_schedule` or `profiles.fee_pct`) |
| IB commission rates | **Platform** (`profiles.ib_percentage`) |
| Yield allocation method | **Platform** (ADB time-weighted) |
| Position balances | **Platform** (`investor_positions`) |
| Transaction history | **Platform** (`transactions_v2`) |

---

## Table of Contents

1. [Current Platform State](#1-current-platform-state)
2. [Monthly Fund Performance Rates (from Excel)](#2-monthly-fund-performance-rates-from-excel)
3. [Platform Logic & Formulas](#3-platform-logic--formulas)
4. [Current Investor Fee Schedule (Platform)](#4-current-investor-fee-schedule-platform)
5. [Distribution Process](#5-distribution-process)
6. [Verification](#6-verification)

---

## 1. Current Platform State

### Status
| Metric | Value |
|--------|-------|
| Transactions Loaded | 144 |
| Health Checks | 8/8 PASS |
| Yield Distributions Applied | 0 (none yet) |

### Current Fund AUM (Platform Data)
| Fund | Investors | Total AUM |
|------|-----------|-----------|
| IND-BTC | 11 | 34.8725 BTC |
| IND-ETH | 9 | 601.2273 ETH |
| IND-USDT | 16 | 7,276,107.58 USDT |
| IND-SOL | 1 | 87.98 SOL |
| IND-XRP | 0 | 0 XRP |

---

## 2. Monthly Fund Performance Rates (from Excel)

**These are the ONLY values we take from Excel** - the gross yield rate that the fund achieved each month.

### Gross Performance Rates by Fund

| Month | BTC | ETH | USDT | SOL | XRP |
|-------|-----|-----|------|-----|-----|
| **2024-07** | 0.6375% | 1.2500% | 1.5375% | 0.8875% | - |
| **2024-08** | 0.4750% | 0.8875% | 1.7000% | 0.9250% | - |
| **2024-09** | 0.5500% | 0.8125% | 1.6000% | 0.8250% | - |
| **2024-10** | 0.5000% | 1.6625% | 1.6500% | 0.8750% | - |
| **2024-11** | 0.5500% | 1.6625% | 1.5500% | 1.0750% | - |
| **2024-12** | 0.7000% | 1.6625% | 1.5875% | 1.2750% | - |
| **2025-01** | 0.5875% | 0.5625% | 1.6250% | 1.3125% | - |
| **2025-02** | 0.3875% | 1.2375% | 1.5750% | 1.1125% | - |
| **2025-03** | 0.3875% | 0.2875% | 1.6375% | 1.2375% | - |
| **2025-04** | 1.0625% | 1.2000% | 1.0375% | 1.2250% | - |
| **2025-05** | 0.6000% | 0.2375% | 0.9625% | 1.2750% | - |
| **2025-06** | 0.3875% | 0.2250% | 1.2625% | 1.2750% | - |
| **2025-07** | 0.4875% | 1.0000% | 0.6625% | 1.1750% | - |
| **2025-08** | 0.3625% | 0.8625% | 1.0000% | 1.0625% | 0.8375% |
| **2025-09** | 0.3500% | 0.7250% | 0.8750% | 1.0875% | 0.7750% |
| **2025-10** | 0.3375% | 0.7500% | 0.9375% | 1.0125% | 0.7625% |
| **2025-11** | 0.3125% | 0.5750% | 0.8500% | 0.7125% | 0.7500% |
| **2025-12** | 0.2750% | 0.6375% | 0.7500% | 0.8375% | 0.6875% |

**Usage:**
```
Gross Yield Amount = Fund Opening AUM × Gross Rate
```

---

## 3. Platform Logic & Formulas

### 3.1 ADB (Average Daily Balance) Allocation

The platform uses **time-weighted** allocation - fairer than simple month-end balance.

```
ADB = Σ(daily_balance × days_at_balance) / total_days_in_period
```

**Example:**
- Investor deposits 100,000 USDT on day 15 of 30-day month
- ADB = (0 × 14 + 100,000 × 16) / 30 = **53,333 USDT**
- Gets yield on 53,333, NOT full 100,000

### 3.2 Yield Allocation (Per Investor)

```
investor_share = investor_adb / fund_total_adb

gross_yield_share = total_gross_yield × investor_share

fee_amount = gross_yield_share × (investor_fee_pct / 100)

net_yield = gross_yield_share - fee_amount
```

### 3.3 IB Commission

```
ib_amount = fee_amount × (ib_percentage / 100)
```

IB gets percentage of **FEES**, not yield.

### 3.4 Conservation Identity (Enforced by Platform)

```
GROSS YIELD = NET YIELD + FEES
```

This is enforced at database level. Distribution fails if violated.

---

## 4. Current Investor Fee Schedule (Platform)

**These are the CORRECT fees - from the platform, not Excel.**

### IND-BTC
| Investor | Position | Fee % | IB % | IB Parent |
|----------|----------|-------|------|-----------|
| Blondish | 4.1210 | **20%** | 0% | - |
| Danielle Richetta | 3.9030 | **10%** | 0% | - |
| Jose Molla | 4.5647 | **20%** | 0% | - |
| Kabbaj | 6.6593 | **20%** | 0% | - |
| Kyle Gulamerian | 3.9998 | **15%** | 0% | - |
| Nath & Thomas | 1.0000 | **20%** | 0% | - |
| Nathanaël Cohen | 0.4483 | **20%** | 0% | - |
| NSVO Holdings | 0.6220 | **20%** | 0% | - |
| Oliver Loisel | 2.1154 | **10%** | 0% | - |
| Thomas Puech | 7.2899 | **20%** | 0% | - |
| Victoria Pariente-Cohen | 0.1492 | **0%** | 0% | - |

### IND-ETH
| Investor | Position | Fee % | IB % | IB Parent |
|----------|----------|-------|------|-----------|
| Advantage Blockchain | 50.0000 | **18%** | 0% | - |
| Babak Eftekhari | 66.1100 | **18%** | **2%** | Lars Ahlgreen |
| Blondish | 124.7940 | **20%** | 0% | - |
| Brandon Hood | 31.3700 | **20%** | 0% | - |
| INDIGO FEES | 0.0359 | **0%** | 0% | - |
| Jose Molla | 65.2064 | **20%** | 0% | - |
| Nathanaël Cohen | 48.1439 | **20%** | 0% | - |
| NSVO Holdings | 25.0300 | **20%** | 0% | - |
| Tomer Zur | 190.5371 | **20%** | 0% | - |

### IND-USDT
| Investor | Position | Fee % | IB % | IB Parent |
|----------|----------|-------|------|-----------|
| Alain Bensimon | 136,737 | **10%** | 0% | - |
| Anne Cecile Noique | 222,687 | **10%** | 0% | - |
| Babak Eftekhari | 233,132 | **18%** | **2%** | Lars Ahlgreen |
| Bo Kriek | 273,807 | **10%** | 0% | - |
| Dario Deiana | 199,660 | **20%** | 0% | - |
| HALLEY86 | 99,990 | **20%** | 0% | - |
| Julien Grunebaum | 109,392 | **10%** | 0% | - |
| Matthew Beatty | 334,704 | **10%** | 0% | - |
| Monica Levy Chicheportiche | 840,168 | **20%** | 0% | - |
| Pierre Bezençon | 109,333 | **10%** | 0% | - |
| Sacha Oshry | 100,000 | **15%** | 0% | - |
| Sam Johnson | 4,200,000 | **16%** | **4%** | Ryan Van Der Wall |
| Terance Chen | 219,747 | **10%** | 0% | - |
| Thomas Puech | 46,751 | **20%** | 0% | - |
| Valeria Cruz | 50,000 | **20%** | 0% | - |
| Ventures Life Style | 100,000 | **16%** | 0% | - |

### IND-SOL
| Investor | Position | Fee % | IB % | IB Parent |
|----------|----------|-------|------|-----------|
| Jose Molla | 87.98 | **20%** | 0% | - |

---

## 5. Distribution Process

### What You Input

For each distribution, you only need to provide:

1. **Fund** (e.g., IND-USDT)
2. **Period** (e.g., July 2024)
3. **Gross Yield Amount** = Opening AUM × Gross Rate from Section 2

### What Platform Calculates Automatically

- Each investor's ADB for the period
- Each investor's share of gross yield
- Each investor's fee (using their PLATFORM fee rate)
- Each investor's net yield
- IB commissions (for investors with IB parents)
- All transactions to create

### Step-by-Step

1. **Calculate Gross Yield:**
   ```
   Opening AUM (from platform) × Gross Rate (from Section 2)
   ```

2. **In Admin UI → Yield Operations:**
   - Select Fund
   - Select Month
   - Enter Gross Yield Amount
   - Set Effective Date (last day of month)
   - Click Preview

3. **Review Preview:**
   - Check investor allocations use correct platform fees
   - Verify conservation: gross = net + fees
   - Check IB commissions for applicable investors

4. **Apply Distribution**

---

## 6. Verification

### After Each Distribution

```sql
-- Verify conservation
SELECT
  f.code,
  yd.effective_date,
  yd.gross_yield,
  yd.net_yield,
  yd.total_fees,
  yd.gross_yield - (yd.net_yield + yd.total_fees) as gap
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
WHERE NOT COALESCE(yd.is_voided, false)
ORDER BY yd.effective_date DESC
LIMIT 1;
-- gap should be 0
```

### After All 77 Distributions

```sql
-- Count (should be 77)
SELECT COUNT(*) FROM yield_distributions
WHERE NOT COALESCE(is_voided, false);

-- Position-ledger integrity
SELECT
  f.code,
  CONCAT(p.first_name, ' ', p.last_name) as investor,
  ip.current_value as position,
  SUM(t.amount) as ledger_sum
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
JOIN profiles p ON ip.investor_id = p.id
LEFT JOIN transactions_v2 t
  ON t.investor_id = ip.investor_id
  AND t.fund_id = ip.fund_id
  AND NOT t.is_voided
GROUP BY f.code, p.first_name, p.last_name, ip.current_value
HAVING ABS(ip.current_value - SUM(t.amount)) > 0.00000001;
-- Should return 0 rows
```

---

## Distribution Schedule

**77 total distributions:**
- IND-BTC: 18 (Jul 2024 - Dec 2025)
- IND-ETH: 18 (Jul 2024 - Dec 2025)
- IND-USDT: 18 (Jul 2024 - Dec 2025)
- IND-SOL: 18 (Jul 2024 - Dec 2025)
- IND-XRP: 5 (Aug 2025 - Dec 2025)

### Order per Month
BTC → ETH → USDT → SOL → XRP (if applicable)

---

## Example Calculation

### IND-USDT, July 2024

**Input (from Excel):** Gross Rate = 1.5375%

**Platform Data:**
- Opening AUM: 5,000,000 USDT
- Gross Yield = 5,000,000 × 0.015375 = **76,875 USDT**

**Platform Calculates (example investor):**

Sam Johnson:
- ADB: 4,000,000 USDT (80% of fund ADB)
- Gross Share: 76,875 × 0.80 = 61,500 USDT
- Fee (16%): 61,500 × 0.16 = 9,840 USDT
- Net Yield: 61,500 - 9,840 = **51,660 USDT**
- IB (4% of fees): 9,840 × 0.04 = **393.60 USDT** → Ryan Van Der Wall

**Conservation Check:**
- Total Gross: 76,875
- Total Net: ~64,575 (varies by investor fees)
- Total Fees: ~12,300
- 76,875 = 64,575 + 12,300 ✓

---

## Key Points

1. **Excel rates are just fund-level performance** - nothing else from Excel
2. **Platform fees are correct** - use `investor_fee_schedule` or `profiles.fee_pct`
3. **Platform IB logic is correct** - uses `profiles.ib_percentage` and `ib_parent_id`
4. **ADB allocation is fairer** - time-weighted, not simple month-end
5. **Conservation is enforced** - platform won't allow gross ≠ net + fees

---

**Document Version:** 2.0
**Last Updated:** 2026-01-27
