-- Fix recalculate_fund_aum_for_date to include ALL positions (conserved NAV)
-- Previously excluded fees_account which broke the accounting invariant:
-- old=1500, new=1425 (subtracting 75 USDT fees_account position)
--
-- Root cause: Line 28 had "AND p.account_type IS DISTINCT FROM 'fees_account'"
-- which excluded fees_account positions from AUM calculation.
--
-- Fix: Remove the exclusion filter so AUM = sum of ALL positions.

CREATE OR REPLACE FUNCTION public.recalculate_fund_aum_for_date(
  p_fund_id uuid, 
  p_date date, 
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose, 
  p_actor_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calculated_aum numeric(28,10);
  v_existing_record RECORD;
  v_actor uuid;
  v_changes jsonb := '[]'::jsonb;
  v_new_record_id uuid;
  v_action text := 'none';
BEGIN
  -- ===== ADVISORY LOCK (FIX #10) =====
  PERFORM pg_advisory_xact_lock(
    hashtext('aum:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  v_actor := COALESCE(p_actor_id, auth.uid());

  -- Calculate AUM from ALL positions (conserved NAV)
  -- Fee recipients and IB accounts ARE part of fund NAV - do not exclude them
  SELECT COALESCE(SUM(ip.current_value), 0)::numeric(28,10)
  INTO v_calculated_aum
  FROM public.investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0;

  SELECT * INTO v_existing_record
  FROM public.fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- Enable canonical RPC bypass for fund_daily_aum mutations
  PERFORM set_canonical_rpc(true);

  IF FOUND THEN
    IF ABS(v_existing_record.total_aum - v_calculated_aum) > 0.00001 THEN
      UPDATE public.fund_daily_aum
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = v_actor,
          void_reason = 'Auto-corrected by recalculate_fund_aum_for_date: old=' ||
                        v_existing_record.total_aum || ', new=' || v_calculated_aum
      WHERE id = v_existing_record.id;

      INSERT INTO public.fund_daily_aum (
        fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
      )
      VALUES (
        p_fund_id, p_date, v_calculated_aum, p_purpose, 'transaction_op', v_actor,
        (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
      )
      RETURNING id INTO v_new_record_id;

      v_action := 'corrected';
      v_changes := v_changes || jsonb_build_object(
        'action', 'corrected',
        'old_record_id', v_existing_record.id,
        'new_record_id', v_new_record_id,
        'old_aum', v_existing_record.total_aum,
        'new_aum', v_calculated_aum,
        'difference', v_calculated_aum - v_existing_record.total_aum
      );

      INSERT INTO public.audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
      VALUES (
        'fund_daily_aum', v_new_record_id::text, 'AUM_RECALCULATED', v_actor,
        jsonb_build_object('total_aum', v_existing_record.total_aum, 'old_record_id', v_existing_record.id),
        jsonb_build_object('total_aum', v_calculated_aum, 'new_record_id', v_new_record_id),
        jsonb_build_object('fund_id', p_fund_id, 'date', p_date, 'purpose', p_purpose)
      );
    ELSE
      v_action := 'unchanged';
    END IF;
  ELSE
    INSERT INTO public.fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end
    )
    VALUES (
      p_fund_id, p_date, v_calculated_aum, p_purpose, 'transaction_op', v_actor,
      (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
    )
    RETURNING id INTO v_new_record_id;

    v_action := 'created';
    v_changes := v_changes || jsonb_build_object(
      'action', 'created',
      'record_id', v_new_record_id,
      'aum', v_calculated_aum
    );
  END IF;

  -- Disable canonical RPC bypass
  PERFORM set_canonical_rpc(false);

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'date', p_date,
    'purpose', p_purpose,
    'calculated_aum', v_calculated_aum,
    'action', v_action,
    'changes', v_changes
  );
END;
$function$;

COMMENT ON FUNCTION public.recalculate_fund_aum_for_date IS 
'Recalculates fund AUM for a specific date using conserved NAV (includes ALL positions: investors, fees_account, ib). Fixed 2026-02-06 to include fees_account positions.';
