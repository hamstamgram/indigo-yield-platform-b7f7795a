# Data Model

> Generated: 2025-12-26
> Version: 2.0 (Canonical)

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐         ┌──────────────────┐         ┌──────────┐             │
│  │ profiles │◄───────►│investor_positions│◄───────►│  funds   │             │
│  │   (id)   │         │ (investor_id,    │         │   (id)   │             │
│  └────┬─────┘         │  fund_id) [PK]   │         └────┬─────┘             │
│       │               └────────┬─────────┘              │                   │
│       │                        │                        │                   │
│       │ ib_parent_id           │                        │                   │
│       ▼                        ▼                        ▼                   │
│  ┌──────────┐         ┌──────────────────┐    ┌─────────────────┐           │
│  │ profiles │         │ transactions_v2  │    │ fund_daily_aum  │           │
│  │   (IB)   │         │      (id)        │    │(fund_id,nav_date│           │
│  └──────────┘         │  [Ledger SOT]    │    │,purpose) [PK]   │           │
│                       └──────────────────┘    └─────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Tables

### 1. profiles

**Purpose**: User identity and investor configuration

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK, references auth.users |
| email | TEXT | No | Login email |
| full_name | TEXT | Yes | Display name |
| phone | TEXT | Yes | Contact phone |
| avatar_url | TEXT | Yes | Profile image |
| ib_parent_id | UUID | Yes | FK to profiles.id (IB relationship) |
| ib_percentage | NUMERIC | Yes | Commission rate (0-100) |
| fee_percentage | NUMERIC | Yes | Platform fee rate |
| status | TEXT | Yes | 'active', 'inactive', 'suspended' |
| kyc_status | TEXT | Yes | KYC verification status |
| created_at | TIMESTAMPTZ | No | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last update |

**Key Relationships**:
- `id` → auth.users.id (1:1)
- `ib_parent_id` → profiles.id (self-reference for IB hierarchy)
- `id` ← user_roles.user_id (1:many)
- `id` ← investor_positions.investor_id (1:many)

---

### 2. funds

**Purpose**: Fund definitions and configuration

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| code | TEXT | No | Unique fund code (e.g., 'USDC-Y') |
| name | TEXT | No | Display name |
| asset | TEXT | No | Base asset (USDC, BTC, ETH) |
| fund_class | TEXT | No | Share class identifier |
| status | fund_status | Yes | 'active', 'inactive', 'closed' |
| inception_date | DATE | No | Fund launch date |
| mgmt_fee_bps | INTEGER | Yes | Management fee in basis points |
| perf_fee_bps | INTEGER | Yes | Performance fee in basis points |
| min_investment | NUMERIC | Yes | Minimum investment amount |
| lock_period_days | INTEGER | Yes | Lock-up period |
| high_water_mark | NUMERIC | Yes | HWM for perf fee calculation |
| strategy | TEXT | Yes | Investment strategy description |
| logo_url | TEXT | Yes | Fund logo |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| updated_at | TIMESTAMPTZ | Yes | Last update |

**Key Relationships**:
- `id` ← investor_positions.fund_id (1:many)
- `id` ← fund_daily_aum.fund_id (1:many)
- `id` ← yield_distributions.fund_id (1:many)

---

### 3. investor_positions

**Purpose**: Current investor holdings per fund

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| investor_id | UUID | No | PK part 1, FK to profiles |
| fund_id | UUID | No | PK part 2, FK to funds |
| fund_class | TEXT | Yes | Share class |
| shares | NUMERIC | Yes | Number of shares held |
| cost_basis | NUMERIC | Yes | Original investment value |
| current_value | NUMERIC | Yes | **Current position value (SOT)** |
| unrealized_pnl | NUMERIC | Yes | Unrealized P&L |
| realized_pnl | NUMERIC | Yes | Realized P&L |
| last_transaction_date | DATE | Yes | Most recent transaction |
| lock_until_date | DATE | Yes | Lock expiry |
| high_water_mark | NUMERIC | Yes | Investor-level HWM |
| mgmt_fees_paid | NUMERIC | Yes | Cumulative mgmt fees |
| perf_fees_paid | NUMERIC | Yes | Cumulative perf fees |
| aum_percentage | NUMERIC | Yes | % of fund AUM |
| updated_at | TIMESTAMPTZ | Yes | Last update |

