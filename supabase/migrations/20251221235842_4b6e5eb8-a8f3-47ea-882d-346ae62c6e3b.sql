-- Drop existing functions that need parameter changes
DROP FUNCTION IF EXISTS public.rollback_yield_correction(UUID, TEXT);
DROP FUNCTION IF EXISTS public.regenerate_reports_for_correction(UUID);

-- Create rollback_yield_correction RPC
CREATE OR REPLACE FUNCTION public.rollback_yield_correction(
  p_correction_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_correction RECORD;
  v_admin_id UUID := auth.uid();
  v_is_super_admin BOOLEAN;
  v_fund_id UUID;
  v_date DATE;
  v_purpose aum_purpose;
  v_tx RECORD;
  v_rollback_ref TEXT;
  v_rolled_back_count INTEGER := 0;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  SELECT public.is_super_admin() INTO v_is_super_admin;
  
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason must be at least 10 characters');
  END IF;
  
  SELECT yc.*, yd.fund_id, yd.effective_date, yd.purpose
  INTO v_correction
  FROM yield_corrections yc
  JOIN yield_distributions yd ON yd.id = yc.correction_distribution_id
  WHERE yc.id = p_correction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction not found');
  END IF;
  
  IF v_correction.status = 'rolled_back' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction already rolled back');
  END IF;
  
  v_fund_id := v_correction.fund_id;
  v_date := v_correction.effective_date;
  v_purpose := v_correction.purpose;
  
  FOR v_tx IN SELECT * FROM transactions_v2 WHERE correction_id = p_correction_id
  LOOP
    v_rollback_ref := format('rollback:%s:%s', p_correction_id, v_tx.reference_id);
    IF NOT EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_rollback_ref) THEN
      INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose, distribution_id, correction_id, visibility_scope, is_system_generated, source)
      VALUES (gen_random_uuid(), v_tx.investor_id, v_tx.fund_id, v_tx.type, v_tx.asset, v_tx.fund_class, -v_tx.amount, v_date, v_rollback_ref, format('Rollback: %s', p_reason), v_admin_id, now(), v_tx.purpose, v_tx.distribution_id, p_correction_id, v_tx.visibility_scope, true, 'yield_correction_rollback');
      
      UPDATE investor_positions SET current_value = current_value - v_tx.amount, updated_at = now() WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;
      v_rolled_back_count := v_rolled_back_count + 1;
    END IF;
  END LOOP;
  
  UPDATE fund_daily_aum SET total_aum = v_correction.old_aum, source = format('rollback:%s', p_correction_id), updated_at = now(), updated_by = v_admin_id WHERE fund_id = v_fund_id AND aum_date = v_date AND purpose = v_purpose;
  UPDATE yield_corrections SET status = 'rolled_back', rolled_back_at = now(), rolled_back_by = v_admin_id WHERE id = p_correction_id;
  UPDATE yield_distributions SET status = 'rolled_back' WHERE id = v_correction.correction_distribution_id;
  
  RETURN jsonb_build_object('success', true, 'correction_id', p_correction_id, 'transactions_reversed', v_rolled_back_count, 'restored_aum', v_correction.old_aum);
END;
$$;

-- Create regenerate_reports_for_correction RPC
CREATE OR REPLACE FUNCTION public.regenerate_reports_for_correction(p_correction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_correction RECORD;
  v_admin_id UUID := auth.uid();
  v_fund_id UUID;
  v_date DATE;
  v_period_id UUID;
  v_affected_investors UUID[];
  v_regenerated_count INTEGER := 0;
  v_inv_id UUID;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  SELECT yc.*, yd.fund_id, yd.effective_date INTO v_correction
  FROM yield_corrections yc JOIN yield_distributions yd ON yd.id = yc.correction_distribution_id
  WHERE yc.id = p_correction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction not found');
  END IF;
  
  v_fund_id := v_correction.fund_id;
  v_date := v_correction.effective_date;
  
  SELECT id INTO v_period_id FROM statement_periods WHERE period_end_date >= v_date ORDER BY period_end_date ASC LIMIT 1;
  
  SELECT ARRAY_AGG(DISTINCT investor_id) INTO v_affected_investors FROM transactions_v2 WHERE correction_id = p_correction_id;
  
  IF v_affected_investors IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'No investors affected', 'regenerated_count', 0);
  END IF;
  
  FOREACH v_inv_id IN ARRAY v_affected_investors
  LOOP
    DELETE FROM generated_statements WHERE investor_id = v_inv_id AND period_id = v_period_id;
    v_regenerated_count := v_regenerated_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'correction_id', p_correction_id, 'period_id', v_period_id, 'statements_cleared', v_regenerated_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rollback_yield_correction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_reports_for_correction(UUID) TO authenticated;