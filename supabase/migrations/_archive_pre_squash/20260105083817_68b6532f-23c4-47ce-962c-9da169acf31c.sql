-- ============================================
-- PHASE 7: Create matching preview_daily_yield_to_fund_v3
-- Must have identical calculation logic as apply_daily_yield_to_fund_v3
-- ============================================

CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS TABLE (
  investor_id uuid,
  investor_name text,
  opening_balance numeric,
  ownership_pct numeric,
  gross_yield numeric,
  fee_pct numeric,
  fee_amount numeric,
  net_yield numeric,
  closing_balance numeric,
  ib_name text,
  ib_commission numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening_aum numeric(28,10);
  v_gross_yield_amount numeric(28,10);
BEGIN
  -- Opening AUM source:
  -- Prefer fund_aum_events (canonical stream) when present; otherwise fall back to fund_daily_aum.
  IF to_regclass('public.fund_aum_events') IS NOT NULL THEN
    EXECUTE $q$
      SELECT closing_aum
      FROM public.fund_aum_events
      WHERE fund_id = $1
        AND purpose = $2
        AND is_voided = false
        AND event_ts < ($3::date::timestamptz)
      ORDER BY event_ts DESC
      LIMIT 1
    $q$
    INTO v_opening_aum
    USING p_fund_id, p_purpose, p_yield_date;
  ELSE
    SELECT total_aum
    INTO v_opening_aum
    FROM public.fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date < p_yield_date
      AND purpose = p_purpose
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_opening_aum IS NULL OR v_opening_aum = 0 THEN
    v_opening_aum := round(p_new_aum::numeric, 10)::numeric(28,10); -- first record, no change
  END IF;

  v_gross_yield_amount := round((p_new_aum::numeric - v_opening_aum)::numeric, 10)::numeric(28,10);
  
  RETURN QUERY
  WITH investor_positions_cte AS (
    SELECT 
      ip.investor_id,
      trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) as investor_name,
      ip.current_value::numeric(28,10) as opening_balance,
      CASE 
        WHEN v_opening_aum > 0 THEN round(((ip.current_value / v_opening_aum) * 100)::numeric, 10)::numeric(28,10)
        ELSE 0::numeric(28,10)
      END as ownership_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND COALESCE(p.account_type, 'investor') <> 'fees_account'
  ),
  yield_calc AS (
    SELECT 
      ipc.investor_id,
      ipc.investor_name,
      ipc.opening_balance,
      ipc.ownership_pct,
      -- Ownership-weighted gross yield
      round(((ipc.ownership_pct / 100.0) * v_gross_yield_amount)::numeric, 10)::numeric(28,10) as gross_yield,
      -- Get fee percentage from schedule or profile
      COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs 
         WHERE ifs.investor_id = ipc.investor_id 
           AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
           AND ifs.effective_date <= p_yield_date
           AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
         ORDER BY ifs.fund_id NULLS LAST, ifs.effective_date DESC
         LIMIT 1),
        (SELECT pr.fee_pct FROM profiles pr WHERE pr.id = ipc.investor_id),
        20.0
      )::numeric(28,10) as fee_pct
    FROM investor_positions_cte ipc
  ),
  with_fees AS (
    SELECT 
      yc.*,
      CASE 
        WHEN yc.gross_yield > 0 THEN round((yc.gross_yield * (yc.fee_pct / 100.0))::numeric, 10)::numeric(28,10)
        ELSE 0::numeric(28,10)
      END as fee_amount,
      CASE 
        WHEN yc.gross_yield > 0 THEN round((yc.gross_yield * (1 - yc.fee_pct / 100.0))::numeric, 10)::numeric(28,10)
        ELSE yc.gross_yield
      END::numeric(28,10) as net_yield
    FROM yield_calc yc
  ),
  with_ib AS (
    SELECT 
      wf.*,
      wf.opening_balance + wf.net_yield as closing_balance,
      trim(coalesce(ib_profile.first_name,'') || ' ' || coalesce(ib_profile.last_name,'')) as ib_name,
      CASE 
        WHEN wf.fee_amount > 0 AND COALESCE(inv_profile.ib_percentage, 0) > 0 
        THEN round((wf.fee_amount * (inv_profile.ib_percentage / 100.0))::numeric, 10)::numeric(28,10)
        ELSE 0::numeric(28,10)
      END as ib_commission
    FROM with_fees wf
    JOIN profiles inv_profile ON inv_profile.id = wf.investor_id
    LEFT JOIN profiles ib_profile ON ib_profile.id = inv_profile.ib_parent_id
  )
  SELECT 
    wi.investor_id,
    wi.investor_name,
    wi.opening_balance,
    wi.ownership_pct,
    wi.gross_yield,
    wi.fee_pct,
    wi.fee_amount,
    wi.net_yield,
    wi.closing_balance,
    wi.ib_name,
    wi.ib_commission
  FROM with_ib wi
  ORDER BY wi.opening_balance DESC;
END;
$$;

-- Add documentation
COMMENT ON FUNCTION public.preview_daily_yield_to_fund_v3(uuid, date, numeric, aum_purpose) IS 
  'Preview yield distribution using v3 ownership-weighted calculation. Matches apply_daily_yield_to_fund_v3 logic exactly.';
