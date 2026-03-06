-- Phase 2 Cleanup: Drop broken functions and fix get_void_yield_impact

-- 1. Drop month closure functions that reference dropped table
DROP FUNCTION IF EXISTS public.close_fund_reporting_month(uuid, date, date, uuid, text);
DROP FUNCTION IF EXISTS public.reopen_fund_reporting_month(uuid, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_month_closure_status(uuid, date);

-- 2. Drop and recreate get_void_yield_impact to fix p.display_name reference
DROP FUNCTION IF EXISTS public.get_void_yield_impact(uuid);

CREATE OR REPLACE FUNCTION public.get_void_yield_impact(p_distribution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_distribution_exists boolean;
  v_is_voided boolean;
BEGIN
  -- Check if distribution exists
  SELECT EXISTS(SELECT 1 FROM yield_distributions WHERE id = p_distribution_id)
  INTO v_distribution_exists;
  
  IF NOT v_distribution_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Distribution not found'
    );
  END IF;
  
  -- Check if already voided
  SELECT is_voided INTO v_is_voided
  FROM yield_distributions
  WHERE id = p_distribution_id;
  
  IF v_is_voided THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Distribution is already voided'
    );
  END IF;
  
  -- Get impact summary
  SELECT jsonb_build_object(
    'success', true,
    'distribution', jsonb_build_object(
      'id', yd.id,
      'fund_id', yd.fund_id,
      'fund_name', f.name,
      'period_start', yd.period_start,
      'period_end', yd.period_end,
      'gross_yield_amount', yd.gross_yield_amount,
      'gross_yield_pct', yd.gross_yield_pct,
      'total_fees', yd.total_fees,
      'net_yield_amount', yd.net_yield_amount,
      'created_at', yd.created_at
    ),
    'affected_allocations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'investor_id', ya.investor_id,
        'investor_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        'gross_yield', ya.gross_yield_amount,
        'fee_amount', ya.fee_amount,
        'net_yield', ya.net_yield_amount
      )), '[]'::jsonb)
      FROM yield_allocations ya
      JOIN profiles p ON p.id = ya.investor_id
      WHERE ya.distribution_id = p_distribution_id
        AND ya.is_voided = false
    ),
    'affected_fee_allocations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'investor_id', fa.investor_id,
        'investor_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        'fee_amount', fa.fee_amount
      )), '[]'::jsonb)
      FROM fee_allocations fa
      JOIN profiles p ON p.id = fa.investor_id
      WHERE fa.distribution_id = p_distribution_id
        AND fa.is_voided = false
    ),
    'affected_transactions_count', (
      SELECT COUNT(*)
      FROM transactions_v2 t
      WHERE t.distribution_id = p_distribution_id
        AND t.is_voided = false
    )
  ) INTO v_result
  FROM yield_distributions yd
  JOIN funds f ON f.id = yd.fund_id
  WHERE yd.id = p_distribution_id;
  
  RETURN v_result;
END;
$$;