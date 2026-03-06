-- ============================================================================
-- P0: Admin UX Safety Features for Crystallization
-- Date: 2026-01-16
-- Purpose: Provide admin-facing helpers for crystallization state awareness
-- ============================================================================

-- ============================================================================
-- 1. Function to check if position is crystallization-ready
-- ============================================================================
CREATE OR REPLACE FUNCTION is_crystallization_current(
  p_investor_id uuid,
  p_fund_id uuid,
  p_target_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_position RECORD;
  v_last_crystal_date date;
  v_last_tx_date date;
  v_is_current boolean;
BEGIN
  -- Get position info
  SELECT
    ip.last_yield_crystallization_date,
    ip.current_value,
    ip.cumulative_yield_earned
  INTO v_position
  FROM investor_positions ip
  WHERE ip.investor_id = p_investor_id
    AND ip.fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object(
      'is_current', true,
      'reason', 'no_position',
      'message', 'No position exists - will be created on first transaction'
    );
  END IF;

  v_last_crystal_date := v_position.last_yield_crystallization_date;

  -- Get last transaction date
  SELECT MAX(tx_date) INTO v_last_tx_date
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND is_voided = false;

  -- Check if crystallization is current
  v_is_current := (
    v_last_crystal_date IS NOT NULL
    AND (v_last_tx_date IS NULL OR v_last_crystal_date >= v_last_tx_date)
    AND v_last_crystal_date >= p_target_date - interval '1 day'
  );

  RETURN jsonb_build_object(
    'is_current', v_is_current,
    'last_crystallization_date', v_last_crystal_date,
    'last_transaction_date', v_last_tx_date,
    'target_date', p_target_date,
    'current_value', v_position.current_value,
    'cumulative_yield', v_position.cumulative_yield_earned,
    'days_behind', CASE
      WHEN v_last_crystal_date IS NULL THEN NULL
      ELSE (p_target_date - v_last_crystal_date)::int
    END,
    'message', CASE
      WHEN v_last_crystal_date IS NULL THEN 'Position has never been crystallized'
      WHEN NOT v_is_current THEN 'Crystallization is stale - yield must be crystallized before transaction'
      ELSE 'Crystallization is current'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_crystallization_current TO authenticated;

COMMENT ON FUNCTION is_crystallization_current IS
  'Check if a position crystallization is current for the target date. Used by admin UI.';

-- ============================================================================
-- 2. View showing all positions with their crystallization status
-- ============================================================================
CREATE OR REPLACE VIEW v_position_crystallization_status AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  p.email AS investor_email,
  p.first_name || ' ' || p.last_name AS investor_name,
  ip.current_value,
  ip.last_yield_crystallization_date,
  ip.cumulative_yield_earned,
  ip.is_active,
  (
    SELECT MAX(t.tx_date)
    FROM transactions_v2 t
    WHERE t.investor_id = ip.investor_id
      AND t.fund_id = ip.fund_id
      AND t.is_voided = false
  ) AS last_transaction_date,
  CASE
    WHEN ip.last_yield_crystallization_date IS NULL THEN 'WARN: Never crystallized'
    WHEN ip.last_yield_crystallization_date >= CURRENT_DATE - interval '1 day' THEN 'OK'
    WHEN ip.last_yield_crystallization_date >= CURRENT_DATE - interval '7 days' THEN 'STALE: >1 day behind'
    ELSE 'CRITICAL: >7 days behind'
  END AS crystallization_status,
  COALESCE(
    CURRENT_DATE - ip.last_yield_crystallization_date,
    999
  )::int AS days_since_crystallization
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
WHERE ip.is_active = true
ORDER BY
  CASE
    WHEN ip.last_yield_crystallization_date IS NULL THEN 0
    WHEN ip.last_yield_crystallization_date >= CURRENT_DATE - interval '1 day' THEN 3
    WHEN ip.last_yield_crystallization_date >= CURRENT_DATE - interval '7 days' THEN 2
    ELSE 1
  END,
  ip.last_yield_crystallization_date NULLS FIRST;

COMMENT ON VIEW v_position_crystallization_status IS
  'Shows all active positions with their crystallization status. Critical positions appear first.';

GRANT SELECT ON v_position_crystallization_status TO authenticated;

-- ============================================================================
-- 3. Admin helper to preview what crystallization would do
-- ============================================================================
CREATE OR REPLACE FUNCTION preview_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_target_date date DEFAULT CURRENT_DATE,
  p_new_total_aum numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_aum numeric;
  v_yield_rate numeric;
  v_days_to_crystallize int;
  v_estimated_yield numeric;
BEGIN
  -- Get position
  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object(
      'can_preview', false,
      'reason', 'Position not found'
    );
  END IF;

  -- Get fund
  SELECT * INTO v_fund
  FROM funds WHERE id = p_fund_id;

  -- Get AUM
  IF p_new_total_aum IS NOT NULL THEN
    v_aum := p_new_total_aum;
  ELSE
    SELECT total_aum INTO v_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date <= p_target_date
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_aum IS NULL OR v_aum = 0 THEN
    RETURN jsonb_build_object(
      'can_preview', false,
      'reason', 'No AUM data available for fund'
    );
  END IF;

  -- Calculate days to crystallize
  v_days_to_crystallize := GREATEST(0,
    p_target_date - COALESCE(v_position.last_yield_crystallization_date, v_position.last_transaction_date, p_target_date - 30)
  );

  -- Get yield rate (simplified - actual calculation may be more complex)
  v_yield_rate := COALESCE(v_fund.yield_rate, 0.10); -- Default 10% if not set

  -- Estimate yield (simplified: daily_rate * days * balance)
  v_estimated_yield := (v_yield_rate / 365.0) * v_days_to_crystallize * v_position.current_value;

  RETURN jsonb_build_object(
    'can_preview', true,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'current_value', v_position.current_value,
    'last_crystallization_date', v_position.last_yield_crystallization_date,
    'target_date', p_target_date,
    'days_to_crystallize', v_days_to_crystallize,
    'current_aum', v_aum,
    'position_share_of_aum', CASE
      WHEN v_aum > 0 THEN ROUND((v_position.current_value / v_aum * 100)::numeric, 4)
      ELSE 0
    END,
    'estimated_yield', ROUND(v_estimated_yield::numeric, 2),
    'yield_rate', v_yield_rate,
    'note', 'This is an estimate. Actual crystallization may differ based on daily AUM snapshots.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION preview_crystallization TO authenticated;

COMMENT ON FUNCTION preview_crystallization IS
  'Preview what crystallization would do for a position. Returns estimated yield.';

-- ============================================================================
-- 4. Admin dashboard summary view
-- ============================================================================
CREATE OR REPLACE VIEW v_crystallization_dashboard AS
SELECT
  f.id AS fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  COUNT(ip.investor_id) AS total_positions,
  COUNT(ip.investor_id) FILTER (WHERE ip.last_yield_crystallization_date IS NULL) AS never_crystallized,
  COUNT(ip.investor_id) FILTER (
    WHERE ip.last_yield_crystallization_date IS NOT NULL
    AND ip.last_yield_crystallization_date < CURRENT_DATE - interval '7 days'
  ) AS critical_stale,
  COUNT(ip.investor_id) FILTER (
    WHERE ip.last_yield_crystallization_date IS NOT NULL
    AND ip.last_yield_crystallization_date < CURRENT_DATE - interval '1 day'
    AND ip.last_yield_crystallization_date >= CURRENT_DATE - interval '7 days'
  ) AS stale,
  COUNT(ip.investor_id) FILTER (
    WHERE ip.last_yield_crystallization_date IS NOT NULL
    AND ip.last_yield_crystallization_date >= CURRENT_DATE - interval '1 day'
  ) AS current_,
  SUM(ip.current_value) AS total_aum_in_positions,
  SUM(ip.current_value) FILTER (
    WHERE ip.last_yield_crystallization_date IS NULL
    OR ip.last_yield_crystallization_date < CURRENT_DATE - interval '1 day'
  ) AS aum_needing_crystallization
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id AND ip.is_active = true
GROUP BY f.id, f.code, f.name
ORDER BY
  COUNT(ip.investor_id) FILTER (WHERE ip.last_yield_crystallization_date IS NULL) DESC,
  COUNT(ip.investor_id) FILTER (
    WHERE ip.last_yield_crystallization_date IS NOT NULL
    AND ip.last_yield_crystallization_date < CURRENT_DATE - interval '7 days'
  ) DESC;

COMMENT ON VIEW v_crystallization_dashboard IS
  'Summary dashboard for admins showing crystallization health per fund.';

GRANT SELECT ON v_crystallization_dashboard TO authenticated;

-- ============================================================================
-- 5. Function to batch crystallize all stale positions for a fund
-- ============================================================================
CREATE OR REPLACE FUNCTION batch_crystallize_fund(
  p_fund_id uuid,
  p_target_date date DEFAULT CURRENT_DATE,
  p_new_total_aum numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_position RECORD;
  v_results jsonb := '[]'::jsonb;
  v_processed int := 0;
  v_failed int := 0;
  v_aum numeric;
BEGIN
  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Get AUM
  IF p_new_total_aum IS NOT NULL THEN
    v_aum := p_new_total_aum;
  ELSE
    SELECT total_aum INTO v_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date <= p_target_date
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_aum IS NULL OR v_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No AUM data available for fund on target date'
    );
  END IF;

  -- Process each stale position
  FOR v_position IN
    SELECT ip.investor_id, ip.fund_id, ip.current_value, ip.last_yield_crystallization_date
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND (
        ip.last_yield_crystallization_date IS NULL
        OR ip.last_yield_crystallization_date < p_target_date
      )
    ORDER BY ip.current_value DESC
  LOOP
    BEGIN
      IF p_dry_run THEN
        -- Preview only
        v_results := v_results || jsonb_build_object(
          'investor_id', v_position.investor_id,
          'action', 'would_crystallize',
          'current_value', v_position.current_value,
          'last_crystal_date', v_position.last_yield_crystallization_date
        );
      ELSE
        -- Actually crystallize (using crystallize_yield_before_flow)
        PERFORM crystallize_yield_before_flow(
          p_fund_id := p_fund_id,
          p_closing_aum := v_aum,
          p_trigger_type := 'batch',
          p_trigger_reference := 'batch_crystallize_' || p_target_date::text,
          p_event_ts := (p_target_date::timestamp + interval '12 hours'),
          p_admin_id := v_admin,
          p_purpose := 'month_end'::aum_purpose
        );

        v_results := v_results || jsonb_build_object(
          'investor_id', v_position.investor_id,
          'action', 'crystallized',
          'current_value', v_position.current_value
        );
      END IF;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_results := v_results || jsonb_build_object(
        'investor_id', v_position.investor_id,
        'action', 'failed',
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'fund_id', p_fund_id,
    'target_date', p_target_date,
    'aum_used', v_aum,
    'processed', v_processed,
    'failed', v_failed,
    'details', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION batch_crystallize_fund TO authenticated;

COMMENT ON FUNCTION batch_crystallize_fund IS
  'Batch crystallize all stale positions for a fund. Use dry_run=true to preview.';

