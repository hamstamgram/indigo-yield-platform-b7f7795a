# FINANCIAL RULEBOOK
## Canonical Specification for Go-Live Certification
**Version**: 1.0  
**Status**: Active  
**Last Updated**: 2026-01-20

---

## A) Periods and As-Of Dates

### A.1 Reporting Month Definition
A **reporting month** is a calendar month (e.g., January 2026). All financial calculations, statements, and yield distributions are organized by reporting month.

### A.2 As-Of Date Rule
- **Format**: Date-only (`yyyy-MM-dd`), e.g., `2026-01-31`
- **Formatting**: Must use `date-fns format(date, 'yyyy-MM-dd')` 
- **PROHIBITED**: `toISOString().split('T')[0]` (causes timezone drift)
- **Month-End**: Last calendar day of the month (e.g., Jan 31, Feb 28/29)

### A.3 Ledger Event Boundaries
- **Inclusive Rule**: Events with `tx_date <= as_of_date` are included
- **Ordering**: `(tx_date ASC, id ASC)` for deterministic tie-breaking
- **Effective Date**: All business logic uses `tx_date` (effective date), NOT `created_at` (entry date)

### A.4 Timezone Handling
- **Storage**: DATE type columns (no timezone)
- **No Conversions**: Date-only values are never converted between timezones
- **Construction**: Dates should be constructed at local noon to avoid boundary drift

### A.5 Month Ordering and Orphan Prevention
- **Consecutive Months**: Periods must be consecutive (no gaps)
- **Detection**: `v_period_orphans` view identifies orphan months
- **Prevention**: System blocks creation of non-consecutive periods

### A.6 Open vs Closed Periods

| State | Mutations Allowed | Override Mechanism |
|-------|-------------------|-------------------|
| **Open** | Yes | N/A |
| **Closed** | No | `temporal_lock_bypass = true` + super_admin + audit log |

**Override Workflow**:
1. Super admin sets `temporal_lock_bypass = true` in request
2. System logs override to `audit_log` with `action = 'PERIOD_OVERRIDE'`
3. Mutation proceeds
4. System clears bypass flag

---

## B) Positions and Ownership

### B.1 Ownership Calculation
```
allocation_pct = (investor_position_value / fund_total_aum) * 100
```

Where:
- `investor_position_value` = `investor_positions.current_value` for the fund
- `fund_total_aum` = Sum of all investor positions (excluding fees account)

### B.2 Mid-Month Deposits
When a deposit occurs mid-month:
1. **Crystallization** locks the investor's yield allocation at the pre-deposit value
2. New deposit amount is added to position
3. Future yield calculations use the new (higher) position value
4. The investor does NOT earn yield on the new deposit for the period before the deposit date

### B.3 Mid-Month Withdrawals
When a withdrawal occurs mid-month:
1. **Crystallization** locks the investor's yield allocation at the pre-withdrawal value
2. Withdrawal amount is deducted from position
3. Future yield calculations use the new (lower) position value
4. The investor DOES earn yield on the withdrawn amount up until the withdrawal date

### B.4 Precision and Rounding

| Context | Precision | Rounding Method |
|---------|-----------|-----------------|
| Storage (numeric) | 28,10 (28 digits, 10 decimal) | No rounding |
| Calculations | Full precision | No intermediate rounding |
| Display | Asset-specific | ROUND_HALF_UP |
| Final ledger entries | Asset-specific | ROUND_HALF_UP |

**Asset-Specific Precision**:
| Asset | Decimal Places | Dust Tolerance |
|-------|----------------|----------------|
| BTC | 8 | 0.00000001 |
| ETH | 8 | 0.00000001 |
| SOL | 6 | 0.000001 |
| XRP | 6 | 0.000001 |
| USDT | 4 | 0.0001 |
| USDC | 4 | 0.0001 |

### B.5 Dust Handling
- **Definition**: Residual amounts below dust tolerance due to rounding
- **Routing**: Dust is routed to `fees_account` (INDIGO Fees)
- **Logging**: Dust amounts recorded in `yield_distributions.dust_amount`

---

## C) Deposits

### C.1 Required Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `investor_id` | UUID | Yes | Target investor |
| `fund_id` | UUID | Yes | Target fund |
| `amount` | numeric | Yes | Deposit amount (> 0) |
| `tx_date` | date | Yes | Effective date |
| `admin_id` | UUID | Yes | Performing admin |
| `reference_id` | text | No | External reference |
| `notes` | text | No | Admin notes |

### C.2 Idempotency
- **Key**: `reference_id` with UNIQUE constraint on `transactions_v2`
- **Behavior**: Duplicate `reference_id` is rejected with error
- **Pattern**: `ON CONFLICT (reference_id) DO NOTHING` for soft idempotency

### C.3 Backfill Behavior
- **Allowed**: Only in OPEN periods
- **Trigger**: Automatically triggers position recompute via `trg_recompute_position_on_tx`
- **Ordering**: Backfilled transactions are ordered by `(tx_date, id)` for correct sequencing

