# Schema Truth Pack — Indigo Yield Platform
## Extracted: 2026-01-16 from Local Supabase (postgresql://localhost:54322)

---

## A) Tables in Public Schema

**Total: 63 tables**

Core finance tables:
- `transactions_v2` — Canonical ledger
- `investor_positions` — Composite PK (investor_id, fund_id)
- `fund_daily_aum` — UUID `id` PK + unique(fund_id, aum_date)
- `funds` — Fund definitions
- `profiles` — User/investor profiles
- `withdrawal_requests` — Withdrawal workflow
- `investor_fee_schedule` — Per-investor fee overrides
- `audit_log` — System audit trail

---

## B) Finance-Critical Table Columns

### transactions_v2
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| investor_id | uuid | NO | |
| fund_id | uuid | NO | |
| tx_date | date | NO | CURRENT_DATE |
| value_date | date | NO | CURRENT_DATE |
| asset | text | NO | |
| amount | numeric | NO | |
| type | tx_type (enum) | NO | |
| balance_before | numeric | YES | |
| balance_after | numeric | YES | |
| tx_hash | text | YES | |
| reference_id | text | YES | |
| notes | text | YES | |
| approved_by | uuid | YES | |
| approved_at | timestamptz | YES | |
| created_by | uuid | YES | |
| created_at | timestamptz | YES | now() |
| fund_class | text | YES | |
| **is_voided** | boolean | YES | false |
| **voided_at** | timestamptz | YES | |
| **voided_by** | uuid | YES | |
| **void_reason** | text | YES | |

### fund_daily_aum
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| **id** | uuid | NO | gen_random_uuid() |
| fund_id | text | NO | |
| aum_date | date | NO | |
| total_aum | numeric | NO | 0 |
| nav_per_share | numeric | YES | |
| total_shares | numeric | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| created_by | uuid | YES | |
| source | text | YES | 'ingested' |
| as_of_date | date | YES | |

**Constraints:**
- PRIMARY KEY: `id` (UUID)
- UNIQUE: `(fund_id, aum_date)`
- FOREIGN KEY: `created_by` → `profiles.id`

### investor_positions
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| investor_id | uuid | NO | |
| fund_id | uuid | NO | |
| shares | numeric | NO | 0 |
| cost_basis | numeric | NO | 0 |
| current_value | numeric | NO | 0 |
| unrealized_pnl | numeric | YES | 0 |
| realized_pnl | numeric | YES | 0 |
| last_transaction_date | date | YES | |
| lock_until_date | date | YES | |
| high_water_mark | numeric | YES | |
| mgmt_fees_paid | numeric | YES | 0 |
| perf_fees_paid | numeric | YES | 0 |
| updated_at | timestamptz | YES | now() |
| fund_class | text | YES | |
| aum_percentage | numeric | YES | 0 |

**Constraints:**
- PRIMARY KEY: `(investor_id, fund_id)` — **COMPOSITE, NO UUID ID**
- FOREIGN KEY: `investor_id` → `investors.id`
- FOREIGN KEY: `fund_id` → `funds.id`

**Triggers:**
- `trg_position_integrity` — Logs warning if position goes negative
- `audit_investor_positions_changes` — Audit trail
- `update_investor_positions_updated_at` — Auto-update timestamp

### profiles
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | |
| email | text | NO | |
| first_name | text | YES | |
| last_name | text | YES | |
| phone | text | YES | |
| is_admin | boolean | NO | false |
| fee_percentage | numeric | YES | 0.02 |
| avatar_url | text | YES | |
| totp_enabled | boolean | YES | false |
| totp_verified | boolean | YES | false |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| status | text | YES | 'Active' |
| preferences | jsonb | YES | '{}' |
| account_type | text | YES | 'investor' |

---

## C) Enum Types

| Enum Name | Values |
|-----------|--------|
| **tx_type** | DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT |
| transaction_type | DEPOSIT, WITHDRAWAL, INTEREST, FEE |
| fund_status | active, inactive, suspended, deprecated |
| withdrawal_status | pending, approved, processing, completed, rejected, cancelled |
| withdrawal_action | create, approve, reject, processing, complete, cancel, update |
| asset_code | BTC, ETH, SOL, USDT, EURC, xAUT, XRP |

---

## D) Critical RPC Signatures

### void_transaction
```sql
void_transaction(
  p_transaction_id uuid,
  p_void_reason text,
  p_admin_id uuid DEFAULT NULL
) RETURNS jsonb
SECURITY DEFINER
```

**Behavior:**
- Requires `is_admin()` = true
- Sets `voided = true`, `voided_at`, `voided_by`, `void_reason`
- Cascade voids related `investor_yield_events`
- Updates `investor_positions.current_value`
- Writes to `audit_log`
- Returns success/error JSON

