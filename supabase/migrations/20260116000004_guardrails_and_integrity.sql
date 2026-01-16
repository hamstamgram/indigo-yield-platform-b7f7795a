-- ============================================================================
-- Phase 5-7: Additional Guardrails and Integrity Checks
-- Date: 2026-01-16
-- ============================================================================

BEGIN;

-- ============================================================================
-- Phase 5: Duplicate Investor Profile Detection
-- ============================================================================

-- Ensure account_type column exists (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'investor';

-- View to detect potential duplicate investor profiles
CREATE OR REPLACE VIEW public.v_potential_duplicate_profiles AS
SELECT
  p1.id AS profile_id_1,
  p2.id AS profile_id_2,
  p1.email AS email_1,
  p2.email AS email_2,
  COALESCE(p1.first_name || ' ' || p1.last_name, '') AS name_1,
  COALESCE(p2.first_name || ' ' || p2.last_name, '') AS name_2,
  p1.created_at AS created_1,
  p2.created_at AS created_2,
  CASE
    WHEN LOWER(p1.email) = LOWER(p2.email) THEN 'exact_email_match'
    WHEN LOWER(COALESCE(p1.first_name || p1.last_name, '')) = LOWER(COALESCE(p2.first_name || p2.last_name, ''))
      AND COALESCE(p1.first_name || p1.last_name, '') != '' THEN 'exact_name_match'
    ELSE 'fuzzy_match'
  END AS match_type
FROM profiles p1
JOIN profiles p2 ON p1.id < p2.id
WHERE p1.is_admin = false  -- Non-admin = investor
  AND p2.is_admin = false
  AND (
    -- Exact email match (case insensitive)
    LOWER(p1.email) = LOWER(p2.email)
    -- OR exact name match
    OR (
      LOWER(COALESCE(p1.first_name || p1.last_name, '')) = LOWER(COALESCE(p2.first_name || p2.last_name, ''))
      AND COALESCE(p1.first_name || p1.last_name, '') != ''
    )
  );

COMMENT ON VIEW v_potential_duplicate_profiles IS
  'Detects potential duplicate investor profiles by email or name. Empty = no duplicates.';

-- Function to merge duplicate investor profiles (admin only)
CREATE OR REPLACE FUNCTION public.merge_duplicate_profiles(
  p_keep_profile_id uuid,
  p_merge_profile_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_keep_profile record;
  v_merge_profile record;
  v_tx_count integer := 0;
  v_pos_count integer := 0;
  v_audit_id uuid;
BEGIN
  -- Require admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin required');
  END IF;

  -- Get both profiles
  SELECT * INTO v_keep_profile FROM profiles WHERE id = p_keep_profile_id;
  SELECT * INTO v_merge_profile FROM profiles WHERE id = p_merge_profile_id;

  IF v_keep_profile IS NULL OR v_merge_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_keep_profile.is_admin = true OR v_merge_profile.is_admin = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot merge admin profiles');
  END IF;

  -- Audit log entry
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'MERGE_PROFILES',
    'profiles',
    p_merge_profile_id::text,
    p_admin_id,
    jsonb_build_object('merged_into', p_keep_profile_id, 'merge_profile', to_jsonb(v_merge_profile)),
    jsonb_build_object('action', 'merge')
  )
  RETURNING id INTO v_audit_id;

  -- Move all transactions to keep profile
  UPDATE transactions_v2
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_tx_count = ROW_COUNT;

  -- Merge positions (add values to existing or move)
  WITH merged_positions AS (
    SELECT
      p_keep_profile_id AS investor_id,
      fund_id,
      SUM(current_value) AS current_value,
      SUM(cost_basis) AS cost_basis,
      SUM(shares) AS shares,
      SUM(COALESCE(cumulative_yield_earned, 0)) AS cumulative_yield_earned
    FROM investor_positions
    WHERE investor_id IN (p_keep_profile_id, p_merge_profile_id)
    GROUP BY fund_id
  )
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, cumulative_yield_earned)
  SELECT * FROM merged_positions
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    shares = EXCLUDED.shares,
    cumulative_yield_earned = EXCLUDED.cumulative_yield_earned,
    updated_at = now();

  -- Delete old positions
  DELETE FROM investor_positions WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_pos_count = ROW_COUNT;

  -- Move yield events
  UPDATE investor_yield_events SET investor_id = p_keep_profile_id WHERE investor_id = p_merge_profile_id;

  -- Move fee schedules
  UPDATE investor_fee_schedule SET investor_id = p_keep_profile_id WHERE investor_id = p_merge_profile_id;

  -- Soft-delete the merged profile (mark inactive via status)
  UPDATE profiles
  SET status = 'Closed',
      email = email || '_MERGED_' || p_merge_profile_id::text,
      updated_at = now()
  WHERE id = p_merge_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'keep_profile_id', p_keep_profile_id,
    'merged_profile_id', p_merge_profile_id,
    'transactions_moved', v_tx_count,
    'positions_merged', v_pos_count,
    'audit_id', v_audit_id
  );
