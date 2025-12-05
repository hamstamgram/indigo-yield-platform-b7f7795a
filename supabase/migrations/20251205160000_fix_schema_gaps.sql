-- Fix schema gaps for build errors

-- 1. Create platform_fees_collected VIEW (maps fee_calculations to the expected frontend structure)
CREATE OR REPLACE VIEW public.platform_fees_collected AS
SELECT
    fc.id,
    fc.investor_id,
    fc.fee_amount,
    f.asset AS asset_code,
    fc.calculation_date AS fee_date,
    DATE_TRUNC('month', fc.calculation_date)::DATE AS fee_month,
    fc.created_at
FROM public.fee_calculations fc
JOIN public.funds f ON fc.fund_id = f.id;

-- 2. Create monthly_fee_summary VIEW (aggregates yields and fees)
CREATE OR REPLACE VIEW public.monthly_fee_summary AS
WITH monthly_yields AS (
    SELECT
        report_month AS summary_month,
        asset_code,
        SUM(yield_earned) as total_gross_yield,
        COUNT(DISTINCT investor_id) as investor_count
    FROM public.investor_monthly_reports
    GROUP BY report_month, asset_code
),
monthly_fees AS (
    SELECT
        DATE_TRUNC('month', fc.calculation_date)::DATE AS summary_month,
        f.asset AS asset_code,
        SUM(fc.fee_amount) as total_fees_collected
    FROM public.fee_calculations fc
    JOIN public.funds f ON fc.fund_id = f.id
    GROUP BY DATE_TRUNC('month', fc.calculation_date), f.asset
)
SELECT
    y.summary_month::text as summary_month, -- Cast to text for frontend compatibility
    y.asset_code,
    COALESCE(f.total_fees_collected, 0) as total_fees_collected,
    y.total_gross_yield,
    (y.total_gross_yield - COALESCE(f.total_fees_collected, 0)) as total_net_yield,
    y.investor_count
FROM monthly_yields y
LEFT JOIN monthly_fees f ON y.summary_month = f.summary_month AND y.asset_code = f.asset_code;

-- 3. Create get_all_investors_with_details RPC
CREATE OR REPLACE FUNCTION public.get_all_investors_with_details()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
      RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id, 
    p.email, 
    p.first_name, 
    p.last_name, 
    p.created_at
  FROM public.profiles p
  WHERE p.is_admin = FALSE
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. Create get_fund_composition RPC
CREATE OR REPLACE FUNCTION public.get_fund_composition(p_fund_id UUID, p_date DATE)
RETURNS TABLE (
    investor_name TEXT,
    email TEXT,
    balance NUMERIC,
    ownership_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fund_asset TEXT;
    v_total_fund_balance NUMERIC;
    v_report_month DATE;
BEGIN
    -- Get asset code for the fund
    SELECT asset INTO v_fund_asset FROM public.funds WHERE id = p_fund_id;
    
    -- Normalize date to start of month for report lookup
    v_report_month := DATE_TRUNC('month', p_date)::DATE;

    -- Calculate total balance for this asset/month to derive ownership %
    SELECT SUM(closing_balance) INTO v_total_fund_balance
    FROM public.investor_monthly_reports
    WHERE asset_code = v_fund_asset AND report_month = v_report_month;

    -- Return query
    RETURN QUERY
    SELECT 
        (p.first_name || ' ' || p.last_name) as investor_name,
        p.email,
        imr.closing_balance as balance,
        CASE 
            WHEN v_total_fund_balance > 0 THEN (imr.closing_balance / v_total_fund_balance) * 100
            ELSE 0
        END as ownership_pct
    FROM public.investor_monthly_reports imr
    JOIN public.investors i ON imr.investor_id = i.id
    JOIN public.profiles p ON i.profile_id = p.id
    WHERE imr.asset_code = v_fund_asset 
      AND imr.report_month = v_report_month
      AND imr.closing_balance > 0;
END;
$$;

-- 5. Create update_user_profile_secure RPC
CREATE OR REPLACE FUNCTION public.update_user_profile_secure(
    p_user_id UUID, 
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
      RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update Profile
  UPDATE public.profiles
  SET 
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Update Investor Record if exists (sync status)
  IF p_status IS NOT NULL THEN
      UPDATE public.investors
      SET 
        status = p_status,
        updated_at = NOW()
      WHERE profile_id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;
