# Legacy Schema Reference

> Last updated: 2026-01-12
> Status: DEPRECATED - For reference only

This document catalogs deprecated database tables that exist for backward compatibility but should NOT be used for new development. All new code must use the canonical tables listed below.

## Table Migration Summary

| Legacy Table | Canonical Table | Migration Date | Notes |
|--------------|-----------------|----------------|-------|
| `transactions` | `transactions_v2` | 2025-12 | Fund-centric ledger with dates |
| `positions` | `investor_positions` | 2025-12 | Fund-linked position tracking |
| `investors` | `profiles` | 2025-12 | KYC/AML columns removed |
| `deposits` | `transactions_v2` | 2025-12 | Replaced by transaction types |
| `investments` | `transactions_v2` | 2025-12 | Replaced by transaction types |

---

## Deprecated Tables

### `transactions` (DEPRECATED)

**Replaced by:** `transactions_v2`

**Reason for deprecation:**
- Missing `tx_date` / `value_date` columns (only has `created_at`)
- `fund_id` is TEXT instead of UUID
- No `reference_id` for idempotency
- Uses `asset_code` enum instead of `asset` text
- Has `status` column (moved to workflow tables)

**Legacy Schema:**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  investor_id UUID NOT NULL,
  asset_code asset_code NOT NULL,  -- enum, not text
  amount NUMERIC NOT NULL,
  type tx_type NOT NULL,
  status tx_status NOT NULL,       -- deprecated: moved to workflows
  tx_hash TEXT,
  note TEXT,                       -- now called 'notes'
  created_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,        -- deprecated
  created_by UUID,
  fund_id TEXT                     -- should be UUID
);
```

**Canonical Schema (`transactions_v2`):**
```sql
CREATE TABLE transactions_v2 (
  id UUID PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES profiles(id),
  fund_id UUID NOT NULL REFERENCES funds(id),
  tx_date DATE NOT NULL,           -- explicit transaction date
  value_date DATE NOT NULL,        -- settlement date
  asset TEXT NOT NULL,             -- flexible asset code
  amount NUMERIC(28,10) NOT NULL,
  type tx_type NOT NULL,
  balance_before NUMERIC(28,10),
  balance_after NUMERIC(28,10),
  tx_hash TEXT,
  reference_id TEXT UNIQUE,        -- idempotency key
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  fund_class TEXT
);
```

**Migration Path:**
- All new transactions must use `transactions_v2`
- Historical data in `transactions` should be migrated using `reference_id` to prevent duplicates
- The `status` field is handled by withdrawal_requests workflow

---

### `positions` (DEPRECATED)

**Replaced by:** `investor_positions`

**Reason for deprecation:**
- Asset-centric (uses `asset_code`) instead of fund-centric
- Missing fund relationship and performance tracking fields
- No PnL tracking

**Legacy Schema:**
```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  investor_id UUID NOT NULL,
  asset_code asset_code NOT NULL,
  principal NUMERIC NOT NULL,
  total_earned NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

**Canonical Schema (`investor_positions`):**
```sql
CREATE TABLE investor_positions (
  investor_id UUID NOT NULL REFERENCES profiles(id),
  fund_id UUID NOT NULL REFERENCES funds(id),
  PRIMARY KEY (investor_id, fund_id),
  shares NUMERIC(28,10) NOT NULL,
  cost_basis NUMERIC(28,10) NOT NULL,
  current_value NUMERIC(28,10) NOT NULL,
  unrealized_pnl NUMERIC(28,10),
  realized_pnl NUMERIC(28,10),
  last_transaction_date DATE,
  lock_until_date DATE,
  high_water_mark NUMERIC(28,10),
  mgmt_fees_paid NUMERIC(28,10),
  perf_fees_paid NUMERIC(28,10),
  updated_at TIMESTAMPTZ DEFAULT now(),
  fund_class TEXT,
  aum_percentage NUMERIC(28,10)
);
```

**Migration Path:**
- `investor_positions` is derived from `transactions_v2` ledger
- Use `recompute_investor_position(investor_id, fund_id)` RPC to recalculate

---

### `investors` (PARTIALLY DEPRECATED)

**Replaced by:** `profiles`

**Reason for deprecation:**
- KYC/AML columns removed (2025-12-07) for compliance
- `profiles` is the auth-linked canonical investor table

**Current State:**
The `investors` table still exists but with sensitive columns removed. New code should use `profiles` for investor data.

**Comment from database:**
```
Investor master table - KYC/AML columns removed 2025-12-07
```

---

### `deposits` (DEPRECATED)

**Replaced by:** `transactions_v2` with `type = 'DEPOSIT'`

**Reason for deprecation:**
- Separate tables per transaction type is anti-pattern
- No fund relationship
- Missing audit fields

---

### `investments` (DEPRECATED)

**Replaced by:** `transactions_v2` with appropriate type

**Reason for deprecation:**
- Overlaps with transactions concept
- No clear semantic distinction

---

## Integrity Views for Legacy Detection

The following views can detect orphaned records referencing deprecated tables:

| View | Purpose |
|------|---------|
| `v_orphaned_positions` | Positions without valid profile/fund references |
| `v_orphaned_transactions` | Transactions without valid profile references |

---

## Safe Migration Practices

When migrating data from legacy to canonical tables:

1. **Always use `reference_id`** for idempotency to prevent duplicate inserts
2. **Run integrity views** after migration to verify data consistency
3. **Never delete legacy tables** until all foreign key references are removed
4. **Use transactions** for atomic migrations

### Example Migration Query

```sql
-- Migrate from legacy transactions to transactions_v2
INSERT INTO transactions_v2 (
  id, investor_id, fund_id, tx_date, value_date,
  asset, amount, type, notes, created_by, created_at,
  reference_id
)
SELECT
  t.id,
  t.investor_id,
  f.id AS fund_id,  -- Map text to UUID
  t.created_at::date AS tx_date,
  t.created_at::date AS value_date,
  t.asset_code::text AS asset,
  t.amount,
  t.type,
  t.note AS notes,
  t.created_by,
  t.created_at,
  'legacy-' || t.id::text AS reference_id  -- Idempotency key
FROM transactions t
LEFT JOIN funds f ON f.code = t.fund_id  -- Text to UUID mapping
WHERE NOT EXISTS (
  SELECT 1 FROM transactions_v2 v2
  WHERE v2.reference_id = 'legacy-' || t.id::text
)
ON CONFLICT (reference_id) DO NOTHING;
```

---

## Monitoring Legacy Usage

To detect code still using legacy tables, search for:

```bash
# Find legacy table references in codebase
grep -r "from.*transactions[^_]" src/ --include="*.ts"
grep -r "\.from\(['\"]positions" src/ --include="*.ts"
grep -r "\.from\(['\"]deposits" src/ --include="*.ts"
grep -r "\.from\(['\"]investments" src/ --include="*.ts"
```

---

## Future Cleanup

Once confirmed no dependencies exist, these tables should be archived:

1. Export data to archive storage
2. Rename tables with `_deprecated_YYYYMMDD` suffix
3. Eventually drop after retention period

**DO NOT** drop legacy tables until:
- All application code uses canonical tables
- All reports use canonical tables
- All integrations use canonical tables
- Regulatory retention requirements are met

---

*This document is part of the platform's schema governance program.*
