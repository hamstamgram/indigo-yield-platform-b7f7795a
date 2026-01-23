-- Migration: Fix reconciliation and staging preview to use post_flow_aum
-- Created: 2026-01-21
--
-- These functions were using only closing_aum when they should use
-- COALESCE(post_flow_aum, closing_aum) to get the correct AUM after deposits/withdrawals.

-- ============================================================================
-- FIX 1: generate_reconciliation_pack - use post_flow_aum for opening/closing AUM
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_reconciliation_pack(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pack_id uuid;
  v_opening_aum numeric(28,10);
  v_closing_aum numeric(28,10);
  v_total_deposits numeric(28,10);
  v_total_withdrawals numeric(28,10);
  v_gross_yield numeric(28,10);
  v_total_fees numeric(28,10);
  v_net_yield numeric(28,10);
  v_total_dust numeric(28,10);
  v_tx_count int;
  v_dist_count int;
  v_void_count int;
  v_investor_count int;
  v_void_list jsonb;
  v_distribution_summary jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can generate reconciliation packs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get opening AUM (last AUM before period start)
  -- FIX: Use COALESCE(post_flow_aum, closing_aum) for correct post-flow AUM
  SELECT COALESCE(post_flow_aum, closing_aum) INTO v_opening_aum
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date < p_period_start
    AND is_voided = false
    AND purpose = 'transaction'
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;
  v_opening_aum := COALESCE(v_opening_aum, 0);

  -- Get closing AUM (last AUM on or before period end)
  -- FIX: Use COALESCE(post_flow_aum, closing_aum) for correct post-flow AUM
  SELECT COALESCE(post_flow_aum, closing_aum) INTO v_closing_aum
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date <= p_period_end
    AND is_voided = false
    AND purpose = 'transaction'
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;
  v_closing_aum := COALESCE(v_closing_aum, 0);

  -- Calculate deposits and withdrawals
  SELECT
    COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN ABS(amount) ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_deposits, v_total_withdrawals, v_tx_count
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = false;

  -- Calculate yields
  SELECT
    COALESCE(SUM(gross_yield), 0),
    COALESCE(SUM(total_fees), 0),
    COALESCE(SUM(net_yield), 0),
    COALESCE(SUM(dust_amount), 0),
    COUNT(*)
  INTO v_gross_yield, v_total_fees, v_net_yield, v_total_dust, v_dist_count
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date BETWEEN p_period_start AND p_period_end
    AND status != 'voided';

  -- Count voids
  SELECT COUNT(*) INTO v_void_count
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = true;

  -- Count active investors
  SELECT COUNT(DISTINCT investor_id) INTO v_investor_count
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = false;

  -- Get void list
  SELECT jsonb_agg(jsonb_build_object(
    'tx_id', id,
    'type', type,
    'amount', amount,
    'tx_date', tx_date,
    'voided_at', voided_at,
    'void_reason', void_reason
  )) INTO v_void_list
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_period_start AND p_period_end
    AND is_voided = true;

  -- Get distribution summary
  SELECT jsonb_agg(jsonb_build_object(
    'distribution_id', id,
    'effective_date', effective_date,
    'gross_yield', gross_yield,
    'total_fees', total_fees,
    'net_yield', net_yield,
    'dust_amount', dust_amount,
    'investor_count', investor_count
  )) INTO v_distribution_summary
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date BETWEEN p_period_start AND p_period_end
    AND status != 'voided';

  -- Insert pack
  INSERT INTO reconciliation_packs (
    fund_id, period_start, period_end, pack_type, status,
    opening_aum, closing_aum, total_deposits, total_withdrawals,
    net_flows, gross_yield, total_fees, net_yield, total_dust,
    transaction_count, distribution_count, void_count, investor_count,
    pack_data, generated_by
  ) VALUES (
    p_fund_id, p_period_start, p_period_end, 'monthly', 'draft',
    v_opening_aum, v_closing_aum, v_total_deposits, v_total_withdrawals,
    v_total_deposits - v_total_withdrawals, v_gross_yield, v_total_fees, v_net_yield, v_total_dust,
    v_tx_count, v_dist_count, v_void_count, v_investor_count,
    jsonb_build_object(
      'void_list', COALESCE(v_void_list, '[]'::jsonb),
      'distribution_summary', COALESCE(v_distribution_summary, '[]'::jsonb),
      'reconciliation', jsonb_build_object(
        'expected_closing', v_opening_aum + v_total_deposits - v_total_withdrawals + v_net_yield,
        'actual_closing', v_closing_aum,
        'difference', v_closing_aum - (v_opening_aum + v_total_deposits - v_total_withdrawals + v_net_yield),
        'reconciled', ABS(v_closing_aum - (v_opening_aum + v_total_deposits - v_total_withdrawals + v_net_yield)) < 0.01
      )
    ),
    p_admin_id
  )
  RETURNING id INTO v_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'pack_id', v_pack_id,
    'summary', jsonb_build_object(
      'opening_aum', v_opening_aum,
      'closing_aum', v_closing_aum,
      'net_flows', v_total_deposits - v_total_withdrawals,
      'net_yield', v_net_yield,
      'transaction_count', v_tx_count,
      'void_count', v_void_count
    )
  );
