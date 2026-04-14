-- P0-REGR-1: Fix invalid enum reference in audit_leakage_report()
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