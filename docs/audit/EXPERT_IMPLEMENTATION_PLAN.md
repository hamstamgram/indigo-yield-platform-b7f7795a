# INDIGO Platform - Expert Implementation Plan
## P1/P2 Recommendations Implementation

**Date:** 2026-01-12
**Priority:** Complete institutional-grade reliability
**Estimated Scope:** 8 function enhancements + 2 new triggers + 1 new table

---

## Phase 1: HIGH Priority (P1) - This Week

### 1.1 Balance Re-Check in `complete_withdrawal`
**Risk:** Can complete withdrawal if balance changed between approval and completion
**Solution:** Add balance verification before processing

```sql
-- Before processing, verify:
SELECT current_value INTO v_current_balance
FROM investor_positions
WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id
FOR UPDATE;

IF v_current_balance < v_request.processed_amount THEN
  RAISE EXCEPTION 'Insufficient balance for completion';
END IF;
```

### 1.2 Duplicate Pending Request Check in `create_withdrawal_request`
**Risk:** Multiple pending withdrawal requests for same investor/fund
**Solution:** Check for existing pending requests

```sql
-- Add at start of function:
IF EXISTS (
  SELECT 1 FROM withdrawal_requests
  WHERE investor_id = p_investor_id
  AND fund_id = p_fund_id
  AND status IN ('pending', 'approved', 'processing')
) THEN
  RAISE EXCEPTION 'Existing withdrawal request in progress';
END IF;
```

### 1.3 Transaction Amount Sign Validation
**Risk:** WITHDRAWAL/FEE transactions with positive amounts
**Solution:** Enforce correct signs based on transaction type

```sql
-- Validate transaction amounts:
IF p_type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') AND p_amount > 0 THEN
  p_amount := -ABS(p_amount); -- Auto-correct to negative
END IF;

IF p_type IN ('DEPOSIT', 'YIELD', 'IB_CREDIT') AND p_amount < 0 THEN
  RAISE EXCEPTION 'Invalid amount sign for transaction type %', p_type;
END IF;
```

### 1.4 Unique Reference ID Enforcement
**Risk:** Duplicate reference_id on retry after partial failure
**Solution:** Add unique constraint with retry logic

```sql
-- Add partial unique index:
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_v2_reference_unique
ON transactions_v2 (reference_id)
WHERE reference_id IS NOT NULL AND NOT is_voided;
```

### 1.5 Shares Column Auto-Update
**Risk:** shares column always 0, breaks unit-based calculations
**Solution:** Sync shares with current_value for unit-based funds

```sql
-- In position update logic:
shares = CASE
  WHEN (SELECT fund_class FROM funds WHERE id = p_fund_id) = 'unit_based'
  THEN current_value
  ELSE shares
END
```

---

## Phase 2: MEDIUM Priority (P2) - This Month

### 2.1 Idempotency Keys for Yield Distribution
**Purpose:** Prevent duplicate processing on retry
**Solution:** Add idempotency_key column and check

```sql
-- Add column:
ALTER TABLE yield_distributions
ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_yield_distributions_idempotency
ON yield_distributions (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Check in function:
IF p_idempotency_key IS NOT NULL THEN
  SELECT id INTO v_existing FROM yield_distributions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'distribution_id', v_existing);
  END IF;
END IF;
```

### 2.2 Auto-Trigger AUM Update After Transactions
**Purpose:** Ensure AUM always reflects position changes
**Solution:** Create trigger on investor_positions

```sql
CREATE OR REPLACE FUNCTION trg_auto_update_aum()
RETURNS TRIGGER AS $$
BEGIN
  -- Debounce: only update if significant change
  IF ABS(COALESCE(NEW.current_value, 0) - COALESCE(OLD.current_value, 0)) > 0.01 THEN
    PERFORM recalculate_fund_aum_for_date(NEW.fund_id, CURRENT_DATE, 'transaction');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_positions_aum_sync
AFTER INSERT OR UPDATE ON investor_positions
FOR EACH ROW EXECUTE FUNCTION trg_auto_update_aum();
```

