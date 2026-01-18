-- =============================================================================
-- BATCH POSITION RECONCILIATION WITH AUDIT TRAIL
-- Migration: 20260118000001_batch_reconcile_positions.sql
-- Purpose: Reconcile all investor positions with full audit logging
-- CFO Sign-off Required: YES (Financial Impact)
-- =============================================================================

-- 1) Create position correction log table for audit trail
CREATE TABLE IF NOT EXISTS public.position_correction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.profiles(id),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  old_value NUMERIC(28,10),
  new_value NUMERIC(28,10),
  variance NUMERIC(28,10),
  variance_percentage NUMERIC(10,4),
  corrected_at TIMESTAMPTZ DEFAULT now(),
  corrected_by TEXT DEFAULT 'system_reconciliation',
  reconciliation_batch_id UUID,
  notes TEXT
);

-- Index for querying by batch
CREATE INDEX IF NOT EXISTS idx_position_correction_log_batch
ON public.position_correction_log(reconciliation_batch_id);

-- Index for querying by investor
CREATE INDEX IF NOT EXISTS idx_position_correction_log_investor
ON public.position_correction_log(investor_id);

-- Index for querying by fund
CREATE INDEX IF NOT EXISTS idx_position_correction_log_fund
ON public.position_correction_log(fund_id);

-- RLS policy - only admins can read
ALTER TABLE public.position_correction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY position_correction_log_admin_select ON public.position_correction_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'OPERATIONS')
    )
  );

-- 2) Create enhanced reconciliation function with logging
CREATE OR REPLACE FUNCTION public.reconcile_investor_position_with_audit(
  p_investor_id UUID,
  p_fund_id UUID,
  p_batch_id UUID DEFAULT NULL,
  p_corrected_by TEXT DEFAULT 'system_reconciliation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stored_position NUMERIC(28,10);
  v_calculated_position NUMERIC(28,10);
  v_difference NUMERIC(28,10);
  v_variance_pct NUMERIC(10,4);
  v_result JSONB;
BEGIN
  -- Set canonical RPC flag (app.canonical_rpc is the correct parameter name)
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Get current stored position
  SELECT current_value INTO v_stored_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_stored_position IS NULL THEN
    v_stored_position := 0;
  END IF;

  -- Calculate position from transactions
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL') THEN -amount
      ELSE 0
    END
  ), 0) INTO v_calculated_position
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND is_voided = false;

  -- Calculate difference
  v_difference := v_stored_position - v_calculated_position;

  -- Calculate variance percentage (avoid division by zero)
  IF v_calculated_position != 0 THEN
    v_variance_pct := (v_difference / ABS(v_calculated_position)) * 100;
  ELSIF v_stored_position != 0 THEN
    v_variance_pct := 100; -- 100% variance if calculated is 0 but stored is not
  ELSE
    v_variance_pct := 0;
  END IF;

  -- Log correction if there's a variance
  IF ABS(v_difference) > 0.01 THEN
    INSERT INTO position_correction_log (
      investor_id,
      fund_id,
      old_value,
      new_value,
      variance,
      variance_percentage,
      corrected_by,
      reconciliation_batch_id,
      notes
    ) VALUES (
      p_investor_id,
      p_fund_id,
      v_stored_position,
      v_calculated_position,
      v_difference,
      v_variance_pct,
      p_corrected_by,
      p_batch_id,
      format('Auto-reconciliation: stored=%s, calculated=%s, diff=%s',
             v_stored_position, v_calculated_position, v_difference)
    );

    -- Update the position
    UPDATE investor_positions
    SET
      current_value = v_calculated_position,
      last_transaction_at = now(),
      updated_at = now()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

    -- If no row was updated, insert one
    IF NOT FOUND THEN
      INSERT INTO investor_positions (
        investor_id,
        fund_id,
        current_value,
        is_active,
        last_transaction_at,
        created_at,
        updated_at
      ) VALUES (
        p_investor_id,
        p_fund_id,
        v_calculated_position,
        v_calculated_position > 0,
        now(),
        now(),
        now()
      );
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'stored_position', v_stored_position,
    'calculated_position', v_calculated_position,
    'difference', v_difference,
    'variance_percentage', v_variance_pct,
    'was_corrected', ABS(v_difference) > 0.01
  );

  RETURN v_result;
END;
$$;

