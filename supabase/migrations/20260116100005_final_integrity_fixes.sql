-- ============================================================================
-- FINAL INTEGRITY FIXES
-- Date: 2026-01-16
-- Purpose: Fix crystallization gaps, AUM mismatches, and add merge preview
-- ============================================================================

-- ============================================================================
-- 1. Initialize AUM snapshots for funds with positions but no AUM records
-- ============================================================================

-- Create function to initialize AUM for a fund from positions
CREATE OR REPLACE FUNCTION initialize_fund_aum_from_positions(
  p_fund_id uuid,
  p_admin_id uuid DEFAULT NULL,
  p_aum_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_positions_sum numeric;
  v_existing_aum uuid;
  v_new_aum_id uuid;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Calculate positions sum
  SELECT COALESCE(SUM(current_value), 0) INTO v_positions_sum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND is_active = true;

  -- Check if AUM already exists for this date
  SELECT id INTO v_existing_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = 'transaction'
    AND is_voided = false
  LIMIT 1;

  IF v_existing_aum IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'AUM already exists for this fund and date',
      'existing_aum_id', v_existing_aum
    );
  END IF;

  -- Insert new AUM record
  INSERT INTO fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    source,
    purpose,
    created_by,
    created_at
  ) VALUES (
    p_fund_id,
    p_aum_date,
    v_positions_sum,
    'position_sync',
    'transaction'::aum_purpose,
    v_admin,
    NOW()
  )
  RETURNING id INTO v_new_aum_id;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'aum_date', p_aum_date,
    'total_aum', v_positions_sum,
    'aum_id', v_new_aum_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_fund_aum_from_positions TO authenticated;

-- ============================================================================
-- 2. Replace AUM snapshot (void old, create new)
-- ============================================================================

