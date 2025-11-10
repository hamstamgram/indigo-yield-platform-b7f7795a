-- ============================================
-- PHASE 1 CRITICAL SECURITY FIXES (FINAL)
-- ============================================

-- ========== 1. ENABLE RLS ON REPORT TABLES ==========

-- generated_reports
ALTER TABLE IF EXISTS public.generated_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users view own generated reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Users view reports they created" ON public.generated_reports;

CREATE POLICY "Admins manage generated reports"
ON public.generated_reports FOR ALL
TO authenticated
USING (public.is_admin_v2())
WITH CHECK (public.is_admin_v2());

CREATE POLICY "Users view own generated reports"
ON public.generated_reports FOR SELECT
TO authenticated
USING (generated_for_user_id = auth.uid());

CREATE POLICY "Users view reports they created"
ON public.generated_reports FOR SELECT
TO authenticated
USING (generated_by_user_id = auth.uid());

-- report_access_logs
ALTER TABLE IF EXISTS public.report_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view access logs" ON public.report_access_logs;
DROP POLICY IF EXISTS "System insert access logs" ON public.report_access_logs;

CREATE POLICY "Admins view access logs"
ON public.report_access_logs FOR SELECT
TO authenticated
USING (public.is_admin_v2());

CREATE POLICY "System insert access logs"
ON public.report_access_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- report_definitions
ALTER TABLE IF EXISTS public.report_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage definitions" ON public.report_definitions;
DROP POLICY IF EXISTS "Authenticated view definitions" ON public.report_definitions;

CREATE POLICY "Admins manage definitions"
ON public.report_definitions FOR ALL
TO authenticated
USING (public.is_admin_v2())
WITH CHECK (public.is_admin_v2());

CREATE POLICY "Authenticated view definitions"
ON public.report_definitions FOR SELECT
TO authenticated
USING (true);

-- report_schedules (uses created_by column, not user_id)
ALTER TABLE IF EXISTS public.report_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage schedules" ON public.report_schedules;
DROP POLICY IF EXISTS "Users manage own schedules" ON public.report_schedules;
DROP POLICY IF EXISTS "Users view schedules for them" ON public.report_schedules;

CREATE POLICY "Admins manage schedules"
ON public.report_schedules FOR ALL
TO authenticated
USING (public.is_admin_v2())
WITH CHECK (public.is_admin_v2());

CREATE POLICY "Users manage own schedules"
ON public.report_schedules FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users view schedules for them"
ON public.report_schedules FOR SELECT
TO authenticated
USING (auth.uid() = ANY(recipient_user_ids));

-- report_shares (uses shared_by_user_id column)
ALTER TABLE IF EXISTS public.report_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage shares" ON public.report_shares;
DROP POLICY IF EXISTS "Users manage own shares" ON public.report_shares;

CREATE POLICY "Admins manage shares"
ON public.report_shares FOR ALL
TO authenticated
USING (public.is_admin_v2())
WITH CHECK (public.is_admin_v2());

CREATE POLICY "Users manage own shares"
ON public.report_shares FOR ALL
TO authenticated
USING (shared_by_user_id = auth.uid())
WITH CHECK (shared_by_user_id = auth.uid());

-- ========== 2. FIX SQL INJECTION IN FUNCTIONS ==========

