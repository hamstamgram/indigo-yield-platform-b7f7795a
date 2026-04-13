# Database Flow Architecture - Indigo Yield

## Overview
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CAPITAL FLOW ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEPOSIT FLOW:                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐  │
│  │  Admin   │───▶│ apply_deposit│───▶│transactions_v2│───▶│investor_    │  │
│  │  UI      │    │ _with_cryst  │    │  (ledger)     │    │ positions   │  │
│  └──────────┘    └──────────────┘    └────────────────┘    └──────────────┘  │
│                          │                        │                         │
│                          │                        ▼                         │
│                          │                ┌────────────────┐                │
│                          └───────────────▶│fund_daily_aum  │                │
│                                           └────────────────┘                │
│                                                                             │
│  YIELD DISTRIBUTION FLOW:                                                   │
│  ┌──────────┐    ┌────────────────────────┐    ┌────────────────────┐      │
│  │  Admin   │───▶│apply_segmented_yield_  │───▶│yield_distributions │      │
│  │  Yield   │    │distribution_v5        │    │                    │      │
│  └──────────┘    └────────────────────────┘    └─────────┬──────────┘      │
│                                                           │                 │
│           ┌──────────────────┬───────────────────────────┤                 │
│           ▼                  ▼                    ▼                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │yield_        │  │fee_          │  │ib_           │  │platform_fee_ │  │
│  │allocations   │  │allocations   │  │allocations   │  │ledger        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│       │                  │                  │                  │           │
│       ▼                  ▼                  ▼                  ▼           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    transactions_v2 (multiple tx types)               │   │
│  │  - YIELD, FEE_CREDIT, IB_CREDIT, DUST_SWEEP, INTERNAL_CREDIT         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  VOID CASCADE:                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐                  │
│  │  void_   │───▶│ cascade to   │───▶│void all linked │                  │
│  │transaction│   │ allocations  │    │ transactions   │                  │
│  └──────────┘    └──────────────┘    └────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Tables & Columns

### 1. PROFILES (users)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| email | text | Unique |
| first_name | text | |
| last_name | text | |
| ib_parent_id | uuid | FK → profiles (self-ref) |
| ib_percentage | numeric | |
| account_type | enum | investor, ib, fees_account |
| is_admin | boolean | |
| role | text | app_role |

### 2. FUNDS
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| code | text | Unique (BTC, ETH, etc) |
| name | text | |
| asset | text | |
| status | enum | active, inactive, suspended |
| fund_class | text | |

### 3. TRANSACTIONS_V2 (canonical ledger)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| fund_id | uuid | FK → funds |
| investor_id | uuid | FK → profiles |
| type | enum | DEPOSIT, WITHDRAWAL, YIELD, etc |
| amount | numeric | |
| tx_date | date | |
| is_voided | boolean | |
| purpose | enum | reporting, transaction |
| source | enum | manual_admin, yield_distribution, etc |

**Triggers**: 20 triggers enforce canonical mutation, immutability, void cascade

### 4. INVESTOR_POSITIONS
| Column | Type | Description |
|--------|------|-------------|
| investor_id | uuid | PK (composite) |
| fund_id | uuid | PK (composite) |
| shares | numeric | |
| cost_basis | numeric | |
| current_value | numeric | |
| high_water_mark | numeric | |
| cumulative_yield_earned | numeric | |
| unrealized_pnl | numeric | |
| realized_pnl | numeric | |
| last_yield_crystallization_date | date | ✅ (just added) |

**Triggers**: 15 triggers for canonical enforcement, HWM, AUM sync

### 5. YIELD_DISTRIBUTIONS
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| fund_id | uuid | FK → funds |
| effective_date | date | |
| purpose | enum | reporting, transaction |
| status | text | draft, applied, voided |
| gross_yield | numeric | |
| net_yield | numeric | |
| investor_count | integer | |
| aum_record_id | uuid | FK → fund_daily_aum |

**Triggers**: 13 triggers for canonical, conservation, void cascade

### 6. FEE_ALLOCATIONS (platform fees)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| distribution_id | uuid | FK → yield_distributions |
| investor_id | uuid | FK → profiles |
| fund_id | uuid | FK → funds |
| fees_account_id | uuid | FK → profiles (fees_account) |
| fee_percentage | numeric | |
| fee_amount | numeric | |

### 7. IB_ALLOCATIONS (IB commissions)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| distribution_id | uuid | FK → yield_distributions |
| ib_investor_id | uuid | FK → profiles (IB) |
| source_investor_id | uuid | FK → profiles |
| ib_percentage | numeric | |
| ib_fee_amount | numeric | |

### 8. INVESTOR_FEE_SCHEDULE
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| investor_id | uuid | FK → profiles |
| fund_id | uuid | FK → funds (nullable = global) |
| fee_pct | numeric | |
| effective_date | date | |

