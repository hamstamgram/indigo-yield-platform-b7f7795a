# Database Schema Map

> Auto-generated schema documentation for the financial platform.
> Last updated: 2025-01-29

## Core Tables

### transactions_v2
Primary ledger table for all financial transactions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | No | Primary key |
| investor_id | uuid | No | FK to profiles |
| fund_id | uuid | Yes | FK to funds |
| type | tx_type enum | No | DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT |
| tx_subtype | text | Yes | Detailed subtype (first_investment, deposit, etc.) |
| asset | text | No | Asset symbol (BTC, ETH, etc.) |
| amount | numeric | No | Transaction amount |
| tx_date | date | No | Transaction date |
| value_date | date | Yes | Value/settlement date |
| notes | text | Yes | Transaction notes |
| tx_hash | text | Yes | Blockchain transaction hash |
| reference_id | text | Yes | Idempotency key (unique) |
| source | text | Yes | Transaction source |
| visibility_scope | text | Yes | investor_visible, admin_only |
| is_voided | boolean | No | Voided flag (default false) |
| voided_at | timestamptz | Yes | When voided |
| voided_by | uuid | Yes | Who voided |
| void_reason | text | Yes | Reason for voiding |
| is_system_generated | boolean | No | Auto-generated flag |
| distribution_id | uuid | Yes | FK to yield_distributions |
| created_at | timestamptz | No | Creation timestamp |
| created_by | uuid | Yes | Creator ID |

**Indexes:** investor_id, fund_id, tx_date, type, reference_id (unique)

---

### investor_positions
Current investor holdings per fund (denormalized for performance).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| investor_id | uuid | No | PK part 1, FK to profiles |
| fund_id | uuid | No | PK part 2, FK to funds |
| shares | numeric | Yes | Share count |
| cost_basis | numeric | Yes | Total invested |
| current_value | numeric | Yes | Current position value |
| unrealized_pnl | numeric | Yes | Unrealized P&L |
| realized_pnl | numeric | Yes | Realized P&L |
| fund_class | text | Yes | Asset class |
| high_water_mark | numeric | Yes | HWM for perf fees |
| mgmt_fees_paid | numeric | Yes | Cumulative mgmt fees |
| perf_fees_paid | numeric | Yes | Cumulative perf fees |
| last_transaction_date | date | Yes | Last activity |
| updated_at | timestamptz | Yes | Last update |

**Primary Key:** (investor_id, fund_id) - COMPOSITE

---

### funds
Fund definitions and configuration.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | No | Primary key |
| code | text | No | Fund code (unique) |
| name | text | No | Fund name |
| asset | text | No | Base asset (BTC, ETH, etc.) |
| fund_class | text | No | Fund class identifier |
| status | fund_status | Yes | active, inactive |
| inception_date | date | No | Fund start date |
| mgmt_fee_bps | integer | Yes | Management fee in basis points |
| perf_fee_bps | integer | Yes | Performance fee in basis points |
| high_water_mark | numeric | Yes | Current HWM |

---

### fund_daily_aum
Daily AUM snapshots for funds.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | No | Primary key |
| fund_id | uuid | No | FK to funds |
| aum_date | date | No | Snapshot date |
| as_of_date | date | Yes | As-of date for backdating |
| total_aum | numeric | No | Total AUM value |
| purpose | aum_purpose | No | reporting, transaction |
| is_voided | boolean | Yes | Voided flag |
| voided_at | timestamptz | Yes | When voided |
| voided_by | uuid | Yes | Who voided |
| void_reason | text | Yes | Reason for voiding |
| source | text | Yes | Data source |
| created_at | timestamptz | Yes | Creation timestamp |
| created_by | uuid | Yes | Creator ID |

**Unique Constraint:** (fund_id, aum_date, purpose)

---

### yield_distributions
Yield distribution records.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | No | Primary key |
| fund_id | uuid | No | FK to funds |
| distribution_date | date | No | Distribution date |
| period_start | date | No | Period start |
| period_end | date | No | Period end |
| purpose | aum_purpose | No | reporting, transaction |
| gross_yield | numeric | No | Total gross yield |
| total_fees | numeric | No | Total fees collected |
| total_ib_fees | numeric | No | IB commissions |
| net_yield | numeric | No | Net yield distributed |
| investor_count | integer | No | Affected investors |
| is_voided | boolean | No | Voided flag |
| applied_at | timestamptz | Yes | When applied |
| applied_by | uuid | Yes | Who applied |

---

## Integrity Views

### investor_position_ledger_mismatch
Detects discrepancies between positions and ledger.

```sql
SELECT investor_id, fund_id, position_value, ledger_balance, discrepancy
FROM investor_position_ledger_mismatch
WHERE ABS(discrepancy) > 0.01;
```

### fund_aum_mismatch
Detects discrepancies between recorded AUM and calculated AUM.

```sql
SELECT fund_id, recorded_aum, calculated_aum, discrepancy
FROM fund_aum_mismatch
WHERE ABS(discrepancy) > 0.01;
```

### yield_distribution_conservation_check
Verifies yield amounts balance correctly.

```sql
SELECT distribution_id, conservation_error
FROM yield_distribution_conservation_check
WHERE ABS(conservation_error) > 0.01;
```

---

## Key RPCs

### admin_create_transaction
Creates a transaction with proper position update.

```sql
admin_create_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_type tx_type,
  p_amount numeric,
  p_tx_date date,
  p_notes text,
  p_reference_id text
) RETURNS uuid
SECURITY DEFINER
```

### void_transaction
Voids a transaction with audit trail and position recompute.

```sql
void_transaction(
  p_transaction_id uuid,
  p_reason text
) RETURNS void
SECURITY DEFINER
```

### preview_daily_yield_to_fund_v2
Preview yield distribution before applying.

```sql
preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_yield numeric,
  p_purpose text
) RETURNS jsonb
SECURITY DEFINER
```

### apply_daily_yield_to_fund_v2
Apply yield distribution and update positions.

```sql
apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid,
  p_purpose text
) RETURNS jsonb
SECURITY DEFINER
```

### recompute_investor_position
Recalculates position from ledger.

```sql
recompute_investor_position(
  p_investor_id uuid,
  p_fund_id uuid
) RETURNS void
SECURITY DEFINER
```

---

## Enums

### tx_type
- DEPOSIT
- WITHDRAWAL
- INTEREST
- FEE
- ADJUSTMENT
- IB_CREDIT

### aum_purpose
- reporting
- transaction

### fund_status
- active
- inactive
- closed

---

## Critical Constraints

1. **transactions_v2.reference_id** - UNIQUE (for idempotency)
2. **investor_positions** - Composite PK (investor_id, fund_id)
3. **fund_daily_aum** - UNIQUE (fund_id, aum_date, purpose)
4. **yield_distributions** - UNIQUE (fund_id, distribution_date, purpose)

---

## RLS Policies

All financial tables have Row Level Security enabled:
- Investors can only see their own transactions/positions
- Admins can manage all records
- System functions use SECURITY DEFINER for privileged operations