-- Fix recalculate_aum_percentages
CREATE OR REPLACE FUNCTION public.recalculate_aum_percentages(p_asset_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_total_aum NUMERIC(28,10);
  v_position RECORD;
BEGIN
  IF NOT public.is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  SELECT COALESCE(SUM(current_balance), 0) 
  INTO v_total_aum
  FROM public.positions 
  WHERE asset_code = p_asset_code::public.asset_symbol
  AND current_balance > 0;
  
  FOR v_position IN 
    SELECT user_id, current_balance
    FROM public.positions 
    WHERE asset_code = p_asset_code::public.asset_symbol
    AND current_balance > 0
  LOOP
    INSERT INTO public.yield_sources (
      asset_code, user_id, current_balance, percentage_of_aum
    ) VALUES (
      p_asset_code, v_position.user_id, v_position.current_balance,
      CASE WHEN v_total_aum > 0 THEN (v_position.current_balance / v_total_aum) * 100 ELSE 0 END
    )
    ON CONFLICT (asset_code, user_id) 
    DO UPDATE SET
      current_balance = EXCLUDED.current_balance,
      percentage_of_aum = EXCLUDED.percentage_of_aum,
      last_updated = now();
  END LOOP;
  
  DELETE FROM public.yield_sources 
  WHERE asset_code = p_asset_code AND current_balance <= 0;
  
  RETURN TRUE;
END;
$function$;

-- Fix apply_daily_yield
CREATE OR REPLACE FUNCTION public.apply_daily_yield(
  p_asset_code text, p_daily_yield_percentage numeric, p_application_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_total_aum NUMERIC(28,10) := 0;
  v_total_yield NUMERIC(28,10) := 0;
  v_investors_affected INTEGER := 0;
  v_application_id UUID;
  v_source RECORD;
  v_yield_amount NUMERIC(28,10);
  v_new_balance NUMERIC(28,10);
BEGIN
  IF NOT public.is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  PERFORM public.recalculate_aum_percentages(p_asset_code);
  
  SELECT COALESCE(SUM(current_balance), 0) 
  INTO v_total_aum FROM public.yield_sources WHERE asset_code = p_asset_code;
  
  v_total_yield := v_total_aum * (p_daily_yield_percentage / 100);
  
  INSERT INTO public.daily_yield_applications (
    application_date, asset_code, total_aum, daily_yield_percentage, total_yield_generated, applied_by
  ) VALUES (
    p_application_date, p_asset_code, v_total_aum, p_daily_yield_percentage, v_total_yield, auth.uid()
  ) RETURNING id INTO v_application_id;
  
  FOR v_source IN 
    SELECT * FROM public.yield_sources WHERE asset_code = p_asset_code AND current_balance > 0
  LOOP
    v_yield_amount := v_source.current_balance * (p_daily_yield_percentage / 100);
    v_new_balance := v_source.current_balance + v_yield_amount;
    
    UPDATE public.positions 
    SET current_balance = v_new_balance, total_earned = total_earned + v_yield_amount, updated_at = now()
    WHERE user_id = v_source.user_id AND asset_code = p_asset_code::public.asset_symbol;
    
    UPDATE public.yield_sources
    SET current_balance = v_new_balance, last_updated = now()
    WHERE id = v_source.id;
    
    INSERT INTO public.yield_distribution_log (
      application_date, user_id, asset_code, balance_before, yield_amount, 
      balance_after, percentage_owned, daily_yield_application_id
    ) VALUES (
      p_application_date, v_source.user_id, p_asset_code, v_source.current_balance, 
      v_yield_amount, v_new_balance, v_source.percentage_of_aum, v_application_id
    );
    
    v_investors_affected := v_investors_affected + 1;
  END LOOP;
  
  UPDATE public.daily_yield_applications
  SET investors_affected = v_investors_affected WHERE id = v_application_id;
  
  RETURN jsonb_build_object(
    'success', true, 'application_id', v_application_id, 'total_aum', v_total_aum,
    'total_yield_generated', v_total_yield, 'investors_affected', v_investors_affected
  );
END;
$function$;

-- Fix apply_daily_yield_to_fund  
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(
  p_fund_id uuid, p_daily_yield_percentage numeric, p_application_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_fund_aum NUMERIC(28,10);
  v_total_yield NUMERIC(28,10);
  v_investors_affected INTEGER := 0;
  v_application_id UUID;
  v_position RECORD;
  v_yield_amount NUMERIC(28,10);
  v_new_value NUMERIC(28,10);
  v_fund_code TEXT;
BEGIN
  IF NOT public.is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  SELECT f.code, fda.total_aum INTO v_fund_code, v_fund_aum
  FROM public.funds f
  LEFT JOIN public.fund_daily_aum fda ON fda.fund_id = f.id AND fda.aum_date <= p_application_date
  WHERE f.id = p_fund_id ORDER BY fda.aum_date DESC LIMIT 1;
  
  IF v_fund_aum IS NULL THEN
    RAISE EXCEPTION 'No AUM data found for fund';
  END IF;
  
  v_total_yield := v_fund_aum * (p_daily_yield_percentage / 100);
  PERFORM public.update_investor_aum_percentages(p_fund_id, v_fund_aum);
  
  INSERT INTO public.daily_yield_applications (
    application_date, asset_code, total_aum, daily_yield_percentage, total_yield_generated, applied_by
  ) VALUES (
    p_application_date, v_fund_code, v_fund_aum, p_daily_yield_percentage, v_total_yield, auth.uid()
  ) RETURNING id INTO v_application_id;
  
  FOR v_position IN 
    SELECT * FROM public.investor_positions 
    WHERE fund_id = p_fund_id AND current_value > 0 AND aum_percentage > 0
  LOOP
    v_yield_amount := v_position.current_value * (p_daily_yield_percentage / 100);
    v_new_value := v_position.current_value + v_yield_amount;
    
    UPDATE public.investor_positions 
    SET current_value = v_new_value, unrealized_pnl = unrealized_pnl + v_yield_amount,
        updated_at = now(), last_modified_by = auth.uid()
    WHERE investor_id = v_position.investor_id AND fund_id = p_fund_id;
    
    INSERT INTO public.yield_distribution_log (
      application_date, user_id, asset_code, balance_before, yield_amount,
      balance_after, percentage_owned, daily_yield_application_id
    ) VALUES (
      p_application_date, v_position.investor_id, v_fund_code, v_position.current_value,
      v_yield_amount, v_new_value, v_position.aum_percentage, v_application_id
    );
    
    v_investors_affected := v_investors_affected + 1;
  END LOOP;
  
  UPDATE public.daily_yield_applications
  SET investors_affected = v_investors_affected WHERE id = v_application_id;
  
  RETURN jsonb_build_object(
    'success', true, 'application_id', v_application_id, 'fund_aum_native', v_fund_aum,
    'total_yield_generated_native', v_total_yield, 'investors_affected', v_investors_affected,
    'asset_code', v_fund_code
  );
END;
$function$;

-- Fix apply_daily_yield_with_fees
CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_fees(
  p_fund_id uuid, p_daily_yield_percentage numeric, p_application_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_fund_aum NUMERIC(28,10);
  v_total_yield NUMERIC(28,10);
  v_total_fees NUMERIC(28,10) := 0;
  v_investors_affected INTEGER := 0;
  v_application_id UUID;
  v_position RECORD;
  v_gross_yield NUMERIC(28,10);
  v_fee_amount NUMERIC(28,10);
  v_net_yield NUMERIC(28,10);
  v_fund_code TEXT;
  v_investor_fee_rate NUMERIC(5,4);
BEGIN
  IF NOT public.is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  SELECT f.code, fda.total_aum INTO v_fund_code, v_fund_aum
  FROM public.funds f
  LEFT JOIN public.fund_daily_aum fda ON fda.fund_id = f.id AND fda.aum_date <= p_application_date
  WHERE f.id = p_fund_id ORDER BY fda.aum_date DESC LIMIT 1;
  
  IF v_fund_aum IS NULL THEN
    RAISE EXCEPTION 'No AUM data found for fund';
  END IF;
  
  v_total_yield := v_fund_aum * (p_daily_yield_percentage / 100);
  PERFORM public.update_investor_aum_percentages(p_fund_id, v_fund_aum);
  
  INSERT INTO public.daily_yield_applications (
    application_date, asset_code, total_aum, daily_yield_percentage, total_yield_generated, applied_by
  ) VALUES (
    p_application_date, v_fund_code, v_fund_aum, p_daily_yield_percentage, v_total_yield, auth.uid()
  ) RETURNING id INTO v_application_id;
  
  FOR v_position IN 
    SELECT ip.*, COALESCE(p.fee_percentage, 0.02) as investor_fee_rate
    FROM public.investor_positions ip
    JOIN public.investors i ON i.id = ip.investor_id
    LEFT JOIN public.profiles p ON p.id = i.profile_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 AND ip.aum_percentage > 0
  LOOP
    v_gross_yield := v_position.current_value * (p_daily_yield_percentage / 100);
    v_fee_amount := v_gross_yield * v_position.investor_fee_rate;
    v_net_yield := v_gross_yield - v_fee_amount;
    v_total_fees := v_total_fees + v_fee_amount;
    
    UPDATE public.investor_positions 
    SET current_value = current_value + v_net_yield, unrealized_pnl = unrealized_pnl + v_net_yield,
        updated_at = now(), last_modified_by = auth.uid()
    WHERE investor_id = v_position.investor_id AND fund_id = p_fund_id;
    
    INSERT INTO public.platform_fees_collected (
      investor_id, asset_code, fee_month, gross_yield, fee_rate_percentage, fee_amount, net_yield, created_by
    ) VALUES (
      v_position.investor_id, v_fund_code, DATE_TRUNC('month', p_application_date),
      v_gross_yield, v_position.investor_fee_rate, v_fee_amount, v_net_yield, auth.uid()
    ) ON CONFLICT (investor_id, asset_code, fee_month) 
    DO UPDATE SET
      gross_yield = public.platform_fees_collected.gross_yield + EXCLUDED.gross_yield,
      fee_amount = public.platform_fees_collected.fee_amount + EXCLUDED.fee_amount,
      net_yield = public.platform_fees_collected.net_yield + EXCLUDED.net_yield;
    
    INSERT INTO public.yield_distribution_log (
      application_date, user_id, asset_code, balance_before, yield_amount,
      balance_after, percentage_owned, daily_yield_application_id
    ) VALUES (
      p_application_date, v_position.investor_id, v_fund_code, v_position.current_value,
      v_net_yield, v_position.current_value + v_net_yield, v_position.aum_percentage, v_application_id
    );
    
    v_investors_affected := v_investors_affected + 1;
  END LOOP;
  
  INSERT INTO public.monthly_fee_summary (
    summary_month, asset_code, total_gross_yield, total_fees_collected, total_net_yield, investor_count
  ) VALUES (
    DATE_TRUNC('month', p_application_date), v_fund_code,
    v_total_yield, v_total_fees, v_total_yield - v_total_fees, v_investors_affected
  ) ON CONFLICT (summary_month, asset_code)
  DO UPDATE SET
    total_gross_yield = public.monthly_fee_summary.total_gross_yield + EXCLUDED.total_gross_yield,
    total_fees_collected = public.monthly_fee_summary.total_fees_collected + EXCLUDED.total_fees_collected,
    total_net_yield = public.monthly_fee_summary.total_net_yield + EXCLUDED.total_net_yield;
  
  UPDATE public.daily_yield_applications
  SET investors_affected = v_investors_affected WHERE id = v_application_id;
  
  RETURN jsonb_build_object(
    'success', true, 'application_id', v_application_id, 'fund_aum_native', v_fund_aum,
    'total_gross_yield', v_total_yield, 'total_platform_fees', v_total_fees,
    'total_net_yield', v_total_yield - v_total_fees, 'investors_affected', v_investors_affected,
    'asset_code', v_fund_code
  );
END;
$function$;