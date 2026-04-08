

# Fix P0-REGR-1 + Drop 2 Remaining Duplicate Indexes

## Findings (verified live)

1. **P0-REGR-1**: `audit_leakage_report()` references `'REDEMPTION'` in the `t1.type IN (...)` clause — this enum value does not exist in `tx_type`, crashing the function on every call.

2. **Duplicate index #1**: `idx_audit_log_date` and `idx_audit_log_created_desc` are identical — both `btree (created_at DESC)` on `audit_log`.

3. **Duplicate index #2**: `uq_investor_positions_investor_fund` is `UNIQUE (investor_id, fund_id)` — identical to `investor_positions_pkey` which is also `UNIQUE (investor_id, fund_id)`.

## Single Migration

One migration that:

1. **Replaces `audit_leakage_report()`** — changes `'WITHDRAWAL', 'REDEMPTION'` to `'WITHDRAWAL', 'INTERNAL_WITHDRAWAL'` (matching the correct enum values). Preserves the service_role guard and all 4 checks.

2. **Drops `idx_audit_log_date`** — redundant with `idx_audit_log_created_desc`.

3. **Drops `uq_investor_positions_investor_fund`** — redundant with `investor_positions_pkey`.

## SQL

```sql
-- P0-REGR-1: Fix invalid enum reference
CREATE OR REPLACE FUNCTION public.audit_leakage_report()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_asym int; v_neg_cb int; v_fee int; v_ib int;
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin','service_role')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required' USING ERRCODE='P0001';
  END IF;

  SELECT count(*) INTO v_asym
  FROM transactions_v2 t1
  JOIN transactions_v2 t2
    ON t1.investor_id = t2.investor_id AND t1.fund_id = t2.fund_id
  WHERE t1.is_voided = true
    AND t2.is_voided = false
    AND t1.type IN ('WITHDRAWAL','INTERNAL_WITHDRAWAL')
    AND t2.type IN ('DUST_SWEEP','ADJUSTMENT')
    AND t2.meta->>'related_tx' = t1.id::text;

  SELECT count(*) INTO v_neg_cb FROM investor_positions WHERE cost_basis < 0 AND is_active;
  SELECT count(*) INTO v_fee FROM fee_allocations fa
    JOIN yield_distributions yd ON fa.distribution_id = yd.id
    WHERE fa.is_voided = false AND yd.is_voided = false AND fa.fee_amount <= 0;
  SELECT count(*) INTO v_ib FROM ib_commission_ledger
    WHERE is_voided = false AND ib_commission_amount <= 0;

  RETURN jsonb_build_object(
    'overall_status', CASE WHEN v_asym+v_neg_cb+v_fee+v_ib = 0 THEN 'pass' ELSE 'fail' END,
    'checks', jsonb_build_array(
      jsonb_build_object('check','asymmetric_voids','violations',v_asym),
      jsonb_build_object('check','negative_cost_basis','violations',v_neg_cb),
      jsonb_build_object('check','fee_allocation_leakage','violations',v_fee),
      jsonb_build_object('check','ib_commission_leakage','violations',v_ib)),
    'run_at', now());
END;$$;

-- P1: Drop remaining duplicate indexes
DROP INDEX IF EXISTS idx_audit_log_date;
DROP INDEX IF EXISTS uq_investor_positions_investor_fund;
```

## Post-Migration

Update `docs/gates/gate-0-report.md` to record P0-REGR-1 as resolved and the final duplicate index cleanup.