### C.4 Void/Reversal Model
- **No Destructive Deletes**: Transactions are NEVER deleted
- **Soft Delete**: `is_voided = true`, `voided_at`, `voided_by`, `void_reason`
- **Position Update**: Voiding triggers position recompute
- **Audit**: Void action logged to `audit_log`

### C.5 Position Update Trigger
- **Canonical Writer**: `recompute_investor_position(p_investor_id, p_fund_id)`
- **Trigger Chain**: `trg_recompute_position_on_tx` → `recompute_investor_position()`
- **Guard**: `trg_enforce_canonical_position_write` blocks direct writes

---

## D) Withdrawals

### D.1 Lifecycle States
```
pending → approved → processing → completed
    ↓         ↓
 rejected  cancelled
```

| State | Description | Position Impact |
|-------|-------------|-----------------|
| `pending` | Request submitted | None |
| `approved` | Admin approved | None |
| `processing` | Funds being transferred | None |
| `completed` | Transfer confirmed | Position reduced |
| `rejected` | Admin denied | None |
| `cancelled` | Investor cancelled | None |

### D.2 Position Update Trigger
- **Trigger Point**: `completed` state transition only
- **RPC**: `apply_withdrawal_with_crystallization`
- **Effective Date**: Uses `tx_date` parameter from completion call

### D.3 Constraints
- **Balance Check**: Cannot withdraw more than available balance
- **Formula**: `max_withdrawal = current_value - pending_withdrawals`
- **Partial Withdrawals**: Allowed (any amount up to max)
- **Rounding**: Rounded to asset-specific dust tolerance

### D.4 Crystallization Requirement
Before withdrawal completion:
1. System crystallizes yield at pre-withdrawal position
2. Creates `CRYSTALLIZATION` transaction
3. Then applies withdrawal

---

## E) Yield Generation

### E.1 Baseline AUM Definition
- **Source**: `get_fund_aum_as_of(fund_id, date, purpose)`
- **Logic**: Returns latest `fund_daily_aum` record where `aum_date <= date` and `purpose = purpose`
- **Fallback**: If no snapshot exists, returns `NULL` (NOT zero)

### E.2 NULL Handling
```sql
-- CORRECT
IF v_baseline_aum IS NULL THEN
  RETURN jsonb_build_object('error', 'NO_BASELINE_AUM', 'aum_source', 'no_data');
END IF;

-- WRONG (never do this)
IF v_baseline_aum IS NULL THEN
  v_baseline_aum := 0;  -- PROHIBITED
END IF;
```

### E.3 newAUM Input Rules
- **Validation**: `newAUM > 0` required
- **Source**: Admin-provided value representing fund value at yield date
- **Audit**: newAUM value logged in `yield_distributions.closing_aum`

### E.4 Yield Delta Formula
```
gross_yield_amount = newAUM - baselineAUM
gross_yield_pct = (gross_yield_amount / baselineAUM) * 100
```

### E.5 Preview vs Apply Parity
- **Preview**: Calculates and returns result, writes NOTHING
- **Apply**: Calculates and writes transactions + distributions
- **Requirement**: Preview and Apply MUST produce identical calculations
- **Verification**: `flows_e2e.sql` test validates parity

### E.6 Negative Yield Rule
```
IF gross_yield_pct < 0 THEN
  fee_amount := 0  -- No fees on losses
  ib_amount := 0   -- No IB commission on losses
  investor_net_yield := gross_yield_amount  -- Investor absorbs full loss
END IF
```

---

## F) Crystallization and Fees

### F.1 When Crystallization Occurs
Crystallization is MANDATORY before:
- Any deposit (`apply_deposit_with_crystallization`)
- Any withdrawal (`apply_withdrawal_with_crystallization`)

**Purpose**: Lock yield allocation at point-in-time to prevent capital flows from affecting historical yield distribution.

### F.2 Performance Fee Formula
```
-- For positive yields only
IF gross_yield_amount > 0 THEN
  fee_amount := gross_yield_amount * (fee_pct / 100)
  investor_net_yield := gross_yield_amount - fee_amount - ib_amount
ELSE
  fee_amount := 0
  investor_net_yield := gross_yield_amount  -- Full loss to investor
END IF
```

**Default Fee Rate**: 30% (configurable per investor via `investor_fee_schedule`)

### F.3 High-Water Mark Policy
**STATUS: NOT IMPLEMENTED**

The platform does NOT use high-water marks. Fees are calculated on each positive yield period independently, regardless of previous losses.

### F.4 IB Commission Rules
```
-- IB commission is percentage of GROSS yield (not fee amount)
ib_amount := gross_yield_amount * (ib_percentage / 100)

-- Fee pool distribution:
-- 1. IB receives ib_amount from gross
-- 2. Platform receives (fee_amount - ib_amount) from gross
-- 3. Investor receives (gross - fee_amount)
```

