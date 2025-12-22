-- Fix UUID::TEXT Type Mismatch in Core Yield Functions

-- 1. Fix preview_yield_correction - remove ::text casts
CREATE OR REPLACE FUNCTION public.preview_yield_correction(p_fund_id UUID, p_date DATE, p_purpose TEXT, p_new_aum NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_purpose_enum aum_purpose; v_fund RECORD; v_old_aum NUMERIC; v_previous_aum NUMERIC;
  v_old_gross_yield NUMERIC; v_new_gross_yield NUMERIC; v_delta_aum NUMERIC; v_delta_gross NUMERIC;
  v_total_positions NUMERIC; v_investors_affected INTEGER := 0; v_total_fee_delta NUMERIC := 0;
  v_total_ib_delta NUMERIC := 0; v_total_net_delta NUMERIC := 0;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_investor_rows JSONB := '[]'::jsonb; v_tx_diffs JSONB := '[]'::jsonb;
  v_report_impacts JSONB := '[]'::jsonb; v_is_month_closed BOOLEAN := false;
  v_original_distribution_id UUID; rec RECORD; v_share NUMERIC; v_old_gross NUMERIC; v_new_gross NUMERIC;
  v_old_fee_pct NUMERIC; v_new_fee_pct NUMERIC; v_old_fee NUMERIC; v_new_fee NUMERIC;
  v_old_net NUMERIC; v_new_net NUMERIC; v_delta_fee NUMERIC; v_delta_net NUMERIC;
  v_ib_parent_id UUID; v_ib_pct NUMERIC; v_old_ib NUMERIC; v_new_ib NUMERIC; v_delta_ib NUMERIC; v_period_id UUID;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  v_purpose_enum := p_purpose::aum_purpose;
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;
  
  -- FIX: removed ::text cast
  SELECT id, total_aum INTO v_original_distribution_id, v_old_aum FROM fund_daily_aum WHERE fund_id = p_fund_id AND aum_date = p_date AND purpose = v_purpose_enum LIMIT 1;
  IF v_old_aum IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No yield record found for this date'); END IF;
  
  -- FIX: removed ::text cast  
  SELECT total_aum INTO v_previous_aum FROM fund_daily_aum WHERE fund_id = p_fund_id AND aum_date < p_date AND purpose = v_purpose_enum ORDER BY aum_date DESC LIMIT 1;
  IF v_previous_aum IS NULL THEN v_previous_aum := v_old_aum; END IF;
  
  v_delta_aum := p_new_aum - v_old_aum;
  v_old_gross_yield := v_old_aum - v_previous_aum;
  v_new_gross_yield := p_new_aum - v_previous_aum;
  v_delta_gross := v_new_gross_yield - v_old_gross_yield;
  SELECT EXISTS (SELECT 1 FROM fund_reporting_month_closures WHERE fund_id = p_fund_id AND p_date BETWEEN month_start AND month_end) INTO v_is_month_closed;
  SELECT id INTO v_period_id FROM statement_periods WHERE period_end_date >= p_date ORDER BY period_end_date ASC LIMIT 1;
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_positions FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0;
  
  IF v_total_positions <= 0 THEN
    RETURN jsonb_build_object('success', true, 'summary', jsonb_build_object('fund_id', p_fund_id, 'fund_name', v_fund.name, 'fund_asset', v_fund.asset, 'effective_date', p_date, 'purpose', p_purpose, 'old_aum', v_old_aum, 'new_aum', p_new_aum, 'delta_aum', v_delta_aum, 'old_gross_yield', v_old_gross_yield, 'new_gross_yield', v_new_gross_yield, 'delta_gross_yield', v_delta_gross, 'investors_affected', 0, 'total_fee_delta', 0, 'total_ib_delta', 0, 'total_net_delta', 0, 'is_month_closed', v_is_month_closed), 'investor_rows', '[]'::jsonb, 'tx_diffs', '[]'::jsonb, 'report_impacts', '[]'::jsonb);
  END IF;
  
  FOR rec IN SELECT ip.investor_id, ip.current_value, p.first_name, p.last_name, p.email, p.ib_parent_id, p.ib_percentage FROM investor_positions ip JOIN profiles p ON p.id = ip.investor_id WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_investors_affected := v_investors_affected + 1;
    v_share := rec.current_value / v_total_positions;
    v_old_gross := v_old_gross_yield * v_share; v_new_gross := v_new_gross_yield * v_share;
    SELECT COALESCE(fee_pct, 20) INTO v_old_fee_pct FROM investor_fee_schedule WHERE investor_id = rec.investor_id AND (fund_id = p_fund_id OR fund_id IS NULL) AND effective_date <= p_date ORDER BY effective_date DESC LIMIT 1;
    IF v_old_fee_pct IS NULL THEN v_old_fee_pct := 20; END IF;
    v_new_fee_pct := v_old_fee_pct;
    IF rec.investor_id = v_indigo_fees_id THEN v_old_fee := 0; v_new_fee := 0;
    ELSE v_old_fee := GREATEST(0, v_old_gross * (v_old_fee_pct / 100.0)); v_new_fee := GREATEST(0, v_new_gross * (v_new_fee_pct / 100.0)); END IF;
    v_old_net := v_old_gross - v_old_fee; v_new_net := v_new_gross - v_new_fee;
    v_delta_fee := v_new_fee - v_old_fee; v_delta_net := v_new_net - v_old_net;
    v_total_fee_delta := v_total_fee_delta + v_delta_fee; v_total_net_delta := v_total_net_delta + v_delta_net;
    v_ib_parent_id := rec.ib_parent_id; v_ib_pct := COALESCE(rec.ib_percentage, 0);
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND rec.investor_id != v_indigo_fees_id THEN
      v_old_ib := v_old_fee * (v_ib_pct / 100.0); v_new_ib := v_new_fee * (v_ib_pct / 100.0); v_delta_ib := v_new_ib - v_old_ib; v_total_ib_delta := v_total_ib_delta + v_delta_ib;
    ELSE v_old_ib := 0; v_new_ib := 0; v_delta_ib := 0; END IF;
    v_investor_rows := v_investor_rows || jsonb_build_object('investor_id', rec.investor_id, 'investor_name', COALESCE(rec.first_name || ' ' || COALESCE(rec.last_name, ''), rec.email), 'email', rec.email, 'position_value', rec.current_value, 'share_pct', ROUND((v_share * 100)::numeric, 4), 'old_gross', ROUND(v_old_gross::numeric, 8), 'new_gross', ROUND(v_new_gross::numeric, 8), 'delta_gross', ROUND((v_new_gross - v_old_gross)::numeric, 8), 'fee_pct', v_old_fee_pct, 'old_fee', ROUND(v_old_fee::numeric, 8), 'new_fee', ROUND(v_new_fee::numeric, 8), 'delta_fee', ROUND(v_delta_fee::numeric, 8), 'old_net', ROUND(v_old_net::numeric, 8), 'new_net', ROUND(v_new_net::numeric, 8), 'delta_net', ROUND(v_delta_net::numeric, 8), 'ib_parent_id', v_ib_parent_id, 'ib_pct', v_ib_pct, 'old_ib', ROUND(v_old_ib::numeric, 8), 'new_ib', ROUND(v_new_ib::numeric, 8), 'delta_ib', ROUND(v_delta_ib::numeric, 8), 'ib_source', CASE WHEN v_ib_parent_id IS NOT NULL THEN 'from_platform_fees' ELSE NULL END);
    IF ABS(v_delta_net) > 0.00000001 THEN v_tx_diffs := v_tx_diffs || jsonb_build_object('tx_type', 'INTEREST', 'investor_id', rec.investor_id, 'investor_name', COALESCE(rec.first_name || ' ' || COALESCE(rec.last_name, ''), rec.email), 'old_amount', ROUND(v_old_net::numeric, 8), 'new_amount', ROUND(v_new_net::numeric, 8), 'delta_amount', ROUND(v_delta_net::numeric, 8), 'visibility_scope', 'investor_visible'); END IF;
    IF ABS(v_delta_fee) > 0.00000001 AND rec.investor_id != v_indigo_fees_id THEN v_tx_diffs := v_tx_diffs || jsonb_build_object('tx_type', 'FEE', 'investor_id', rec.investor_id, 'investor_name', COALESCE(rec.first_name || ' ' || COALESCE(rec.last_name, ''), rec.email), 'old_amount', ROUND(v_old_fee::numeric, 8), 'new_amount', ROUND(v_new_fee::numeric, 8), 'delta_amount', ROUND(v_delta_fee::numeric, 8), 'visibility_scope', 'investor_visible'); END IF;
    IF ABS(v_delta_ib) > 0.00000001 THEN v_tx_diffs := v_tx_diffs || jsonb_build_object('tx_type', 'IB_CREDIT', 'investor_id', v_ib_parent_id, 'source_investor_id', rec.investor_id, 'old_amount', ROUND(v_old_ib::numeric, 8), 'new_amount', ROUND(v_new_ib::numeric, 8), 'delta_amount', ROUND(v_delta_ib::numeric, 8), 'visibility_scope', 'admin_only'); END IF;
  END LOOP;
  IF ABS(v_total_fee_delta - v_total_ib_delta) > 0.00000001 THEN v_tx_diffs := v_tx_diffs || jsonb_build_object('tx_type', 'FEE_CREDIT', 'investor_id', v_indigo_fees_id, 'investor_name', 'INDIGO FEES', 'old_amount', 0, 'new_amount', 0, 'delta_amount', ROUND((v_total_fee_delta - v_total_ib_delta)::numeric, 8), 'visibility_scope', 'admin_only'); END IF;
  IF v_period_id IS NOT NULL THEN v_report_impacts := v_report_impacts || jsonb_build_object('period_id', v_period_id, 'investors_affected', v_investors_affected, 'needs_regeneration', true, 'tables_affected', ARRAY['investor_fund_performance', 'generated_statements']); END IF;
  RETURN jsonb_build_object('success', true, 'summary', jsonb_build_object('fund_id', p_fund_id, 'fund_name', v_fund.name, 'fund_asset', v_fund.asset, 'effective_date', p_date, 'purpose', p_purpose, 'old_aum', v_old_aum, 'new_aum', p_new_aum, 'delta_aum', v_delta_aum, 'old_gross_yield', v_old_gross_yield, 'new_gross_yield', v_new_gross_yield, 'delta_gross_yield', v_delta_gross, 'investors_affected', v_investors_affected, 'total_fee_delta', ROUND(v_total_fee_delta::numeric, 8), 'total_ib_delta', ROUND(v_total_ib_delta::numeric, 8), 'total_net_delta', ROUND(v_total_net_delta::numeric, 8), 'is_month_closed', v_is_month_closed, 'original_distribution_id', v_original_distribution_id), 'investor_rows', v_investor_rows, 'tx_diffs', v_tx_diffs, 'report_impacts', v_report_impacts);
END;
$$;

-- 2. Fix apply_yield_correction - remove ::text casts on lines 569, 789
CREATE OR REPLACE FUNCTION public.apply_yield_correction(p_fund_id UUID, p_date DATE, p_purpose TEXT, p_new_aum NUMERIC, p_reason TEXT, p_confirmation TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_purpose_enum aum_purpose; v_is_month_closed BOOLEAN := false; v_is_super_admin BOOLEAN;
  v_preview JSONB; v_summary JSONB; v_investor_rows JSONB; v_tx_diffs JSONB;
  v_original_dist_id UUID; v_correction_dist_id UUID := gen_random_uuid(); v_correction_id UUID := gen_random_uuid();
  v_old_aum NUMERIC; v_delta_aum NUMERIC; v_admin_id UUID := auth.uid(); v_fund RECORD;
  v_tx RECORD; v_inv RECORD; v_ref_prefix TEXT; v_tx_id UUID;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'; v_total_fee_credit_delta NUMERIC := 0;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  SELECT public.is_super_admin() INTO v_is_super_admin;
  v_purpose_enum := p_purpose::aum_purpose;
  SELECT EXISTS (SELECT 1 FROM fund_reporting_month_closures WHERE fund_id = p_fund_id AND p_date BETWEEN month_start AND month_end) INTO v_is_month_closed;
  IF v_is_month_closed THEN IF NOT v_is_super_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Super Admin required for closed month corrections'); END IF; IF p_confirmation != 'APPLY CLOSED MONTH CORRECTION' THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation for closed month correction'); END IF; ELSE IF p_confirmation != 'APPLY CORRECTION' THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation'); END IF; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN RETURN jsonb_build_object('success', false, 'error', 'Reason must be at least 10 characters'); END IF;
  v_preview := public.preview_yield_correction(p_fund_id, p_date, p_purpose, p_new_aum);
  IF NOT (v_preview->>'success')::boolean THEN RETURN v_preview; END IF;
  v_summary := v_preview->'summary'; v_investor_rows := v_preview->'investor_rows'; v_tx_diffs := v_preview->'tx_diffs';
  v_original_dist_id := (v_summary->>'original_distribution_id')::uuid; v_old_aum := (v_summary->>'old_aum')::numeric; v_delta_aum := (v_summary->>'delta_aum')::numeric;
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF EXISTS (SELECT 1 FROM yield_corrections yc JOIN yield_distributions yd ON yd.id = yc.correction_distribution_id WHERE yd.fund_id = p_fund_id AND yd.effective_date = p_date AND yd.purpose = v_purpose_enum AND yc.new_aum = p_new_aum AND yc.status = 'applied') THEN RETURN jsonb_build_object('success', false, 'error', 'This correction has already been applied'); END IF;
  
  -- FIX: removed ::text cast
  INSERT INTO yield_distributions (id, fund_id, effective_date, purpose, is_month_end, recorded_aum, gross_yield, distribution_type, status, created_by, reason, summary_json)
  SELECT COALESCE(v_original_dist_id, gen_random_uuid()), p_fund_id, p_date, v_purpose_enum, COALESCE((SELECT is_month_end FROM fund_daily_aum WHERE id = v_original_dist_id), false), v_old_aum, (v_summary->>'old_gross_yield')::numeric, 'original', 'applied', v_admin_id, 'Original distribution (backfilled for correction tracking)', NULL ON CONFLICT DO NOTHING;
  
  IF v_original_dist_id IS NULL THEN SELECT id INTO v_original_dist_id FROM yield_distributions WHERE fund_id = p_fund_id AND effective_date = p_date AND purpose = v_purpose_enum AND distribution_type = 'original'; END IF;
  INSERT INTO yield_distributions (id, fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum, gross_yield, distribution_type, parent_distribution_id, status, created_by, reason, summary_json) VALUES (v_correction_dist_id, p_fund_id, p_date, v_purpose_enum, COALESCE((v_summary->>'is_month_end')::boolean, false), p_new_aum, v_old_aum, (v_summary->>'new_gross_yield')::numeric, 'correction', v_original_dist_id, 'applied', v_admin_id, p_reason, v_preview);
  INSERT INTO yield_corrections (id, original_distribution_id, correction_distribution_id, status, old_aum, new_aum, delta_aum, old_gross_yield, new_gross_yield, delta_gross_yield, investors_affected, total_fee_delta, total_ib_delta, preview_json, applied_at, applied_by, reason, created_by) VALUES (v_correction_id, v_original_dist_id, v_correction_dist_id, 'applied', v_old_aum, p_new_aum, v_delta_aum, (v_summary->>'old_gross_yield')::numeric, (v_summary->>'new_gross_yield')::numeric, (v_summary->>'delta_gross_yield')::numeric, (v_summary->>'investors_affected')::integer, (v_summary->>'total_fee_delta')::numeric, (v_summary->>'total_ib_delta')::numeric, v_preview, now(), v_admin_id, p_reason, v_admin_id);
  v_ref_prefix := format('correction:%s:', v_correction_id);
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_investor_rows) LOOP
    IF ABS((v_inv.value->>'delta_net')::numeric) > 0.00000001 THEN INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose, distribution_id, correction_id, visibility_scope, is_system_generated, source) VALUES (gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id, 'INTEREST', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_net')::numeric, p_date, v_ref_prefix || (v_inv.value->>'investor_id') || ':INTEREST', format('Yield correction: %s', p_reason), v_admin_id, now(), v_purpose_enum, v_correction_dist_id, v_correction_id, 'investor_visible', true, 'yield_correction') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING; UPDATE investor_positions SET current_value = current_value + (v_inv.value->>'delta_net')::numeric, updated_at = now() WHERE investor_id = (v_inv.value->>'investor_id')::uuid AND fund_id = p_fund_id; END IF;
    IF ABS((v_inv.value->>'delta_fee')::numeric) > 0.00000001 AND (v_inv.value->>'investor_id')::uuid != v_indigo_fees_id THEN INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose, distribution_id, correction_id, visibility_scope, is_system_generated, source) VALUES (gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id, 'FEE', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_fee')::numeric, p_date, v_ref_prefix || (v_inv.value->>'investor_id') || ':FEE', format('Fee correction: %s', p_reason), v_admin_id, now(), v_purpose_enum, v_correction_dist_id, v_correction_id, 'investor_visible', true, 'yield_correction') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING; v_total_fee_credit_delta := v_total_fee_credit_delta + (v_inv.value->>'delta_fee')::numeric - COALESCE((v_inv.value->>'delta_ib')::numeric, 0); END IF;
    IF (v_inv.value->>'ib_parent_id') IS NOT NULL AND ABS(COALESCE((v_inv.value->>'delta_ib')::numeric, 0)) > 0.00000001 THEN INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose, distribution_id, correction_id, visibility_scope, is_system_generated, source) VALUES (gen_random_uuid(), (v_inv.value->>'ib_parent_id')::uuid, p_fund_id, 'IB_CREDIT', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_ib')::numeric, p_date, v_ref_prefix || (v_inv.value->>'investor_id') || ':IB_CREDIT', format('IB correction from %s: %s', v_inv.value->>'investor_name', p_reason), v_admin_id, now(), v_purpose_enum, v_correction_dist_id, v_correction_id, 'admin_only', true, 'yield_correction') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING; UPDATE investor_positions SET current_value = current_value + (v_inv.value->>'delta_ib')::numeric, updated_at = now() WHERE investor_id = (v_inv.value->>'ib_parent_id')::uuid AND fund_id = p_fund_id; END IF;
  END LOOP;
  IF ABS(v_total_fee_credit_delta) > 0.00000001 THEN INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose, distribution_id, correction_id, visibility_scope, is_system_generated, source) VALUES (gen_random_uuid(), v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_fund.asset, v_fund.fund_class, v_total_fee_credit_delta, p_date, v_ref_prefix || 'INDIGO_FEES:FEE_CREDIT', format('Platform fee correction: %s', p_reason), v_admin_id, now(), v_purpose_enum, v_correction_dist_id, v_correction_id, 'admin_only', true, 'yield_correction') ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING; UPDATE investor_positions SET current_value = current_value + v_total_fee_credit_delta, updated_at = now() WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id; END IF;
  
  -- FIX: removed ::text cast
  UPDATE fund_daily_aum SET total_aum = p_new_aum, source = format('corrected:%s', v_correction_id), updated_at = now(), updated_by = v_admin_id WHERE fund_id = p_fund_id AND aum_date = p_date AND purpose = v_purpose_enum;
  
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta) VALUES ('YIELD_CORRECTION_APPLIED', 'yield_corrections', v_correction_id::text, v_admin_id, jsonb_build_object('old_aum', v_old_aum), jsonb_build_object('new_aum', p_new_aum, 'delta', v_delta_aum), jsonb_build_object('fund_id', p_fund_id, 'effective_date', p_date, 'purpose', p_purpose, 'reason', p_reason, 'is_month_closed', v_is_month_closed, 'investors_affected', (v_summary->>'investors_affected')::integer));
  RETURN jsonb_build_object('success', true, 'correction_id', v_correction_id, 'distribution_id', v_correction_dist_id, 'original_distribution_id', v_original_dist_id, 'delta_aum', v_delta_aum, 'investors_affected', (v_summary->>'investors_affected')::integer, 'total_fee_delta', (v_summary->>'total_fee_delta')::numeric, 'total_ib_delta', (v_summary->>'total_ib_delta')::numeric, 'is_month_closed', v_is_month_closed, 'message', format('Correction applied successfully. %s investors updated.', (v_summary->>'investors_affected')::integer));
