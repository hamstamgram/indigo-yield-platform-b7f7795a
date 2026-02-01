# Database Integrity Test Report

**Date:** 2026-01-27
**Purpose:** Verify platform data integrity before yield distribution

---

## Executive Summary

| Category | Status |
|----------|--------|
| **Core Integrity** | ✅ PASS |
| **Ledger Accuracy** | ✅ PASS |
| **Fee Configuration** | ✅ PASS |
| **IB Relationships** | ✅ PASS |
| **Negative Positions** | ⚠️ EXPECTED (15 investors) |

**Verdict:** Platform data is correct and ready for yield distribution. Negative positions are expected - they will be resolved once historical yields are applied.

---

## Test Results

### Core Integrity Tests

| # | Test | Result | Details |
|---|------|--------|---------|
| 1 | Position-Ledger Match | ✅ PASS | All positions = SUM(transactions) |
| 2 | No Orphan Positions | ✅ PASS | Every position has transactions |
| 3 | Transaction Count | ✅ PASS | 144 transactions loaded |
| 4 | No Future Transactions | ✅ PASS | All tx_date ≤ today |
| 5 | Fee Rates Set | ✅ PASS | All investors have fee rates |
| 6 | IB Parents Valid | ✅ PASS | All IB parents exist |
| 7 | No Duplicate Transactions | ✅ PASS | 0 duplicates |
| 8 | No Yield TX Yet | ✅ PASS | Only DEPOSIT/WITHDRAWAL types |
| 9 | No Existing Distributions | ✅ PASS | 0 yield distributions |

---

## Current State Summary

### Position Counts
| Status | Count | Total Value |
|--------|-------|-------------|
| Positive | 37 | 7,276,831.66 |
| Negative | 15 | -13,982.50 |
| Zero | 1 | 0.00 |
| **Total** | **53** | **7,262,849.16** |

### Fund AUM (Positive Positions Only)
| Fund | Investors | AUM |
|------|-----------|-----|
| IND-BTC | 11 | 34.8725 BTC |
| IND-ETH | 9 | 601.2273 ETH |
| IND-USDT | 16 | 7,276,107.58 USDT |
| IND-SOL | 1 | 87.98 SOL |

### Transaction Types
| Type | Count |
|------|-------|
| DEPOSIT | 115 |
| WITHDRAWAL | 29 |
| **Total** | **144** |

---

## Negative Positions (Expected)

These investors withdrew more than they deposited. Once historical yields are applied, these should become positive or zero.

### By Fund
| Fund | Count | Total Negative |
|------|-------|----------------|
| IND-USDT | 5 | -12,008.66 |
| IND-XRP | 1 | -1,897.42 |
| IND-SOL | 3 | -74.61 |
| IND-ETH | 2 | -1.42 |
| IND-BTC | 4 | -0.40 |

### Individual Breakdown
| Investor | Fund | Position |
|----------|------|----------|
| Daniele Francilia | IND-USDT | -5,091.59 |
| INDIGO Ventures | IND-USDT | -2,709.59 |
| INDIGO DIGITAL ASSET FUND LP | IND-USDT | -2,471.65 |
| Sam Johnson | IND-XRP | -1,897.42 |
| Nath & Thomas | IND-USDT | -1,522.83 |
| Jose Molla | IND-USDT | -213.00 |
| Sam Johnson | IND-SOL | -37.10 |
| INDIGO DIGITAL ASSET FUND LP | IND-SOL | -35.66 |
| Paul Johnson | IND-SOL | -1.85 |
| Sam Johnson | IND-ETH | -1.23 |
| Matthias Reiser | IND-BTC | -0.37 |
| Paul Johnson | IND-ETH | -0.19 |
| Sam Johnson | IND-BTC | -0.02 |
| Vivie & Liana | IND-BTC | -0.01 |
| Paul Johnson | IND-BTC | -0.001 |

**Note:** These are accurate ledger positions. The investors received withdrawals in advance of yield distribution.