### 2.3 Minimum Yield Threshold
**Purpose:** Prevent processing trivial yields
**Solution:** Add threshold check

```sql
-- At start of apply_daily_yield_to_fund_v3:
IF v_gross_yield_amount < 0.01 THEN
  RETURN jsonb_build_object('success', false, 'error', 'Yield below minimum threshold', 'code', 'BELOW_THRESHOLD');
END IF;
```

### 2.4 Maximum Yield Percentage Validation
**Purpose:** Prevent erroneous high yield percentages
**Solution:** Add sanity check

```sql
-- Validate yield percentage:
IF p_gross_yield_pct > 50 THEN -- 50% daily yield is suspicious
  RETURN jsonb_build_object('success', false, 'error', 'Yield percentage exceeds maximum (50%)', 'code', 'YIELD_TOO_HIGH');
END IF;

IF p_gross_yield_pct < 0 THEN
  RETURN jsonb_build_object('success', false, 'error', 'Yield percentage cannot be negative', 'code', 'NEGATIVE_YIELD');
END IF;
```

### 2.5 Consistent Audit Log Usage
**Purpose:** Complete audit trail across all operations
**Solution:** Standardize audit log format

```sql
-- Standard audit log function:
CREATE OR REPLACE FUNCTION log_financial_operation(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_meta jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE v_log_id uuid;
BEGIN
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta, created_at)
  VALUES (p_action, p_entity, p_entity_id, auth.uid(), p_old_values, p_new_values, p_meta, now())
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 2.6 Operation Metrics Table
**Purpose:** Track operation performance and success rates
**Solution:** Create metrics table

```sql
CREATE TABLE IF NOT EXISTS operation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_name text NOT NULL,
  operation_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  success boolean,
  error_code text,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_operation_metrics_name_time ON operation_metrics (operation_name, started_at DESC);
```

---

## Phase 3: ENHANCEMENTS - Ongoing

### 3.1 Event Sourcing Foundation
- All state changes derived from immutable events
- Enable point-in-time reconstruction
- Complete audit trail

### 3.2 Saga Pattern for Multi-Step Operations
- Compensation handlers for partial failures
- Clean rollback capability
- Transaction boundary management

### 3.3 CQRS Implementation
- Separate read/write models
- Optimized reporting queries
- Real-time dashboard support

### 3.4 Circuit Breaker
- Prevent cascade failures
- Auto-recovery mechanisms
- Graceful degradation

### 3.5 Real-Time Monitoring
- Prometheus metrics exposition
- Grafana dashboards
- PagerDuty/Opsgenie alerting

---

## Implementation Order

| Order | Item | Complexity | Risk Mitigation |
|-------|------|------------|-----------------|
| 1 | complete_withdrawal balance check | Low | Non-breaking |
| 2 | create_withdrawal duplicate check | Low | Non-breaking |
| 3 | Transaction sign validation | Low | Auto-correct |
| 4 | Reference ID unique constraint | Medium | Partial index |
| 5 | AUM auto-trigger | Medium | Debounced |
| 6 | Idempotency keys | Medium | Backward compatible |
| 7 | Yield thresholds | Low | Configurable |
| 8 | Metrics table | Low | New table |
| 9 | Standard audit function | Low | New function |

---

## Testing Strategy

### Unit Tests
- Each function in isolation
- Edge cases (zero amounts, negative, overflow)
- Error handling paths

### Integration Tests
- Full deposit → yield → withdrawal flow
- Concurrent operations
- Failure recovery

### Load Tests
- 100 concurrent yield distributions
- 1000 transactions per minute
- AUM recalculation under load

---

## Rollback Plan

Each change includes:
1. Pre-change snapshot
2. Verification queries
3. Rollback script
4. Communication plan

---

*Plan created: 2026-01-12*
*Next review: After Phase 1 completion*