### 9. IB_COMMISSION_SCHEDULE
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| investor_id | uuid | FK → profiles |
| fund_id | uuid | FK → funds (nullable = global) |
| ib_percentage | numeric | |
| effective_date | date | |

### 10. FUND_DAILY_AUM
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| fund_id | uuid | FK → funds |
| aum_date | date | |
| total_aum | numeric | |
| purpose | enum | reporting, transaction |

---

## Trigger Flow Diagram

### TRANSACTIONS_V2 → POSITIONS → AUM
```
transactions_v2 (INSERT)
     │
     ├─▶ trg_validate_transaction_fund_status (BEFORE)
     ├─▶ trg_validate_transaction_has_aum (BEFORE)
     ├─▶ trg_validate_tx_type (BEFORE)
     ├─▶ trg_enforce_canonical_transaction (BEFORE)
     │
     ├─▶ trg_ledger_sync (AFTER) ──────▶ fn_ledger_drives_position()
     │                                        │
     │                                        ▼
     │                                   investor_positions
     │                                        │
     │                                        ├─▶ trg_enforce_canonical_position (BEFORE)
     │                                        ├─▶ trg_calculate_unrealized_pnl (BEFORE)
     │                                        ├─▶ trg_maintain_hwm (BEFORE)
     │                                        │
     │                                        └─▶ trg_sync_aum_on_position (AFTER)
     │                                                  │
     │                                                  ▼
     │                                             fund_daily_aum
     │
     └─▶ trg_sync_yield_to_events (AFTER) ──▶ investor_yield_events
```

### YIELD DISTRIBUTION → ALLOCATIONS → TRANSACTIONS
```
yield_distributions (INSERT)
     │
     ├─▶ trg_validate_dust_tolerance (BEFORE)
     ├─▶ trg_enforce_canonical_yield (BEFORE)
     │
     ├─▶ generate yield_allocations
     │        │
     │        └─▶ transactions_v2 (YIELD type)
     │
     ├─▶ generate fee_allocations
     │        │
     │        └─▶ transactions_v2 (FEE_CREDIT type)
     │
     ├─▶ generate ib_allocations
     │        │
     │        └─▶ transactions_v2 (IB_CREDIT type)
     │
     └─▶ update platform_fee_ledger
```

### VOID CASCADE
```
void_transaction(id, admin_id, reason)
     │
     ▼
transactions_v2 (UPDATE is_voided = true)
     │
     └─▶ trg_cascade_void_from_transaction (AFTER)
              │
              ├─▶ fee_allocations (voided)
              ├─▶ ib_allocations (voided)
              ├─▶ yield_allocations (voided)
              └─▶ platform_fee_ledger (voided)
```

---

## Key RPC Functions

### Deposits
```sql
apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text,
  p_purpose text,
  p_tx_hash text,
  p_tx_subtype text
)
```

### Withdrawals
```sql
apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_requested_shares numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text,
  p_purpose text,
  p_tx_hash text,
  p_settlement_date date
)
```

### Yield Distribution
```sql
apply_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_effective_date date,
  p_gross_yield numeric,
  p_admin_id uuid,
  p_purpose text
)
-- Overloads: 5, 6, or 7 arguments
```

### Void
```sql
void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
```

---

## Common Issues & Fixes

### 1. Missing Column: last_yield_crystallization_date
**Status**: ✅ FIXED - Added to investor_positions

### 2. Canonical Mutation Block
**Issue**: Direct INSERT to transactions_v2 blocked
**Fix**: Use RPC functions: `apply_deposit_with_crystallization`, `apply_investor_transaction`

### 3. Profile Sensitive Fields
**Issue**: Cannot modify ib_parent_id, account_type without admin
**Fix**: Modified trigger to allow admin updates

---

## Data Flow Summary

| Action | Entry Point | Tables Affected |
|--------|-------------|------------------|
| Deposit | `apply_deposit_with_crystallization` | transactions_v2 → investor_positions → fund_daily_aum |
| Withdrawal | `apply_withdrawal_with_crystallization` | transactions_v2 → investor_positions → withdrawal_requests |
| Yield | `apply_segmented_yield_distribution_v5` | yield_distributions → yield_allocations, fee_allocations, ib_allocations → transactions_v2 |
| Void | `void_transaction` | transactions_v2 → cascades to all linked tables |

---

## Row Counts (Current)
| Table | Rows |
|-------|------|
| profiles | 46 |
| funds | 5 |
| transactions_v2 | 0 |
| investor_positions | 0 |
| yield_distributions | 0 |
| investor_fee_schedule | 46 |
| ib_commission_schedule | 4 |
| user_roles | 5 |

**Note**: Data was reset - needs re-import from Excel.