---

## IB Relationships (Verified)

| Investor | Fund | Position | IB % | IB Parent |
|----------|------|----------|------|-----------|
| Babak Eftekhari | IND-ETH | 66.11 | 2% | Lars Ahlgreen |
| Babak Eftekhari | IND-USDT | 233,132.03 | 2% | Lars Ahlgreen |
| Sam Johnson | IND-USDT | 4,200,000.00 | 4% | Ryan Van Der Wall |

---

## Fee Distribution

### IND-BTC
| Fee % | Investors | AUM |
|-------|-----------|-----|
| 0% | 1 | 0.1492 |
| 10% | 2 | 6.0184 |
| 15% | 1 | 3.9998 |
| 20% | 7 | 24.7052 |

### IND-ETH
| Fee % | Investors | AUM |
|-------|-----------|-----|
| 0% | 1 | 0.0359 |
| 18% | 2 | 116.1100 |
| 20% | 6 | 485.0813 |

### IND-USDT
| Fee % | Investors | AUM |
|-------|-----------|-----|
| 10% | 7 | 1,406,407 |
| 15% | 1 | 100,000 |
| 16% | 2 | 4,300,000 |
| 18% | 1 | 233,132 |
| 20% | 5 | 1,236,569 |

### IND-SOL
| Fee % | Investors | AUM |
|-------|-----------|-----|
| 20% | 1 | 87.98 |

---

## Transaction Date Ranges

| Fund | First TX | Last TX | Count |
|------|----------|---------|-------|
| IND-BTC | 2024-06-12 | 2026-01-26 | 43 |
| IND-ETH | 2024-06-12 | 2026-01-26 | 46 |
| IND-SOL | 2025-09-02 | 2026-01-02 | 11 |
| IND-USDT | 2025-06-16 | 2026-01-19 | 38 |
| IND-XRP | 2025-11-17 | 2026-01-02 | 6 |

---

## Fee Schedule Coverage

| Fund | Total Investors | With Fee Schedule | Using Profile Default |
|------|-----------------|-------------------|----------------------|
| IND-BTC | 11 | 11 | 0 |
| IND-ETH | 9 | 8 | 1 |
| IND-SOL | 1 | 1 | 0 |
| IND-USDT | 16 | 16 | 0 |

---

## Verification SQL Queries

### 1. Position-Ledger Match
```sql
SELECT
  f.code, CONCAT(p.first_name, ' ', p.last_name) as investor,
  ip.current_value as position,
  SUM(t.amount) as tx_sum,
  ip.current_value - SUM(t.amount) as variance
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
JOIN profiles p ON ip.investor_id = p.id
LEFT JOIN transactions_v2 t
  ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
  AND NOT COALESCE(t.is_voided, false)
GROUP BY f.code, p.first_name, p.last_name, ip.current_value
HAVING ABS(ip.current_value - SUM(t.amount)) > 0.00000001;
-- Expected: 0 rows
```

### 2. Fund AUM Check
```sql
SELECT
  f.code, COUNT(DISTINCT ip.investor_id) as investors,
  SUM(ip.current_value) as aum
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
WHERE ip.current_value > 0
GROUP BY f.code;
```

### 3. Negative Positions
```sql
SELECT
  f.code, CONCAT(p.first_name, ' ', p.last_name) as investor,
  ip.current_value
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
JOIN profiles p ON ip.investor_id = p.id
WHERE ip.current_value < 0
ORDER BY ip.current_value;
```

---

## Conclusion

**Data Integrity: VERIFIED ✅**

- All 144 transactions correctly loaded
- All positions match ledger (SUM of transactions)
- All fee rates configured
- All IB relationships valid
- No orphaned or duplicate data

**Ready for Yield Distribution:** Yes

**Negative Positions:** Expected and ledger-accurate. Will resolve after historical yields are applied (July 2024 - Dec 2025).

---

**Report Version:** 1.0
**Generated:** 2026-01-27