END;
$function$;


-- ============================================================================
-- FIX 2: generate_staging_preview_report - use post_flow_aum for current AUM
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_staging_preview_report(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_stats RECORD;
  v_flows_by_day jsonb;
  v_position_deltas jsonb;
  v_as_of_warnings jsonb;
  v_aum_impact jsonb;
  v_fund_id uuid;
  v_min_date date;
  v_max_date date;
  v_current_aum numeric(28,10);
BEGIN
  -- Get batch statistics
  SELECT
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE validation_status = 'valid') as valid_rows,
    COUNT(*) FILTER (WHERE validation_status = 'invalid') as invalid_rows,
    COUNT(*) FILTER (WHERE validation_status = 'pending') as pending_rows,
    COUNT(*) FILTER (WHERE validation_status = 'promoted') as promoted_rows,
    MIN(tx_date) as min_date,
    MAX(tx_date) as max_date,
    (SELECT DISTINCT fund_id FROM transaction_import_staging WHERE batch_id = p_batch_id LIMIT 1) as fund_id
  INTO v_batch_stats
  FROM transaction_import_staging
  WHERE batch_id = p_batch_id;

  IF v_batch_stats.total_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No rows found for batch_id: ' || p_batch_id::text
    );
  END IF;

  v_fund_id := v_batch_stats.fund_id;
  v_min_date := v_batch_stats.min_date;
  v_max_date := v_batch_stats.max_date;

  -- D.1.1: Net flows by day
  SELECT jsonb_agg(day_data ORDER BY tx_date)
  INTO v_flows_by_day
  FROM (
    SELECT
      tx_date,
      jsonb_build_object(
        'date', tx_date,
        'deposits', COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0),
        'withdrawals', COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'WITHDRAWAL'), 0),
        'net_flow', COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0),
        'transaction_count', COUNT(*)
      ) as day_data
    FROM transaction_import_staging
    WHERE batch_id = p_batch_id
      AND validation_status IN ('valid', 'pending')
    GROUP BY tx_date
    ORDER BY tx_date
  ) daily;

  -- D.1.2: Position deltas by investor
  SELECT jsonb_agg(investor_data)
  INTO v_position_deltas
  FROM (
    SELECT
      jsonb_build_object(
        'investor_id', s.investor_id,
        'investor_email', (SELECT email FROM auth.users WHERE id = s.investor_id),
        'current_position', COALESCE(ip.current_value, 0),
        'total_deposits', COALESCE(SUM(s.amount) FILTER (WHERE s.type = 'DEPOSIT'), 0),
        'total_withdrawals', COALESCE(SUM(ABS(s.amount)) FILTER (WHERE s.type = 'WITHDRAWAL'), 0),
        'net_change', COALESCE(SUM(CASE WHEN s.type = 'DEPOSIT' THEN s.amount ELSE -ABS(s.amount) END), 0),
        'projected_position', COALESCE(ip.current_value, 0) +
          COALESCE(SUM(CASE WHEN s.type = 'DEPOSIT' THEN s.amount ELSE -ABS(s.amount) END), 0),
        'transaction_count', COUNT(*)
      ) as investor_data
    FROM transaction_import_staging s
    LEFT JOIN investor_positions ip ON ip.investor_id = s.investor_id AND ip.fund_id = s.fund_id
    WHERE s.batch_id = p_batch_id
      AND s.validation_status IN ('valid', 'pending')
    GROUP BY s.investor_id, ip.current_value
    ORDER BY SUM(CASE WHEN s.type = 'DEPOSIT' THEN s.amount ELSE -ABS(s.amount) END) DESC
  ) investors;

  -- D.1.3: As-of filtering warnings (backdated transactions)
  SELECT jsonb_agg(warning_data)
  INTO v_as_of_warnings
  FROM (
    SELECT
      jsonb_build_object(
        'staging_id', id,
        'tx_date', tx_date,
        'created_at', created_at,
        'days_backdated', (created_at::date - tx_date),
        'warning_type', CASE
          WHEN is_period_locked(fund_id, tx_date) THEN 'LOCKED_PERIOD'
          WHEN (created_at::date - tx_date) > 30 THEN 'SEVERELY_BACKDATED'
          WHEN (created_at::date - tx_date) > 7 THEN 'BACKDATED'
          ELSE 'MINOR_BACKDATE'
        END,
        'investor_id', investor_id,
        'amount', amount,
        'type', type
      ) as warning_data
    FROM transaction_import_staging
    WHERE batch_id = p_batch_id
      AND validation_status IN ('valid', 'pending')
      AND tx_date < created_at::date
    ORDER BY (created_at::date - tx_date) DESC
  ) warnings;

  -- D.1.4: Expected AUM impact
  -- FIX: Use COALESCE(post_flow_aum, closing_aum) to get correct current AUM
  SELECT COALESCE(post_flow_aum, closing_aum) INTO v_current_aum
  FROM fund_aum_events
  WHERE fund_id = v_fund_id
    AND is_voided = false
    AND purpose = 'transaction'
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;
  v_current_aum := COALESCE(v_current_aum, 0);

  SELECT jsonb_build_object(
    'current_aum', v_current_aum,
    'total_deposits', COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0),
    'total_withdrawals', COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'WITHDRAWAL'), 0),
    'net_flow', COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0),
    'projected_aum', v_current_aum +
      COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0),
    'aum_change_pct', CASE
      WHEN v_current_aum = 0 THEN NULL
      ELSE ROUND((COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0) / v_current_aum * 100)::numeric, 2)
    END
  )
  INTO v_aum_impact
  FROM transaction_import_staging
  WHERE batch_id = p_batch_id
    AND validation_status IN ('valid', 'pending');

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'fund_id', v_fund_id,
    'generated_at', now(),
    'summary', jsonb_build_object(
      'total_rows', v_batch_stats.total_rows,
      'valid_rows', v_batch_stats.valid_rows,
      'invalid_rows', v_batch_stats.invalid_rows,
      'pending_rows', v_batch_stats.pending_rows,
      'promoted_rows', v_batch_stats.promoted_rows,
      'date_range', jsonb_build_object('min', v_min_date, 'max', v_max_date),
      'ready_for_promotion', v_batch_stats.invalid_rows = 0 AND v_batch_stats.pending_rows = 0 AND v_batch_stats.valid_rows > 0
    ),
    'flows_by_day', COALESCE(v_flows_by_day, '[]'::jsonb),
    'position_deltas', COALESCE(v_position_deltas, '[]'::jsonb),
    'as_of_warnings', COALESCE(v_as_of_warnings, '[]'::jsonb),
    'aum_impact', v_aum_impact,
    'risk_assessment', jsonb_build_object(
      'has_backdated_transactions', v_as_of_warnings IS NOT NULL AND jsonb_array_length(v_as_of_warnings) > 0,
      'has_locked_period_conflicts', EXISTS (
        SELECT 1 FROM transaction_import_staging s
        WHERE s.batch_id = p_batch_id
          AND s.validation_status IN ('valid', 'pending')
          AND is_period_locked(s.fund_id, s.tx_date)
      ),
      'large_aum_impact', COALESCE((v_aum_impact->>'aum_change_pct')::numeric > 20, false),
      'requires_approval', true
    )
  );
END;
$function$;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION generate_reconciliation_pack IS
'Generate a reconciliation pack for a fund period. FIX: Now uses COALESCE(post_flow_aum, closing_aum) for correct AUM after flows.';

COMMENT ON FUNCTION generate_staging_preview_report IS
'Generate a preview report for a staging batch. FIX: Now uses COALESCE(post_flow_aum, closing_aum) for correct current AUM.';
