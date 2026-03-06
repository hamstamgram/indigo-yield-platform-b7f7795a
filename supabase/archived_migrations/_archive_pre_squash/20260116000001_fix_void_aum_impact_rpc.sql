-- ============================================================================
-- P0 Fix 3: Create get_void_aum_impact RPC for fund_daily_aum records
-- Date: 2026-01-16
-- Issue: getYieldVoidImpact was passing fund_daily_aum.id to an RPC that
--        expected yield_distributions.id, causing "Distribution not found"
-- ============================================================================

BEGIN;

-- Create the correct RPC that accepts a fund_daily_aum record ID
CREATE OR REPLACE FUNCTION public.get_void_aum_impact(p_record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aum_record RECORD;
  v_dist_count INTEGER := 0;
  v_tx_count INTEGER := 0;
  v_affected_investors INTEGER := 0;
  v_total_yield NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_investors jsonb;
BEGIN
  -- Get the fund_daily_aum record
  SELECT fda.*, f.name AS fund_name, f.asset AS fund_asset
  INTO v_aum_record
  FROM fund_daily_aum fda
  LEFT JOIN funds f ON f.id = fda.fund_id
  WHERE fda.id = p_record_id;

  IF v_aum_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUM record not found');
  END IF;

  IF v_aum_record.is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record is already voided');
  END IF;

  -- Count related distributions that would be voided (using same logic as void_fund_daily_aum)
  SELECT COUNT(*) INTO v_dist_count
  FROM yield_distributions yd
  WHERE (yd.aum_record_id = p_record_id
         OR (yd.aum_record_id IS NULL
             AND yd.fund_id = v_aum_record.fund_id
             AND yd.effective_date = v_aum_record.aum_date
             AND yd.purpose::text = v_aum_record.purpose::text))
    AND yd.status != 'voided';

  -- Get transactions and affected investors from related distributions
  SELECT
    COUNT(*),
    COUNT(DISTINCT t.investor_id),
    COALESCE(SUM(CASE WHEN t.type = 'YIELD' THEN t.amount ELSE 0 END), 0)
  INTO v_tx_count, v_affected_investors, v_total_yield
  FROM transactions_v2 t
  JOIN yield_distributions yd ON yd.id = t.distribution_id
  WHERE (yd.aum_record_id = p_record_id
         OR (yd.aum_record_id IS NULL
             AND yd.fund_id = v_aum_record.fund_id
             AND yd.effective_date = v_aum_record.aum_date
             AND yd.purpose::text = v_aum_record.purpose::text))
    AND yd.status != 'voided'
    AND t.is_voided = false;

  -- Sum fees from related distributions
  SELECT COALESCE(SUM(fa.fee_amount), 0) INTO v_total_fees
  FROM fee_allocations fa
  JOIN yield_distributions yd ON yd.id = fa.distribution_id
  WHERE (yd.aum_record_id = p_record_id
         OR (yd.aum_record_id IS NULL
             AND yd.fund_id = v_aum_record.fund_id
             AND yd.effective_date = v_aum_record.aum_date
             AND yd.purpose::text = v_aum_record.purpose::text))
    AND yd.status != 'voided'
    AND fa.is_voided = false;

  -- Get affected investor details
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', inv.investor_id,
    'investor_name', inv.investor_name,
    'current_position', inv.current_position,
    'yield_amount', inv.yield_amount,
    'fee_amount', inv.fee_amount
  )), '[]'::jsonb)
  INTO v_investors
  FROM (
    SELECT DISTINCT ON (t.investor_id)
      t.investor_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS investor_name,
      COALESCE(ip.current_value, 0) AS current_position,
      SUM(CASE WHEN t.type = 'YIELD' THEN t.amount ELSE 0 END) OVER (PARTITION BY t.investor_id) AS yield_amount,
      COALESCE((
        SELECT SUM(fa2.fee_amount)
        FROM fee_allocations fa2
        JOIN yield_distributions yd2 ON yd2.id = fa2.distribution_id
        WHERE fa2.investor_id = t.investor_id
          AND (yd2.aum_record_id = p_record_id
               OR (yd2.aum_record_id IS NULL
                   AND yd2.fund_id = v_aum_record.fund_id
                   AND yd2.effective_date = v_aum_record.aum_date
                   AND yd2.purpose::text = v_aum_record.purpose::text))
          AND yd2.status != 'voided'
          AND fa2.is_voided = false
      ), 0) AS fee_amount
    FROM transactions_v2 t
    JOIN yield_distributions yd ON yd.id = t.distribution_id
    LEFT JOIN profiles p ON p.id = t.investor_id
    LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = v_aum_record.fund_id
    WHERE (yd.aum_record_id = p_record_id
           OR (yd.aum_record_id IS NULL
               AND yd.fund_id = v_aum_record.fund_id
               AND yd.effective_date = v_aum_record.aum_date
               AND yd.purpose::text = v_aum_record.purpose::text))
      AND yd.status != 'voided'
      AND t.is_voided = false
      AND t.type = 'YIELD'
    ORDER BY t.investor_id, t.amount DESC
  ) inv;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', p_record_id,
    'fund_id', v_aum_record.fund_id,
    'fund_name', v_aum_record.fund_name,
    'fund_asset', v_aum_record.fund_asset,
    'aum_date', v_aum_record.aum_date,
    'total_aum', v_aum_record.total_aum,
    'purpose', v_aum_record.purpose,
    'distributions_to_void', v_dist_count,
    'transactions_to_void', v_tx_count,
    'affected_investor_count', v_affected_investors,
    'total_yield_amount', v_total_yield,
    'total_fee_amount', v_total_fees,
    'affected_investors', v_investors
  );
END;
$$;

COMMENT ON FUNCTION get_void_aum_impact(uuid) IS
  'Preview impact of voiding a fund_daily_aum record. Shows affected distributions, transactions, and investors.';

COMMIT;