**Primary Key**: `(investor_id, fund_id)` - COMPOSITE KEY (no `id` column!)

**Key Relationships**:
- `investor_id` → profiles.id
- `fund_id` → funds.id

**Critical Invariant**:
```sql
investor_positions.current_value = SUM(transactions_v2.amount) 
  WHERE investor_id = X AND fund_id = Y AND is_voided = false
```

---

### 4. transactions_v2

**Purpose**: Authoritative financial ledger (SOURCE OF TRUTH)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| investor_id | UUID | Yes | FK to profiles |
| fund_id | UUID | Yes | FK to funds |
| type | transaction_type | No | 'deposit', 'withdrawal', 'interest', 'fee', etc. |
| amount | NUMERIC | No | Transaction amount (signed) |
| tx_date | DATE | No | When transaction takes effect |
| distribution_id | UUID | Yes | FK to yield_distributions |
| reference_id | TEXT | Yes | Idempotency key (unique when not null) |
| purpose | aum_purpose | Yes | 'transaction' or 'reporting' |
| notes | TEXT | Yes | Transaction notes |
| admin_only | BOOLEAN | Yes | Hide from investor view |
| is_voided | BOOLEAN | Yes | Soft delete flag |
| voided_at | TIMESTAMPTZ | Yes | When voided |
| voided_by | UUID | Yes | Who voided |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| created_by | UUID | Yes | Who created |

**Key Relationships**:
- `investor_id` → profiles.id
- `fund_id` → funds.id
- `distribution_id` → yield_distributions.id

**Idempotency**: Unique index on `reference_id WHERE reference_id IS NOT NULL`

---

### 5. yield_distributions

**Purpose**: Audit record for yield distribution runs

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| fund_id | UUID | No | FK to funds |
| effective_date | DATE | No | Distribution date |
| period_start | DATE | Yes | Period start |
| period_end | DATE | Yes | Period end |
| gross_yield | NUMERIC | No | Total yield before fees |
| net_yield | NUMERIC | Yes | Yield after fees |
| total_fees | NUMERIC | Yes | Total fees collected |
| total_ib_fees | NUMERIC | Yes | Total IB commissions |
| investors_count | INTEGER | Yes | Number of investors |
| purpose | aum_purpose | No | 'transaction' or 'reporting' |
| status | TEXT | Yes | 'pending', 'applied', 'voided' |
| applied_at | TIMESTAMPTZ | Yes | When applied |
| applied_by | UUID | Yes | Who applied |
| voided_at | TIMESTAMPTZ | Yes | When voided |
| voided_by | UUID | Yes | Who voided |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| created_by | UUID | Yes | Who created |

**Key Relationships**:
- `fund_id` → funds.id
- `id` ← transactions_v2.distribution_id (1:many)
- `id` ← fee_allocations.distribution_id (1:many)
- `id` ← ib_allocations.distribution_id (1:many)

**Critical Invariant**:
```sql
yield_distributions.gross_yield = 
  SUM(net interest to investors) + SUM(fee_allocations.fee_amount)
```

---

### 6. fee_allocations

**Purpose**: Platform fee records per investor per distribution

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| distribution_id | UUID | No | FK to yield_distributions |
| fund_id | UUID | No | FK to funds |
| investor_id | UUID | No | FK to profiles |
| fees_account_id | UUID | No | FK to profiles (INDIGO FEES) |
| period_start | DATE | No | Fee period start |
| period_end | DATE | No | Fee period end |
| purpose | aum_purpose | No | 'transaction' or 'reporting' |
| base_net_income | NUMERIC | No | Income before fee |
| fee_percentage | NUMERIC | No | Applied fee rate |
| fee_amount | NUMERIC | No | Calculated fee |
| credit_transaction_id | UUID | Yes | FK to transactions_v2 |
| debit_transaction_id | UUID | Yes | FK to transactions_v2 |
| is_voided | BOOLEAN | Yes | Soft delete flag |
| voided_at | TIMESTAMPTZ | Yes | When voided |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| created_by | UUID | Yes | Who created |

**Unique Constraint**: `(distribution_id, investor_id)` prevents duplicate allocations

---

### 7. ib_allocations

