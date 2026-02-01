# Yield Distribution - Quick Numbers Reference

> **Excel = Fund performance rates ONLY**
> **Platform = Everything else (fees, allocation, IB)**

---

## Gross Performance Rates (from Excel)

### IND-BTC
| Month | Gross Rate |
|-------|------------|
| 2024-07 | 0.6375% |
| 2024-08 | 0.4750% |
| 2024-09 | 0.5500% |
| 2024-10 | 0.5000% |
| 2024-11 | 0.5500% |
| 2024-12 | 0.7000% |
| 2025-01 | 0.5875% |
| 2025-02 | 0.3875% |
| 2025-03 | 0.3875% |
| 2025-04 | 1.0625% |
| 2025-05 | 0.6000% |
| 2025-06 | 0.3875% |
| 2025-07 | 0.4875% |
| 2025-08 | 0.3625% |
| 2025-09 | 0.3500% |
| 2025-10 | 0.3375% |
| 2025-11 | 0.3125% |
| 2025-12 | 0.2750% |

### IND-ETH
| Month | Gross Rate |
|-------|------------|
| 2024-07 | 1.2500% |
| 2024-08 | 0.8875% |
| 2024-09 | 0.8125% |
| 2024-10 | 1.6625% |
| 2024-11 | 1.6625% |
| 2024-12 | 1.6625% |
| 2025-01 | 0.5625% |
| 2025-02 | 1.2375% |
| 2025-03 | 0.2875% |
| 2025-04 | 1.2000% |
| 2025-05 | 0.2375% |
| 2025-06 | 0.2250% |
| 2025-07 | 1.0000% |
| 2025-08 | 0.8625% |
| 2025-09 | 0.7250% |
| 2025-10 | 0.7500% |
| 2025-11 | 0.5750% |
| 2025-12 | 0.6375% |

### IND-USDT
| Month | Gross Rate |
|-------|------------|
| 2024-07 | 1.5375% |
| 2024-08 | 1.7000% |
| 2024-09 | 1.6000% |
| 2024-10 | 1.6500% |
| 2024-11 | 1.5500% |
| 2024-12 | 1.5875% |
| 2025-01 | 1.6250% |
| 2025-02 | 1.5750% |
| 2025-03 | 1.6375% |
| 2025-04 | 1.0375% |
| 2025-05 | 0.9625% |
| 2025-06 | 1.2625% |
| 2025-07 | 0.6625% |
| 2025-08 | 1.0000% |
| 2025-09 | 0.8750% |
| 2025-10 | 0.9375% |
| 2025-11 | 0.8500% |
| 2025-12 | 0.7500% |

### IND-SOL
| Month | Gross Rate |
|-------|------------|
| 2024-07 | 0.8875% |
| 2024-08 | 0.9250% |
| 2024-09 | 0.8250% |
| 2024-10 | 0.8750% |
| 2024-11 | 1.0750% |
| 2024-12 | 1.2750% |
| 2025-01 | 1.3125% |
| 2025-02 | 1.1125% |
| 2025-03 | 1.2375% |
| 2025-04 | 1.2250% |
| 2025-05 | 1.2750% |
| 2025-06 | 1.2750% |
| 2025-07 | 1.1750% |
| 2025-08 | 1.0625% |
| 2025-09 | 1.0875% |
| 2025-10 | 1.0125% |
| 2025-11 | 0.7125% |
| 2025-12 | 0.8375% |

### IND-XRP (starts Aug 2025)
| Month | Gross Rate |
|-------|------------|
| 2025-08 | 0.8375% |
| 2025-09 | 0.7750% |
| 2025-10 | 0.7625% |
| 2025-11 | 0.7500% |
| 2025-12 | 0.6875% |

---

## Formula

```
Gross Yield Amount = Opening AUM × Gross Rate
```

**Example:** IND-USDT July 2024
- Opening AUM: 5,000,000 USDT
- Gross Rate: 1.5375%
- Gross Yield = 5,000,000 × 0.015375 = **76,875 USDT**

---

## Platform Handles Automatically

| Calculation | Source |
|-------------|--------|
| Investor ADB | Platform computes from transactions |
| Fee rates | `investor_fee_schedule.fee_pct` or `profiles.fee_pct` |
| IB rates | `profiles.ib_percentage` |
| Allocation | ADB-weighted (time-weighted) |
| Conservation | Enforced: gross = net + fees |

---

## Distribution Checklist (77 total)

### 2024
- [ ] Jul: BTC, ETH, USDT, SOL
- [ ] Aug: BTC, ETH, USDT, SOL
- [ ] Sep: BTC, ETH, USDT, SOL
- [ ] Oct: BTC, ETH, USDT, SOL
- [ ] Nov: BTC, ETH, USDT, SOL
- [ ] Dec: BTC, ETH, USDT, SOL

### 2025
- [ ] Jan: BTC, ETH, USDT, SOL
- [ ] Feb: BTC, ETH, USDT, SOL
- [ ] Mar: BTC, ETH, USDT, SOL
- [ ] Apr: BTC, ETH, USDT, SOL
- [ ] May: BTC, ETH, USDT, SOL
- [ ] Jun: BTC, ETH, USDT, SOL
- [ ] Jul: BTC, ETH, USDT, SOL
- [ ] Aug: BTC, ETH, USDT, SOL, **XRP**
- [ ] Sep: BTC, ETH, USDT, SOL, XRP
- [ ] Oct: BTC, ETH, USDT, SOL, XRP
- [ ] Nov: BTC, ETH, USDT, SOL, XRP
- [ ] Dec: BTC, ETH, USDT, SOL, XRP
