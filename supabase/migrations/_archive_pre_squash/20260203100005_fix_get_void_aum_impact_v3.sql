-- Bug #6: Fix get_void_aum_impact to use distribution-based matching
-- Mirrors the fixed void_fund_daily_aum logic (yield_allocations linkage)
-- Adds monetary totals + ib_commission_ledger/platform_fee_ledger counts

CREATE OR REPLACE FUNCTION public.get_void_aum_impact(p_record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aum_record RECORD;
  v_distribution_ids uuid[];
  v_dist_count integer := 0;
  v_tx_count integer := 0;
  v_affected_investors integer := 0;
  v_total_yield numeric := 0;
  v_total_fee numeric := 0;
  v_total_ib numeric := 0;
  v_ib_ledger_count integer := 0;
  v_platform_fee_count integer := 0;
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

  -- Collect distribution IDs (same logic as void_fund_daily_aum v3)
  v_distribution_ids := ARRAY(
    SELECT id FROM yield_distributions
    WHERE fund_id = v_aum_record.fund_id
      AND effective_date = v_aum_record.aum_date
      AND purpose::text = v_aum_record.purpose::text
      AND status != 'voided'
      AND (is_voided = false OR is_voided IS NULL)
  );

  v_dist_count := COALESCE(array_length(v_distribution_ids, 1), 0);

  -- If no distributions, return early with zero counts
  IF v_dist_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'record_id', p_record_id,
      'fund_id', v_aum_record.fund_id,
      'fund_name', v_aum_record.fund_name,
      'fund_asset', v_aum_record.fund_asset,
      'aum_date', v_aum_record.aum_date,
      'total_aum', v_aum_record.total_aum,
      'purpose', v_aum_record.purpose,
      'distributions_to_void', 0,
      'transactions_to_void', 0,
      'affected_investor_count', 0,
      'total_yield_amount', 0,
      'total_fee_amount', 0,
      'total_ib_amount', 0,
      'ib_ledger_count', 0,
      'platform_fee_count', 0,
      'affected_investors', '[]'::jsonb
    );
  END IF;

  -- Count transactions via yield_allocations linkage (matches void logic)
  WITH linked_tx AS (
    SELECT DISTINCT unnest(ARRAY[ya.transaction_id, ya.fee_transaction_id, ya.ib_transaction_id]) AS tx_id
    FROM yield_allocations ya
    WHERE ya.distribution_id = ANY(v_distribution_ids)
      AND (ya.is_voided = false OR ya.is_voided IS NULL)
  )
  SELECT COUNT(*) INTO v_tx_count
  FROM transactions_v2
  WHERE id IN (SELECT tx_id FROM linked_tx WHERE tx_id IS NOT NULL)
    AND is_voided = false;

  -- Also count FEE_CREDIT transactions by reference_id
  v_tx_count := v_tx_count + (
    SELECT COUNT(*) FROM transactions_v2
    WHERE reference_id IN (SELECT 'fee_credit_' || unnest(v_distribution_ids)::text)
      AND is_voided = false
  );

  -- Get affected investors and monetary totals from yield_allocations
  SELECT
    COUNT(DISTINCT ya.investor_id),
    COALESCE(SUM(ya.net_amount), 0),
    COALESCE(SUM(ya.fee_amount), 0),
    COALESCE(SUM(ya.ib_amount), 0)
  INTO v_affected_investors, v_total_yield, v_total_fee, v_total_ib
  FROM yield_allocations ya
  WHERE ya.distribution_id = ANY(v_distribution_ids)
    AND (ya.is_voided = false OR ya.is_voided IS NULL);

  -- Count ib_commission_ledger entries
  SELECT COUNT(*) INTO v_ib_ledger_count
  FROM ib_commission_ledger
  WHERE yield_distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);

  -- Count platform_fee_ledger entries
  SELECT COUNT(*) INTO v_platform_fee_count
  FROM platform_fee_ledger
  WHERE yield_distribution_id = ANY(v_distribution_ids)
    AND (is_voided = false OR is_voided IS NULL);

  -- Get affected investor details
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', inv.investor_id,
    'investor_name', inv.investor_name,
    'current_position', inv.current_position,
    'yield_amount', inv.yield_amount,
    'fee_amount', inv.fee_amount,
    'ib_amount', inv.ib_amount
  )), '[]'::jsonb)
  INTO v_investors
  FROM (
    SELECT
      ya.investor_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS investor_name,
      COALESCE(ip.current_value, 0) AS current_position,
      SUM(ya.net_amount) AS yield_amount,
      SUM(ya.fee_amount) AS fee_amount,
      SUM(COALESCE(ya.ib_amount, 0)) AS ib_amount
    FROM yield_allocations ya
    LEFT JOIN profiles p ON p.id = ya.investor_id
    LEFT JOIN investor_positions ip ON ip.investor_id = ya.investor_id AND ip.fund_id = v_aum_record.fund_id
    WHERE ya.distribution_id = ANY(v_distribution_ids)
      AND (ya.is_voided = false OR ya.is_voided IS NULL)
    GROUP BY ya.investor_id, p.first_name, p.last_name, p.email, ip.current_value
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
    'total_fee_amount', v_total_fee,
    'total_ib_amount', v_total_ib,
    'ib_ledger_count', v_ib_ledger_count,
    'platform_fee_count', v_platform_fee_count,
    'affected_investors', v_investors
  );
END;
$$;