**Purpose**: IB commission records per referral per distribution

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| distribution_id | UUID | Yes | FK to yield_distributions |
| fund_id | UUID | Yes | FK to funds |
| source_investor_id | UUID | No | FK to profiles (referred investor) |
| ib_investor_id | UUID | No | FK to profiles (IB) |
| period_id | UUID | Yes | FK to statement_periods |
| period_start | DATE | Yes | Commission period start |
| period_end | DATE | Yes | Commission period end |
| effective_date | DATE | No | When commission earned |
| source_net_income | NUMERIC | No | Referred investor's net income |
| ib_percentage | NUMERIC | No | Commission rate |
| ib_fee_amount | NUMERIC | No | Calculated commission |
| purpose | aum_purpose | No | 'transaction' or 'reporting' |
| payout_status | TEXT | No | 'pending', 'paid', 'voided' |
| payout_batch_id | UUID | Yes | Batch payout reference |
| paid_at | TIMESTAMPTZ | Yes | When paid |
| paid_by | UUID | Yes | Who processed |
| is_voided | BOOLEAN | Yes | Soft delete flag |
| voided_at | TIMESTAMPTZ | Yes | When voided |
| source | TEXT | Yes | Source system |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| created_by | UUID | Yes | Who created |

**Unique Constraint**: `(distribution_id, source_investor_id, ib_investor_id)` prevents duplicates

---

### 8. withdrawal_requests

**Purpose**: Withdrawal request lifecycle

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| investor_id | UUID | No | FK to profiles |
| fund_id | UUID | No | FK to funds |
| amount | NUMERIC | No | Requested amount |
| currency | TEXT | No | Asset code |
| status | withdrawal_status | No | State machine state |
| wallet_address | TEXT | Yes | Destination wallet |
| tx_hash | TEXT | Yes | Blockchain tx hash |
| notes | TEXT | Yes | Admin notes |
| requested_at | TIMESTAMPTZ | No | When created |
| processed_at | TIMESTAMPTZ | Yes | When completed |
| processed_by | UUID | Yes | Who processed |
| created_at | TIMESTAMPTZ | Yes | Record creation |

**Key Relationships**:
- `investor_id` → profiles.id
- `fund_id` → funds.id
- `id` ← withdrawal_audit_logs.request_id (1:many)

---

### 9. withdrawal_audit_logs (CANONICAL - PLURAL)

**Purpose**: Audit trail for withdrawal state changes

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | PK |
| request_id | UUID | No | FK to withdrawal_requests |
| action | withdrawal_audit_action | No | Action type enum |
| actor_id | UUID | Yes | Who performed action |
| details | JSONB | Yes | Additional context |
| created_at | TIMESTAMPTZ | No | When action occurred |

> ⚠️ **CRITICAL**: Canonical table name is `withdrawal_audit_logs` (PLURAL).
> A compatibility VIEW `withdrawal_audit_log` (singular) exists for legacy code.

---

### 10. fund_daily_aum

**Purpose**: Daily NAV snapshots per fund

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| fund_id | UUID | No | PK part 1, FK to funds |
| nav_date | DATE | No | PK part 2, snapshot date |
| purpose | aum_purpose | No | PK part 3, 'transaction' or 'reporting' |
| total_aum | NUMERIC | No | Total AUM value |
| nav_per_share | NUMERIC | Yes | NAV per share |
| total_shares | NUMERIC | Yes | Outstanding shares |
| investor_count | INTEGER | Yes | Active investors |
| is_month_end | BOOLEAN | Yes | Month-end flag |
| is_voided | BOOLEAN | Yes | Soft delete flag |
| created_at | TIMESTAMPTZ | Yes | Record creation |
| created_by | UUID | Yes | Who created |

**Primary Key**: `(fund_id, nav_date, purpose)` - COMPOSITE KEY

**Critical Invariant**:
```sql
fund_daily_aum.total_aum = SUM(investor_positions.current_value) 
  WHERE fund_id = X
```

---

## Supporting Tables

### user_roles

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK to profiles |
| role | app_role | 'investor', 'ib', 'admin', 'super_admin' |
| created_at | TIMESTAMPTZ | When assigned |

