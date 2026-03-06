-- Rollback yield correction RPC
CREATE OR REPLACE FUNCTION public.rollback_yield_correction(
  p_correction_id UUID,
  p_reason TEXT DEFAULT 'Manual rollback'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_correction RECORD;
  v_rollback_id UUID := gen_random_uuid();
  v_investor_count INTEGER := 0;
  v_total_reversed NUMERIC := 0;
  rec RECORD;
  v_ref TEXT;
BEGIN
  -- Get the correction record
  SELECT * INTO v_correction
  FROM yield_corrections
  WHERE id = p_correction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction not found');
  END IF;
  
  IF v_correction.status = 'rolled_back' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction already rolled back');
  END IF;
  
  IF v_correction.status != 'applied' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only applied corrections can be rolled back');
  END IF;
  
  -- Find all transactions created by this correction and reverse them
  FOR rec IN
    SELECT t.investor_id, t.fund_id, t.amount, t.type, t.asset, t.fund_class
    FROM transactions_v2 t
    WHERE t.reference_id LIKE '%' || p_correction_id::text || '%'
      AND t.type IN ('CORRECTION', 'YIELD_CORRECTION')
  LOOP
    v_investor_count := v_investor_count + 1;
    v_total_reversed := v_total_reversed + ABS(rec.amount);
    
    v_ref := format('rollback:%s:%s:%s', v_rollback_id, rec.investor_id, rec.fund_id);
    
    -- Create reverse transaction
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount,
      tx_date, reference_id, notes, created_by, created_at
    ) VALUES (
      gen_random_uuid(), rec.investor_id, rec.fund_id, 'CORRECTION',
      rec.asset, rec.fund_class, -rec.amount,  -- Negate the amount
      CURRENT_DATE, v_ref,
      format('Rollback of correction %s: %s', LEFT(p_correction_id::text, 8), p_reason),
      auth.uid(), NOW()
    );
    
    -- Update investor position
    UPDATE investor_positions
    SET current_value = current_value - rec.amount, updated_at = NOW()
    WHERE investor_id = rec.investor_id AND fund_id = rec.fund_id;
  END LOOP;
  
  -- Update correction status
  UPDATE yield_corrections
  SET status = 'rolled_back',
      rolled_back_at = NOW(),
      rolled_back_by = auth.uid(),
      rollback_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_correction_id;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'YIELD_CORRECTION_ROLLBACK',
    'yield_corrections',
    p_correction_id::text,
    auth.uid(),
    jsonb_build_object(
      'rollback_id', v_rollback_id,
      'reason', p_reason,
      'investors_affected', v_investor_count,
      'total_reversed', v_total_reversed
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'rollback_id', v_rollback_id,
    'investors_affected', v_investor_count,
    'total_reversed', v_total_reversed
  );
END;
$$;

-- Regenerate reports for correction RPC
CREATE OR REPLACE FUNCTION public.regenerate_reports_for_correction(p_correction_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_correction RECORD;
  v_period_id UUID;
  v_affected_investors UUID[];
  v_statements_marked INTEGER := 0;
BEGIN
  -- Get the correction record
  SELECT * INTO v_correction
  FROM yield_corrections
  WHERE id = p_correction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction not found');
  END IF;
  
  -- Get affected investors from correction transactions
  SELECT ARRAY_AGG(DISTINCT t.investor_id) INTO v_affected_investors
  FROM transactions_v2 t
  WHERE t.reference_id LIKE '%' || p_correction_id::text || '%';
  
  IF v_affected_investors IS NULL OR array_length(v_affected_investors, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No affected investors found');
  END IF;
  
  -- Find the period that contains the correction date
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE period_start_date <= v_correction.correction_date
    AND period_end_date >= v_correction.correction_date
  ORDER BY period_end_date DESC
  LIMIT 1;
  
  IF v_period_id IS NULL THEN
    -- Use the most recent period
    SELECT id INTO v_period_id
    FROM statement_periods
    ORDER BY period_end_date DESC
    LIMIT 1;
  END IF;
  
  -- Mark existing statements as needing regeneration (delete them)
  DELETE FROM generated_statements
  WHERE investor_id = ANY(v_affected_investors)
    AND period_id = v_period_id;
  
  GET DIAGNOSTICS v_statements_marked = ROW_COUNT;
  
  -- Update investor_fund_performance to trigger recalculation
  UPDATE investor_fund_performance
  SET updated_at = NOW()
  WHERE investor_id = ANY(v_affected_investors)
    AND period_id = v_period_id;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'REPORTS_REGENERATION_TRIGGERED',
    'yield_corrections',
    p_correction_id::text,
    auth.uid(),
    jsonb_build_object(
      'period_id', v_period_id,
      'affected_investors', v_affected_investors,
      'statements_cleared', v_statements_marked
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period_id,
    'affected_investors', array_length(v_affected_investors, 1),
    'statements_cleared', v_statements_marked
  );
END;
$$;

-- Add missing columns to yield_corrections if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'yield_corrections' 
                 AND column_name = 'rolled_back_at') THEN
    ALTER TABLE public.yield_corrections 
      ADD COLUMN rolled_back_at TIMESTAMPTZ,
      ADD COLUMN rolled_back_by UUID REFERENCES auth.users(id),
      ADD COLUMN rollback_reason TEXT;
  END IF;
END $$;