### get_void_transaction_impact
```sql
get_void_transaction_impact(
  p_transaction_id uuid
) RETURNS jsonb
SECURITY DEFINER
```

### get_void_aum_impact
```sql
get_void_aum_impact(
  p_record_id uuid
) RETURNS jsonb
SECURITY DEFINER
```

**Purpose:** Preview what will be affected when voiding a fund_daily_aum record.

### calc_avg_daily_balance
```sql
calc_avg_daily_balance(
  p_investor_id uuid,
  p_fund_id uuid,
  p_period_start date,
  p_period_end date
) RETURNS numeric(28,10)
SECURITY DEFINER
```

### preview_adb_yield
```sql
preview_adb_yield(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'reporting'
) RETURNS jsonb
SECURITY DEFINER
```

### merge_duplicate_profiles
```sql
merge_duplicate_profiles(
  p_keep_profile_id uuid,
  p_merge_profile_id uuid,
  p_admin_id uuid
) RETURNS jsonb
SECURITY DEFINER
```

### apply_daily_yield_to_fund (2 overloads)
```sql
-- Overload 1: by fund_id text
apply_daily_yield_to_fund(
  p_fund_id text,
  p_rate_date date,
  p_daily_rate numeric
) RETURNS integer
SECURITY DEFINER

-- Overload 2: by fund_id uuid
apply_daily_yield_to_fund(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid
) RETURNS TABLE(investor_id uuid, gross_amount numeric, fee_amount numeric, net_amount numeric)
SECURITY DEFINER
```

### is_admin
```sql
is_admin() RETURNS boolean
SECURITY INVOKER
-- Calls is_admin_safe() internally
```

---

## E) Integrity Views

### v_ledger_reconciliation
Shows position/transaction mismatches. **Empty = healthy.**

Key features:
- Excludes voided transactions (`t.is_voided = false`)
- Uses variance threshold > $0.01
- Joins: `investor_positions` ← `transactions_v2` ← `funds` ← `profiles`

### v_position_transaction_variance
Detailed breakdown by transaction type. **Empty = healthy.**

Key features:
- Sums by type (DEPOSIT, WITHDRAWAL, INTEREST, FEE)
- Excludes voided transactions
- Shows cost_basis comparison

### v_potential_duplicate_profiles
Detects duplicate investor profiles by email or name match.

Key features:
- Filters: `is_admin = false` (only investors)
- Match types: exact_email_match, exact_name_match, fuzzy_match

### fund_aum_mismatch
Shows variance between reported NAV and sum of positions.

---

## F) Triggers on transactions_v2

| Trigger | When | Function |
|---------|------|----------|
| audit_transactions_v2_changes | AFTER INSERT/UPDATE/DELETE | log_data_edit() |

---

## G) Frontend ↔ RPC Alignment Check

### ✅ VERIFIED CORRECT

| Frontend Call | RPC Signature | Status |
|--------------|---------------|--------|
| `void_transaction({ p_transaction_id, p_void_reason, p_admin_id })` | `void_transaction(uuid, text, uuid)` | ✅ |
| `get_void_aum_impact({ p_record_id })` | `get_void_aum_impact(uuid)` | ✅ |
| `get_void_transaction_impact({ p_transaction_id })` | `get_void_transaction_impact(uuid)` | ✅ |

### Previously Fixed (P0 Fix 5)
- `adminTransactionHistoryService.ts` was using `p_reason` → changed to `p_void_reason`
- `transactionsV2Service.ts` was using `p_reason` → changed to `p_void_reason`

### Previously Fixed (P0 Fix 3)
- `yieldManagementService.ts` was calling `get_void_yield_impact` → changed to `get_void_aum_impact`

---

## H) Key Architectural Facts

1. **fund_daily_aum has UUID `id` as PK** (not composite-only)
   - Can be referenced directly by ID
   - Also has unique constraint on `(fund_id, aum_date)`

2. **investor_positions has COMPOSITE PK `(investor_id, fund_id)`**
   - No separate UUID `id` column
   - Position lookup requires both IDs

3. **tx_type enum has 5 values only:**
   - DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT
   - No: TOP_UP, REINVEST, TRANSFER, YIELD, etc.

4. **Voiding is soft-delete pattern:**
   - `is_voided = true` (not row deletion)
   - Must exclude voided records in all queries: `WHERE is_voided = false`

5. **Yield conservation identity:**
   - gross_yield = net_yield + fees + ib_fees + dust
   - Enforced by `v_yield_conservation_check` view

---

## Document Generated
- **Date:** 2026-01-16
- **Source:** Local Supabase instance
- **Method:** Direct PostgreSQL catalog queries