### statement_periods

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| period_start | DATE | Period start date |
| period_end | DATE | Period end date |
| is_closed | BOOLEAN | Whether finalized |
| closed_at | TIMESTAMPTZ | When closed |
| closed_by | UUID | Who closed |

### generated_statements

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| investor_id | UUID | FK to profiles |
| period_id | UUID | FK to statement_periods |
| html_content | TEXT | Rendered statement |
| pdf_url | TEXT | PDF storage path |
| created_at | TIMESTAMPTZ | When generated |

### statement_email_delivery

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| statement_id | UUID | FK to generated_statements |
| investor_id | UUID | FK to profiles |
| recipient_email | TEXT | Destination email |
| status | TEXT | 'PENDING', 'SENT', 'DELIVERED', 'FAILED' |
| provider_message_id | TEXT | MailerSend message ID |
| sent_at | TIMESTAMPTZ | When sent |
| delivered_at | TIMESTAMPTZ | When delivered |

---

## Enums

### app_role
```sql
'investor' | 'ib' | 'admin' | 'super_admin'
```

### tx_type (transaction_type enum)
```sql
-- Valid tx_type values (database enum):
'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'YIELD' | 'FEE' | 
'FEE_CREDIT' | 'IB_CREDIT' | 'ADJUSTMENT'

-- ⚠️ NOTE: 'REDEMPTION' is NOT a valid tx_type value!
-- Redemptions are tracked via tx_subtype or withdrawal_requests, not as a tx_type.
```

### withdrawal_status
```sql
'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled'
```

### aum_purpose
```sql
'transaction' | 'reporting'
```

### fund_status
```sql
'active' | 'inactive' | 'closed'
```

---

## Source of Truth Hierarchy

1. **transactions_v2** - All financial movements
2. **investor_positions.current_value** - Derived from transactions_v2
3. **fund_daily_aum.total_aum** - Derived from investor_positions
4. **yield_distributions** - Audit record for distributions
5. **fee_allocations / ib_allocations** - Breakdown of distribution

---

## Composite Keys (No `id` Column)

⚠️ These tables use composite primary keys - do NOT query by `id`:

1. `investor_positions` → `(investor_id, fund_id)`
2. `fund_daily_aum` → `(fund_id, nav_date, purpose)`
3. `daily_nav` → `(fund_id, nav_date, purpose)`

---

## ⚠️ CRITICAL: Column Reference Errors to Avoid

These are the most common schema mismatch errors. NEVER use these:

| ❌ **WRONG** | ✅ **CORRECT** | Table |
|-------------|---------------|-------|
| `status` | `is_voided` (boolean) | transactions_v2 |
| `status = 'CONFIRMED'` | `is_voided = false` | transactions_v2 |
| `current_balance` | `current_value` | investor_positions |
| `investor_positions.id` | Use composite key `(investor_id, fund_id)` | investor_positions |
| `fund_daily_aum.id` | Use composite key `(fund_id, nav_date, purpose)` | fund_daily_aum |
| `tx_type` | `type` | transactions_v2 |
| `effective_date` | `tx_date` | transactions_v2 |
| `asset_code` | `asset` | transactions_v2 |
| `withdrawal_audit_log` | `withdrawal_audit_logs` (plural) | N/A |

### Common Error Messages and Fixes

**"column status does not exist"**
- `transactions_v2` has NO `status` column
- Use `is_voided = false` instead of `status = 'CONFIRMED'`
- Use `is_voided = true` instead of `status = 'VOIDED'`

**"column current_balance does not exist"**
- `investor_positions` uses `current_value`, NOT `current_balance`
- All position queries must use `current_value`

**"column reference fund_id is ambiguous"**
- Use table aliases: `ip.fund_id`, `t.fund_id`, `f.id`
- In `RETURNS TABLE`, use `out_` prefix: `out_fund_id`, `out_investor_id`

---

## Function Return Column Naming Convention

When creating PL/pgSQL functions with `RETURNS TABLE`, prefix return columns with `out_` to avoid ambiguity:

```sql
-- ❌ WRONG - causes "column reference is ambiguous"
RETURNS TABLE (
  fund_id uuid,
  investor_id uuid,
  balance numeric
)

-- ✅ CORRECT - unambiguous column names
RETURNS TABLE (
  out_fund_id uuid,
  out_investor_id uuid,
  out_balance numeric
)
```