CREATE OR REPLACE FUNCTION replace_aum_snapshot(
  p_fund_id uuid,
  p_aum_date date,
  p_new_total_aum numeric,
  p_purpose aum_purpose DEFAULT 'transaction',
  p_admin_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_old_aum RECORD;
  v_new_aum_id uuid;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for AUM replacement';
  END IF;

  -- Find and void existing AUM record
  SELECT * INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_old_aum IS NOT NULL THEN
    UPDATE fund_daily_aum
    SET
      is_voided = true,
      voided_at = NOW(),
      voided_by = v_admin,
      void_reason = p_reason
    WHERE id = v_old_aum.id;
  END IF;

  -- Insert corrected AUM record
  INSERT INTO fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    source,
    purpose,
    created_by,
    created_at
  ) VALUES (
    p_fund_id,
    p_aum_date,
    p_new_total_aum,
    'admin_correction',
    p_purpose,
    v_admin,
    NOW()
  )
  RETURNING id INTO v_new_aum_id;

  -- Log to audit
  INSERT INTO audit_log (action, table_name, record_id, old_data, new_data, performed_by, performed_at)
  VALUES (
    'AUM_REPLACEMENT',
    'fund_daily_aum',
    v_new_aum_id,
    CASE WHEN v_old_aum IS NOT NULL THEN jsonb_build_object(
      'old_aum_id', v_old_aum.id,
      'old_total_aum', v_old_aum.total_aum
    ) ELSE NULL END,
    jsonb_build_object(
      'new_aum_id', v_new_aum_id,
      'new_total_aum', p_new_total_aum,
      'reason', p_reason
    ),
    v_admin,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'aum_date', p_aum_date,
    'old_aum', CASE WHEN v_old_aum IS NOT NULL THEN v_old_aum.total_aum ELSE NULL END,
    'new_aum', p_new_total_aum,
    'new_aum_id', v_new_aum_id,
    'voided_old', v_old_aum IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION replace_aum_snapshot TO authenticated;

-- ============================================================================
-- 3. Initialize crystallization dates for never-crystallized positions
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_crystallization_dates(
  p_fund_id uuid DEFAULT NULL,
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
  v_count int := 0;
  v_positions jsonb := '[]'::jsonb;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Process positions that have never been crystallized
  FOR v_position IN
    SELECT
      ip.investor_id,
      ip.fund_id,
      f.code as fund_code,
      ip.current_value,
      (SELECT MIN(tx_date) FROM transactions_v2 t
       WHERE t.investor_id = ip.investor_id
       AND t.fund_id = ip.fund_id
       AND t.is_voided = false) as first_tx_date
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    WHERE ip.last_yield_crystallization_date IS NULL
      AND ip.is_active = true
      AND (p_fund_id IS NULL OR ip.fund_id = p_fund_id)
  LOOP
    IF NOT p_dry_run THEN
      -- Set crystallization date to first transaction date (or today if none)
      UPDATE investor_positions
      SET
        last_yield_crystallization_date = COALESCE(v_position.first_tx_date, CURRENT_DATE),
        updated_at = NOW()
      WHERE investor_id = v_position.investor_id
        AND fund_id = v_position.fund_id;
    END IF;

    v_positions := v_positions || jsonb_build_object(
      'investor_id', v_position.investor_id,
      'fund_code', v_position.fund_code,
      'current_value', v_position.current_value,
      'first_tx_date', v_position.first_tx_date,
      'will_set_crystal_date', COALESCE(v_position.first_tx_date, CURRENT_DATE)
    );
    v_count := v_count + 1;
  END LOOP;

  -- Log if executed
  IF NOT p_dry_run AND v_count > 0 THEN
    INSERT INTO audit_log (action, table_name, record_id, new_data, performed_by, performed_at)
    VALUES (
      'CRYSTALLIZATION_INIT',
      'investor_positions',
      NULL,
      jsonb_build_object('positions_updated', v_count, 'fund_id', p_fund_id),
      v_admin,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'positions_count', v_count,
    'positions', v_positions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_crystallization_dates TO authenticated;

-- ============================================================================
-- 4. Preview merge duplicate profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION preview_merge_duplicate_profiles(
  p_keep_profile_id uuid,
  p_merge_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_keep_profile RECORD;
  v_merge_profile RECORD;
  v_positions_count int;
  v_transactions_count int;
  v_withdrawals_count int;
  v_yield_allocations_count int;
  v_statements_count int;
  v_overlapping_funds jsonb;
BEGIN
  -- Get profiles
  SELECT * INTO v_keep_profile FROM profiles WHERE id = p_keep_profile_id;
  SELECT * INTO v_merge_profile FROM profiles WHERE id = p_merge_profile_id;

  IF v_keep_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Keep profile not found');
  END IF;
  IF v_merge_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Merge profile not found');
  END IF;
  IF p_keep_profile_id = p_merge_profile_id THEN
    RETURN jsonb_build_object('error', 'Cannot merge profile with itself');
  END IF;

  -- Count affected records
  SELECT COUNT(*) INTO v_positions_count
  FROM investor_positions WHERE investor_id = p_merge_profile_id;

  SELECT COUNT(*) INTO v_transactions_count
  FROM transactions_v2 WHERE investor_id = p_merge_profile_id AND is_voided = false;

  SELECT COUNT(*) INTO v_withdrawals_count
  FROM withdrawal_requests WHERE investor_id = p_merge_profile_id;

  SELECT COUNT(*) INTO v_yield_allocations_count
  FROM yield_allocations WHERE investor_id = p_merge_profile_id;

  SELECT COUNT(*) INTO v_statements_count
  FROM statements WHERE investor_id = p_merge_profile_id;

  -- Check for overlapping funds (both profiles have positions in same fund)
  SELECT jsonb_agg(jsonb_build_object(
    'fund_id', kp.fund_id,
    'keep_value', kp.current_value,
    'merge_value', mp.current_value,
    'combined_value', kp.current_value + mp.current_value
  ))
  INTO v_overlapping_funds
  FROM investor_positions kp
  JOIN investor_positions mp ON kp.fund_id = mp.fund_id
  WHERE kp.investor_id = p_keep_profile_id
    AND mp.investor_id = p_merge_profile_id;

  RETURN jsonb_build_object(
    'can_merge', true,
    'keep_profile', jsonb_build_object(
      'id', v_keep_profile.id,
      'email', v_keep_profile.email,
      'name', v_keep_profile.first_name || ' ' || v_keep_profile.last_name,
      'created_at', v_keep_profile.created_at
    ),
    'merge_profile', jsonb_build_object(
      'id', v_merge_profile.id,
      'email', v_merge_profile.email,
      'name', v_merge_profile.first_name || ' ' || v_merge_profile.last_name,
      'created_at', v_merge_profile.created_at
    ),
    'impact', jsonb_build_object(
      'positions_to_move', v_positions_count,
      'transactions_to_move', v_transactions_count,
      'withdrawals_to_move', v_withdrawals_count,
      'yield_allocations_to_move', v_yield_allocations_count,
      'statements_to_move', v_statements_count,
      'overlapping_funds', COALESCE(v_overlapping_funds, '[]'::jsonb)
    ),
    'warnings', CASE
      WHEN v_overlapping_funds IS NOT NULL THEN
        ARRAY['Both profiles have positions in the same fund(s) - values will be combined']
      ELSE ARRAY[]::text[]
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION preview_merge_duplicate_profiles TO authenticated;

-- ============================================================================
-- 5. Batch initialize all missing fund AUM records
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_initialize_fund_aum(
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
  v_fund RECORD;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_count int := 0;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Find funds with positions but no AUM
  FOR v_fund IN
    SELECT
      f.id as fund_id,
      f.code as fund_code,
      COALESCE(SUM(ip.current_value), 0) as positions_sum,
      (SELECT COUNT(*) FROM fund_daily_aum fda
       WHERE fda.fund_id = f.id AND fda.is_voided = false) as aum_count
    FROM funds f
    LEFT JOIN investor_positions ip ON ip.fund_id = f.id AND ip.is_active = true
    GROUP BY f.id, f.code
    HAVING (SELECT COUNT(*) FROM fund_daily_aum fda WHERE fda.fund_id = f.id AND fda.is_voided = false) = 0
      AND COALESCE(SUM(ip.current_value), 0) > 0
  LOOP
    IF NOT p_dry_run THEN
      SELECT initialize_fund_aum_from_positions(v_fund.fund_id, v_admin) INTO v_result;
    ELSE
      v_result := jsonb_build_object(
        'fund_id', v_fund.fund_id,
        'fund_code', v_fund.fund_code,
        'would_create_aum', v_fund.positions_sum
      );
    END IF;

    v_results := v_results || v_result;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'funds_processed', v_count,
    'results', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION batch_initialize_fund_aum TO authenticated;

-- ============================================================================
-- 6. Enhanced batch_crystallize_fund with integrity check
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_crystallize_fund(
  p_fund_id uuid,
  p_target_date date DEFAULT CURRENT_DATE,
  p_new_total_aum numeric DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_dry_run boolean DEFAULT true,
  p_force_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_position RECORD;
  v_results jsonb := '[]'::jsonb;
  v_processed int := 0;
  v_failed int := 0;
  v_aum numeric;
  v_integrity_violations int;
BEGIN
  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
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

  -- If no AUM, try to initialize from positions
  IF v_aum IS NULL OR v_aum = 0 THEN
    SELECT SUM(current_value) INTO v_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    IF v_aum IS NULL OR v_aum = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No AUM data available and no positions to calculate from'
      );
    END IF;

    -- Create AUM record if not dry run
    IF NOT p_dry_run THEN
      PERFORM initialize_fund_aum_from_positions(p_fund_id, v_admin, p_target_date);
    END IF;
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
        v_results := v_results || jsonb_build_object(
          'investor_id', v_position.investor_id,
          'action', 'would_crystallize',
          'current_value', v_position.current_value,
          'last_crystal_date', v_position.last_yield_crystallization_date,
          'new_crystal_date', p_target_date
        );
      ELSE
        -- Set crystallization date directly for initial crystallization
        IF v_position.last_yield_crystallization_date IS NULL THEN
          UPDATE investor_positions
          SET
            last_yield_crystallization_date = p_target_date,
            updated_at = NOW()
          WHERE investor_id = v_position.investor_id
            AND fund_id = v_position.fund_id;
        ELSE
          -- For stale positions, call crystallize_yield_before_flow if needed
          PERFORM crystallize_yield_before_flow(
            p_fund_id := p_fund_id,
            p_closing_aum := v_aum,
            p_trigger_type := 'batch',
            p_trigger_reference := 'batch_crystallize_' || p_target_date::text,
            p_event_ts := (p_target_date::timestamp + interval '12 hours'),
            p_admin_id := v_admin,
            p_purpose := 'transaction'::aum_purpose
          );
        END IF;

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

  -- Post-crystallization integrity check (only if not dry run)
  IF NOT p_dry_run THEN
    SELECT COUNT(*) INTO v_integrity_violations
    FROM v_ledger_reconciliation
    WHERE fund_id = p_fund_id;

    IF v_integrity_violations > 0 AND NOT p_force_override THEN
      RAISE EXCEPTION 'Integrity violations detected after crystallization. Use p_force_override=true to proceed anyway.';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'target_date', p_target_date,
    'aum_used', v_aum,
    'processed', v_processed,
    'failed', v_failed,
    'integrity_violations', COALESCE(v_integrity_violations, 0),
    'details', v_results
  );
END;
$$;

-- ============================================================================
-- 7. View for AUM snapshot health
-- ============================================================================

CREATE OR REPLACE VIEW v_aum_snapshot_health AS
SELECT
  f.id as fund_id,
  f.code as fund_code,
  f.name as fund_name,
  fda.aum_date as latest_aum_date,
  fda.total_aum as recorded_aum,
  fda.source as aum_source,
  fda.created_at as aum_created_at,
  COALESCE(pos.positions_sum, 0) as positions_sum,
  COALESCE(pos.active_positions, 0) as active_positions,
  ABS(COALESCE(pos.positions_sum, 0) - COALESCE(fda.total_aum, 0)) as discrepancy,
  CASE
    WHEN fda.id IS NULL THEN 'MISSING_AUM'
    WHEN ABS(COALESCE(pos.positions_sum, 0) - COALESCE(fda.total_aum, 0)) > 0.01 THEN 'MISMATCH'
    ELSE 'OK'
  END as status
FROM funds f
LEFT JOIN LATERAL (
  SELECT * FROM fund_daily_aum
  WHERE fund_id = f.id::text
    AND (is_voided IS NULL OR is_voided = false)
  ORDER BY aum_date DESC
  LIMIT 1
) fda ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(current_value) as positions_sum,
    COUNT(*) as active_positions
  FROM investor_positions
  WHERE fund_id = f.id
    AND (is_active IS NULL OR is_active = true)
) pos ON true
WHERE f.status = 'active'
ORDER BY
  CASE
    WHEN fda.id IS NULL THEN 0
    WHEN ABS(COALESCE(pos.positions_sum, 0) - COALESCE(fda.total_aum, 0)) > 0.01 THEN 1
    ELSE 2
  END,
  f.code;

COMMENT ON VIEW v_aum_snapshot_health IS
  'Shows AUM snapshot health per fund with status: OK, MISSING_AUM, or MISMATCH';

GRANT SELECT ON v_aum_snapshot_health TO authenticated;

-- ============================================================================
-- 8. Data fix: Initialize missing AUM and crystallization dates
-- ============================================================================

-- NOTE: This is a one-time data fix. Run manually with admin oversight.
-- DO NOT uncomment and run automatically.

/*
-- Initialize AUM for all funds missing it
SELECT batch_initialize_fund_aum(
  p_admin_id := auth.uid(),
  p_dry_run := false
);

-- Initialize crystallization dates for all positions missing it
SELECT initialize_crystallization_dates(
  p_fund_id := NULL,  -- All funds
  p_admin_id := auth.uid(),
  p_dry_run := false
);
*/