END;
$$;

COMMENT ON FUNCTION merge_duplicate_profiles(uuid, uuid, uuid) IS
  'Merge duplicate investor profiles. Moves all transactions/positions to keep profile. ADMIN ONLY.';

-- ============================================================================
-- Phase 6: Position Integrity Constraints
-- ============================================================================

-- Trigger to prevent negative positions (warning, not blocking)
CREATE OR REPLACE FUNCTION public.check_position_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log warning if position goes negative (but don't block - might be intentional void/correction)
  IF NEW.current_value < 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, new_values)
    VALUES (
      'POSITION_NEGATIVE_WARNING',
      'investor_positions',
      NEW.investor_id::text || ':' || NEW.fund_id::text,
      jsonb_build_object(
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'current_value', NEW.current_value,
        'warning', 'Position went negative - may need review'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_position_integrity ON investor_positions;
CREATE TRIGGER trg_position_integrity
  AFTER INSERT OR UPDATE ON investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION check_position_integrity();

-- ============================================================================
-- Phase 7: Yield Conservation Identity Enforcement
-- ============================================================================

-- View to check yield conservation: gross = net + fees + ib + dust
-- Only created if yield_distributions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yield_distributions') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_yield_conservation_check AS
      SELECT
        yd.id AS distribution_id,
        yd.fund_id,
        f.code AS fund_code,
        yd.effective_date,
        yd.gross_yield,
        COALESCE(investor_totals.net_yield, 0) AS total_net_yield,
        COALESCE(fee_totals.total_fees, 0) AS total_fees,
        COALESCE(ib_totals.total_ib, 0) AS total_ib,
        yd.gross_yield - (
          COALESCE(investor_totals.net_yield, 0) +
          COALESCE(fee_totals.total_fees, 0) +
          COALESCE(ib_totals.total_ib, 0)
        ) AS unaccounted_dust,
        ABS(yd.gross_yield - (
          COALESCE(investor_totals.net_yield, 0) +
          COALESCE(fee_totals.total_fees, 0) +
          COALESCE(ib_totals.total_ib, 0)
        )) > 0.01 AS has_conservation_violation
      FROM yield_distributions yd
      JOIN funds f ON f.id = yd.fund_id
      LEFT JOIN LATERAL (
        SELECT SUM(net_yield_amount) AS net_yield
        FROM investor_yield_events
        WHERE distribution_id = yd.id AND is_voided = false
      ) investor_totals ON true
      LEFT JOIN LATERAL (
        SELECT SUM(fee_amount) AS total_fees
        FROM fee_allocations
        WHERE distribution_id = yd.id AND is_voided = false
      ) fee_totals ON true
      LEFT JOIN LATERAL (
        SELECT SUM(ib_fee_amount) AS total_ib
        FROM ib_allocations
        WHERE distribution_id = yd.id AND is_voided = false
      ) ib_totals ON true
      WHERE yd.status != ''voided''
        AND ABS(yd.gross_yield - (
          COALESCE(investor_totals.net_yield, 0) +
          COALESCE(fee_totals.total_fees, 0) +
          COALESCE(ib_totals.total_ib, 0)
        )) > 0.01
    ';
    EXECUTE 'GRANT SELECT ON v_yield_conservation_check TO authenticated';
    RAISE NOTICE 'Created v_yield_conservation_check view';
  ELSE
    RAISE NOTICE 'Skipping v_yield_conservation_check - yield_distributions table not found';
  END IF;
END $$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT ON v_potential_duplicate_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION merge_duplicate_profiles(uuid, uuid, uuid) TO authenticated;

COMMIT;