**Note**: IB commission is deducted from the fee pool, not additional to gross fees.

---

## G) Audit & Observability

### G.1 Required Logging for Mutations

Every mutation MUST log to `audit_log`:

| Field | Required | Description |
|-------|----------|-------------|
| `actor_user` | Yes | UUID of performing user |
| `action` | Yes | Action type (e.g., `DEPOSIT`, `VOID_TRANSACTION`) |
| `entity` | Yes | Table name (e.g., `transactions_v2`) |
| `entity_id` | Yes | Primary key of affected record |
| `old_values` | Conditional | Previous state (for updates) |
| `new_values` | Conditional | New state (for inserts/updates) |
| `meta` | No | Additional context (e.g., `reason`) |

### G.2 Month Trace Query
To trace all events for a month:

```sql
-- All transactions for a fund in a period
SELECT 
  t.id,
  t.type,
  t.amount,
  t.tx_date,
  t.investor_id,
  p.email as investor_email,
  t.source,
  t.reference_id,
  t.is_voided,
  t.created_at
FROM transactions_v2 t
JOIN profiles p ON p.id = t.investor_id
WHERE t.fund_id = $1 
  AND t.tx_date BETWEEN $2 AND $3 
  AND t.is_voided = false
ORDER BY t.tx_date, t.created_at;

-- Yield distributions for a fund in a period
SELECT 
  yd.id,
  yd.yield_date,
  yd.gross_yield_pct,
  yd.opening_aum,
  yd.closing_aum,
  yd.purpose,
  yd.created_at
FROM yield_distributions yd
WHERE yd.fund_id = $1 
  AND yd.yield_date BETWEEN $2 AND $3 
  AND yd.is_voided = false
ORDER BY yd.yield_date;

-- Audit trail for a specific transaction
SELECT *
FROM audit_log
WHERE entity = 'transactions_v2' 
  AND entity_id = $1
ORDER BY created_at;
```

### G.3 Integrity Verification
Run integrity checks to verify data consistency:

```sql
-- Full integrity pack
SELECT run_integrity_pack();

-- Cost basis mismatch check
SELECT * FROM v_cost_basis_mismatch;

-- AUM-position reconciliation
SELECT * FROM aum_position_reconciliation WHERE has_mismatch = true;

-- Yield conservation check
SELECT * FROM v_yield_conservation_violations;
```

---

## H) Invariants (Must Always Hold)

### H.1 AUM Conservation
```
fund_daily_aum.total_aum = SUM(investor_positions.current_value) 
  WHERE fund_id = fund AND account_type != 'fees'
```

### H.2 Position-Ledger Match
```
investor_positions.current_value = 
  SUM(deposits) - SUM(withdrawals) + SUM(yields) - SUM(fees)
  WHERE investor_id = investor AND fund_id = fund AND is_voided = false
```

### H.3 Cost Basis Integrity
```
investor_positions.cost_basis = compute_position_from_ledger(investor_id, fund_id).cost_basis
```

### H.4 Closed Month Immutability
```
-- Any mutation to a closed period without override MUST fail
IF period.status = 'closed' AND NOT temporal_lock_bypass THEN
  RAISE EXCEPTION 'PERIOD_CLOSED';
END IF
```

---

## I) Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `NO_BASELINE_AUM` | No AUM snapshot exists for the date | Create baseline AUM first |
| `CRYSTALLIZATION_REQUIRED` | Must crystallize before flow | System should auto-crystallize |
| `PERIOD_CLOSED` | Period is locked | Request super admin override |
| `INSUFFICIENT_BALANCE` | Withdrawal exceeds available | Reduce withdrawal amount |
| `DUPLICATE_REFERENCE` | Reference ID already used | Use unique reference |
| `NEGATIVE_AMOUNT` | Amount must be positive | Correct the amount |

---

## J) Appendix: Canonical Functions

### J.1 Position Management
- `recompute_investor_position(p_investor_id, p_fund_id)` - ONLY writer for positions
- `compute_position_from_ledger(p_investor_id, p_fund_id)` - Read-only projection

### J.2 Deposits/Withdrawals
- `apply_deposit_with_crystallization(...)` - Canonical deposit flow
- `apply_withdrawal_with_crystallization(...)` - Canonical withdrawal flow
- `void_transaction(p_tx_id, p_admin_id, p_reason)` - Void any transaction

### J.3 Yield
- `preview_daily_yield_to_fund_v3(...)` - Preview (read-only)
- `apply_daily_yield_to_fund_v3(...)` - Apply (writes)
- `void_yield_distribution(p_dist_id, p_admin_id, p_reason)` - Void distribution

### J.4 AUM
- `get_fund_aum_as_of(p_fund_id, p_date, p_purpose)` - Historical AUM read
- `ensure_preflow_aum(...)` - Create AUM snapshot before flow

---

## K) Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial canonical specification |