-- 3) Create batch reconciliation function
CREATE OR REPLACE FUNCTION public.batch_reconcile_all_positions(
  p_corrected_by TEXT DEFAULT 'batch_reconciliation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_batch_id UUID;
  v_result JSONB;
  v_total_checked INTEGER := 0;
  v_total_corrected INTEGER := 0;
  v_total_variance NUMERIC(28,10) := 0;
  v_max_variance NUMERIC(28,10) := 0;
  v_position_result JSONB;
BEGIN
  -- Set canonical RPC flag (app.canonical_rpc is the correct parameter name)
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Generate batch ID for this reconciliation run
  v_batch_id := gen_random_uuid();

  -- Iterate through all investor-fund combinations
  FOR r IN (
    SELECT DISTINCT
      COALESCE(ip.investor_id, t.investor_id) as investor_id,
      COALESCE(ip.fund_id, t.fund_id) as fund_id
    FROM investor_positions ip
    FULL OUTER JOIN (
      SELECT DISTINCT investor_id, fund_id
      FROM transactions_v2
      WHERE is_voided = false
    ) t ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
    WHERE COALESCE(ip.investor_id, t.investor_id) IS NOT NULL
      AND COALESCE(ip.fund_id, t.fund_id) IS NOT NULL
  ) LOOP
    v_total_checked := v_total_checked + 1;

    SELECT reconcile_investor_position_with_audit(
      r.investor_id,
      r.fund_id,
      v_batch_id,
      p_corrected_by
    ) INTO v_position_result;

    IF (v_position_result->>'was_corrected')::boolean THEN
      v_total_corrected := v_total_corrected + 1;
      v_total_variance := v_total_variance + ABS((v_position_result->>'difference')::NUMERIC);

      IF ABS((v_position_result->>'difference')::NUMERIC) > v_max_variance THEN
        v_max_variance := ABS((v_position_result->>'difference')::NUMERIC);
      END IF;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'batch_id', v_batch_id,
    'total_positions_checked', v_total_checked,
    'total_positions_corrected', v_total_corrected,
    'total_variance_corrected', v_total_variance,
    'largest_single_correction', v_max_variance,
    'executed_at', now(),
    'executed_by', p_corrected_by
  );

  RETURN v_result;
END;
$$;

-- 4) Create reconciliation report view
CREATE OR REPLACE VIEW public.v_position_reconciliation_status AS
SELECT
  ip.investor_id,
  ip.fund_id,
  p.full_name as investor_name,
  f.code as fund_code,
  f.asset as fund_asset,
  ip.current_value as stored_position,
  COALESCE(SUM(
    CASE
      WHEN t.type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL') THEN -t.amount
      ELSE 0
    END
  ), 0) as calculated_position,
  ip.current_value - COALESCE(SUM(
    CASE
      WHEN t.type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL') THEN -t.amount
      ELSE 0
    END
  ), 0) as variance,
  CASE
    WHEN ABS(ip.current_value - COALESCE(SUM(
      CASE
        WHEN t.type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE', 'IB_FEE', 'MANAGEMENT_FEE') THEN -t.amount
        ELSE 0
      END
    ), 0)) > 0.01 THEN 'NEEDS_RECONCILIATION'
    ELSE 'RECONCILED'
  END as status
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id
  AND t.fund_id = ip.fund_id
  AND t.is_voided = false
GROUP BY ip.investor_id, ip.fund_id, p.full_name, f.code, f.asset, ip.current_value;

-- 5) Create AUM reconciliation check function
CREATE OR REPLACE FUNCTION public.check_aum_reconciliation(
  p_fund_id UUID,
  p_tolerance NUMERIC DEFAULT 0.01
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recorded_aum NUMERIC(28,10);
  v_calculated_aum NUMERIC(28,10);
  v_discrepancy NUMERIC(28,10);
  v_is_reconciled BOOLEAN;
BEGIN
  -- Get recorded AUM from fund_daily_aum
  SELECT COALESCE(total_aum, 0) INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = CURRENT_DATE
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_recorded_aum IS NULL THEN
    -- Try yesterday if today not available
    SELECT COALESCE(total_aum, 0) INTO v_recorded_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  v_recorded_aum := COALESCE(v_recorded_aum, 0);

  -- Calculate AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_calculated_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id
    AND is_active = true;

  v_discrepancy := ABS(v_recorded_aum - v_calculated_aum);
  v_is_reconciled := v_discrepancy <= p_tolerance;

  RETURN jsonb_build_object(
    'fund_id', p_fund_id,
    'recorded_aum', v_recorded_aum,
    'calculated_aum', v_calculated_aum,
    'discrepancy', v_discrepancy,
    'tolerance', p_tolerance,
    'is_reconciled', v_is_reconciled,
    'checked_at', now()
  );
END;
$$;

-- 6) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reconcile_investor_position_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_reconcile_all_positions TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_aum_reconciliation TO authenticated;

-- 7) Log migration
INSERT INTO public.audit_log (
  action,
  entity_type,
  entity_id,
  details,
  created_at
) VALUES (
  'MIGRATION_APPLIED',
  'SYSTEM',
  '20260118000001',
  jsonb_build_object(
    'migration', '20260118000001_batch_reconcile_positions',
    'description', 'Batch position reconciliation with audit trail',
    'tables_created', ARRAY['position_correction_log'],
    'functions_created', ARRAY['reconcile_investor_position_with_audit', 'batch_reconcile_all_positions', 'check_aum_reconciliation'],
    'views_created', ARRAY['v_position_reconciliation_status']
  ),
  now()
);