END;
$$;

-- 3. Fix apply_daily_yield_to_fund_v2 - remove ::text cast in fund_daily_aum INSERT
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID, TEXT);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID);

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(p_fund_id UUID, p_date DATE, p_gross_amount NUMERIC, p_admin_id UUID, p_purpose TEXT DEFAULT 'transaction')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_purpose_enum aum_purpose; v_fund RECORD; v_total_aum NUMERIC;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_fees NUMERIC := 0; v_total_ib_fees NUMERIC := 0; v_investors_updated INTEGER := 0;
  v_is_month_end BOOLEAN; v_distribution_id UUID := gen_random_uuid();
  rec RECORD; v_share NUMERIC; v_gross NUMERIC; v_fee_pct NUMERIC; v_fee NUMERIC; v_net NUMERIC;
  v_ref TEXT; v_fee_ref TEXT; v_ib_parent_id UUID; v_ib_pct NUMERIC; v_ib_amount NUMERIC; v_ib_source TEXT; v_asset TEXT;
BEGIN
  v_purpose_enum := p_purpose::aum_purpose;
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;
  v_asset := v_fund.asset;
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0;
  IF v_total_aum <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'No investor positions in fund'); END IF;
  
  FOR rec IN SELECT ip.investor_id, ip.current_value, ip.fund_class, p.ib_parent_id, p.ib_percentage FROM investor_positions ip JOIN profiles p ON p.id = ip.investor_id WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_share := rec.current_value / v_total_aum; v_gross := p_gross_amount * v_share;
    IF ABS(v_gross) < 0.00000001 THEN CONTINUE; END IF;
    v_ref := format('yield:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum);
    IF EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref) THEN CONTINUE; END IF;
    IF rec.investor_id = v_indigo_fees_id THEN v_fee_pct := 0; v_fee := 0; v_net := v_gross;
    ELSE SELECT COALESCE(fee_pct, 20) INTO v_fee_pct FROM investor_fee_schedule WHERE investor_id = rec.investor_id AND (fund_id = p_fund_id OR fund_id IS NULL) AND effective_date <= p_date ORDER BY effective_date DESC LIMIT 1; IF v_fee_pct IS NULL THEN v_fee_pct := 20; END IF; v_fee := GREATEST(0, v_gross * (v_fee_pct / 100.0)); v_net := v_gross - v_fee; v_total_fees := v_total_fees + v_fee; END IF;
    INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose) VALUES (gen_random_uuid(), rec.investor_id, p_fund_id, 'INTEREST', v_asset, rec.fund_class, v_gross, p_date, v_ref, format('Yield distribution (gross) - %s', v_purpose_enum), p_admin_id, now(), v_purpose_enum);
    IF v_fee > 0 THEN v_fee_ref := format('fee:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum); INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose) VALUES (gen_random_uuid(), rec.investor_id, p_fund_id, 'FEE', v_asset, rec.fund_class, v_fee, p_date, v_fee_ref, format('Platform fee (%s%%) - %s', v_fee_pct, v_purpose_enum), p_admin_id, now(), v_purpose_enum); INSERT INTO fee_allocations (distribution_id, fund_id, investor_id, fees_account_id, period_start, period_end, purpose, base_net_income, fee_percentage, fee_amount, created_by) VALUES (v_distribution_id, p_fund_id, rec.investor_id, v_indigo_fees_id, date_trunc('month', p_date)::date, p_date, v_purpose_enum, v_gross, v_fee_pct, v_fee, p_admin_id) ON CONFLICT (distribution_id, fund_id, investor_id, fees_account_id) DO NOTHING; END IF;
    v_ib_parent_id := rec.ib_parent_id; v_ib_pct := COALESCE(rec.ib_percentage, 0);
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_fee > 0 AND rec.investor_id != v_indigo_fees_id THEN v_ib_amount := v_fee * (v_ib_pct / 100.0); v_ib_source := 'from_platform_fees'; v_total_fees := v_total_fees - v_ib_amount; v_total_ib_fees := v_total_ib_fees + v_ib_amount; INSERT INTO ib_allocations (id, ib_investor_id, source_investor_id, fund_id, source_net_income, ib_percentage, ib_fee_amount, effective_date, created_by, created_at, purpose, source, distribution_id, period_start, period_end) VALUES (gen_random_uuid(), v_ib_parent_id, rec.investor_id, p_fund_id, v_net, v_ib_pct, v_ib_amount, p_date, p_admin_id, now(), v_purpose_enum, v_ib_source, v_distribution_id, date_trunc('month', p_date)::date, p_date) ON CONFLICT ON CONSTRAINT ib_allocations_idempotency DO NOTHING; INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose) VALUES (gen_random_uuid(), v_ib_parent_id, p_fund_id, 'IB_CREDIT', v_asset, rec.fund_class, v_ib_amount, p_date, format('ib:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum), format('IB commission from investor %s (%s%% of fee)', LEFT(rec.investor_id::text, 8), v_ib_pct), p_admin_id, now(), v_purpose_enum) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING; UPDATE investor_positions SET current_value = current_value + v_ib_amount, updated_at = now() WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id; IF NOT FOUND THEN INSERT INTO investor_positions (investor_id, fund_id, fund_class, current_value, cost_basis, shares) VALUES (v_ib_parent_id, p_fund_id, v_fund.fund_class, v_ib_amount, 0, 0); END IF; END IF;
    UPDATE investor_positions SET current_value = current_value + v_net, updated_at = now() WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;
    v_investors_updated := v_investors_updated + 1;
  END LOOP;
  IF v_total_fees > 0 THEN v_fee_ref := format('fee_credit:%s:%s:%s', p_fund_id, p_date, v_purpose_enum); IF NOT EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_fee_ref) THEN INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose) VALUES (gen_random_uuid(), v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_asset, v_fund.fund_class, v_total_fees, p_date, v_fee_ref, format('Platform fees collected (after IB: %s) - %s', ROUND(v_total_ib_fees::numeric, 8), v_purpose_enum), p_admin_id, now(), v_purpose_enum); UPDATE investor_positions SET current_value = current_value + v_total_fees, updated_at = now() WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id; IF NOT FOUND THEN INSERT INTO investor_positions (investor_id, fund_id, fund_class, current_value, cost_basis, shares) VALUES (v_indigo_fees_id, p_fund_id, v_fund.fund_class, v_total_fees, 0, 0); END IF; END IF; END IF;
  
  -- FIX: removed ::text cast from p_fund_id
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by)
  VALUES (p_fund_id, p_date, v_total_aum + p_gross_amount, v_purpose_enum, v_is_month_end, 'yield_distribution', p_admin_id)
  ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = EXCLUDED.total_aum, is_month_end = EXCLUDED.is_month_end, updated_at = now();
  
  RETURN jsonb_build_object('success', true, 'distribution_id', v_distribution_id, 'investors_updated', v_investors_updated, 'gross_amount', p_gross_amount, 'total_fees', v_total_fees, 'total_ib_fees', v_total_ib_fees, 'purpose', v_purpose_enum, 'is_month_end', v_is_month_end);
END;
$$;