-- SOVEREIGN ARCHITECT HARDENING - Core Functions Only
-- Skip profile creation, use existing INDIGO Fees account for dust

-- 1. Create cleanup_dormant_positions RPC
CREATE OR REPLACE FUNCTION public.cleanup_dormant_positions(
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_dormant RECORD;
BEGIN
  FOR v_dormant IN
    SELECT ip.investor_id, ip.fund_id
    FROM investor_positions ip
    WHERE ip.current_value = 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.voided_at IS NULL
      )
  LOOP
    IF NOT p_dry_run THEN
      DELETE FROM investor_positions 
      WHERE investor_id = v_dormant.investor_id 
        AND fund_id = v_dormant.fund_id;
    END IF;
    v_archived_count := v_archived_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'dormant_positions_found', v_archived_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_dormant_positions(boolean) TO authenticated;

-- 2. Add temporal_lock_bypass column
ALTER TABLE public.fund_daily_aum 
  ADD COLUMN IF NOT EXISTS temporal_lock_bypass boolean DEFAULT false;

-- 3. Create validate_yield_temporal_lock function
CREATE OR REPLACE FUNCTION public.validate_yield_temporal_lock(
  p_fund_id uuid,
  p_yield_date date,
  p_purpose text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aum_record record;
BEGIN
  SELECT id, created_at, temporal_lock_bypass
  INTO v_aum_record
  FROM fund_daily_aum 
  WHERE fund_id = p_fund_id 
    AND aum_date = p_yield_date
    AND purpose = p_purpose::aum_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_aum_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'code', 'NO_AUM');
  END IF;
  
  IF v_aum_record.created_at::date = CURRENT_DATE 
     AND p_yield_date = CURRENT_DATE 
     AND NOT COALESCE(v_aum_record.temporal_lock_bypass, false) THEN
    RETURN jsonb_build_object('valid', false, 'code', 'TEMPORAL_LOCK');
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'aum_id', v_aum_record.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_yield_temporal_lock(uuid, date, text) TO authenticated;

-- 4. Add dust tracking columns
ALTER TABLE public.yield_distributions 
  ADD COLUMN IF NOT EXISTS dust_amount numeric(28,10) DEFAULT 0;

ALTER TABLE public.yield_distributions 
  ADD COLUMN IF NOT EXISTS dust_receiver_id uuid REFERENCES profiles(id);