-- ============================================================================
-- P0: Duplicate Profile Handling
-- Date: 2026-01-16
-- Purpose: Detect and safely merge duplicate investor profiles
-- ============================================================================

-- ============================================================================
-- 1. Enhanced duplicate profile detection view
-- ============================================================================
CREATE OR REPLACE VIEW v_potential_duplicate_profiles AS
WITH email_groups AS (
  SELECT
    LOWER(TRIM(email)) as normalized_email,
    COUNT(*) as profile_count,
    ARRAY_AGG(id ORDER BY created_at) as profile_ids,
    ARRAY_AGG(email ORDER BY created_at) as emails,
    ARRAY_AGG(first_name || ' ' || last_name ORDER BY created_at) as names,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
  FROM profiles
  WHERE email IS NOT NULL
  GROUP BY LOWER(TRIM(email))
  HAVING COUNT(*) > 1
),
name_groups AS (
  SELECT
    LOWER(TRIM(first_name)) || ' ' || LOWER(TRIM(last_name)) as normalized_name,
    COUNT(*) as profile_count,
    ARRAY_AGG(id ORDER BY created_at) as profile_ids,
    ARRAY_AGG(email ORDER BY created_at) as emails,
    MIN(created_at) as first_created
  FROM profiles
  WHERE first_name IS NOT NULL AND last_name IS NOT NULL
  GROUP BY LOWER(TRIM(first_name)) || ' ' || LOWER(TRIM(last_name))
  HAVING COUNT(*) > 1
)
SELECT
  'email_duplicate' as duplicate_type,
  eg.normalized_email as match_key,
  eg.profile_count,
  eg.profile_ids,
  eg.emails,
  eg.names,
  eg.first_created,
  eg.last_created,
  (
    SELECT COUNT(DISTINCT ip.fund_id)
    FROM investor_positions ip
    WHERE ip.investor_id = ANY(eg.profile_ids)
  ) as total_funds_affected,
  (
    SELECT COALESCE(SUM(ip.current_value), 0)
    FROM investor_positions ip
    WHERE ip.investor_id = ANY(eg.profile_ids)
  ) as total_value_affected
FROM email_groups eg
UNION ALL
SELECT
  'name_duplicate' as duplicate_type,
  ng.normalized_name as match_key,
  ng.profile_count,
  ng.profile_ids,
  ng.emails,
  NULL as names,
  ng.first_created,
  NULL as last_created,
  (
    SELECT COUNT(DISTINCT ip.fund_id)
    FROM investor_positions ip
    WHERE ip.investor_id = ANY(ng.profile_ids)
  ) as total_funds_affected,
  (
    SELECT COALESCE(SUM(ip.current_value), 0)
    FROM investor_positions ip
    WHERE ip.investor_id = ANY(ng.profile_ids)
  ) as total_value_affected
FROM name_groups ng
-- Exclude name matches that are already caught by email matches
WHERE NOT EXISTS (
  SELECT 1 FROM email_groups eg
  WHERE ng.profile_ids && eg.profile_ids
)
ORDER BY total_value_affected DESC;

COMMENT ON VIEW v_potential_duplicate_profiles IS
  'Detects potential duplicate profiles by email (case-insensitive) and name matching.';

GRANT SELECT ON v_potential_duplicate_profiles TO authenticated;

-- ============================================================================
-- 2. Merge duplicate profiles function
-- ============================================================================
CREATE OR REPLACE FUNCTION merge_duplicate_profiles(
  p_keep_profile_id uuid,
  p_merge_profile_id uuid,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_keep_profile RECORD;
  v_merge_profile RECORD;
  v_merged_data jsonb := '{}';
  v_positions_merged int := 0;
  v_transactions_updated int := 0;
  v_withdrawals_updated int := 0;
  v_allocations_updated int := 0;
  v_lock_key bigint;
BEGIN
  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required for profile merge';
  END IF;

  -- Validate profiles exist
  SELECT * INTO v_keep_profile FROM profiles WHERE id = p_keep_profile_id;
  IF v_keep_profile IS NULL THEN
    RAISE EXCEPTION 'Keep profile not found: %', p_keep_profile_id;
  END IF;

  SELECT * INTO v_merge_profile FROM profiles WHERE id = p_merge_profile_id;
  IF v_merge_profile IS NULL THEN
    RAISE EXCEPTION 'Merge profile not found: %', p_merge_profile_id;
  END IF;

  -- Cannot merge same profile
  IF p_keep_profile_id = p_merge_profile_id THEN
    RAISE EXCEPTION 'Cannot merge profile with itself';
  END IF;

  -- Acquire lock on both profiles
  v_lock_key := ('x' || substr(md5(p_keep_profile_id::text || p_merge_profile_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Store merge audit data
  v_merged_data := jsonb_build_object(
    'keep_profile', jsonb_build_object(
      'id', v_keep_profile.id,
      'email', v_keep_profile.email,
      'name', v_keep_profile.first_name || ' ' || v_keep_profile.last_name
    ),
    'merge_profile', jsonb_build_object(
      'id', v_merge_profile.id,
      'email', v_merge_profile.email,
      'name', v_merge_profile.first_name || ' ' || v_merge_profile.last_name
    )
  );

  -- 1. Merge investor_positions
  -- For positions in same fund, sum the values to keep profile
  -- For positions in different funds, just reassign
  WITH positions_to_merge AS (
    SELECT
      mp.fund_id,
      mp.current_value as merge_value,
      mp.cost_basis as merge_cost_basis,
      mp.cumulative_yield_earned as merge_yield,
      kp.investor_id as keep_has_position
    FROM investor_positions mp
    LEFT JOIN investor_positions kp
      ON kp.investor_id = p_keep_profile_id
      AND kp.fund_id = mp.fund_id
    WHERE mp.investor_id = p_merge_profile_id
  ),
  -- Update existing positions (merge values)
  updated_positions AS (
    UPDATE investor_positions ip
    SET
      current_value = ip.current_value + ptm.merge_value,
      cost_basis = ip.cost_basis + ptm.merge_cost_basis,
      cumulative_yield_earned = COALESCE(ip.cumulative_yield_earned, 0) + COALESCE(ptm.merge_yield, 0),
      updated_at = NOW()
    FROM positions_to_merge ptm
    WHERE ip.investor_id = p_keep_profile_id
      AND ip.fund_id = ptm.fund_id
      AND ptm.keep_has_position IS NOT NULL
    RETURNING ip.fund_id
  ),
  -- Reassign positions that don't exist in keep profile
  reassigned_positions AS (
    UPDATE investor_positions ip
    SET investor_id = p_keep_profile_id
    FROM positions_to_merge ptm
    WHERE ip.investor_id = p_merge_profile_id
      AND ip.fund_id = ptm.fund_id
      AND ptm.keep_has_position IS NULL
    RETURNING ip.fund_id
  )
  SELECT
    (SELECT COUNT(*) FROM updated_positions) + (SELECT COUNT(*) FROM reassigned_positions)
  INTO v_positions_merged;

  -- Delete merged positions (if any duplicates remain)
  DELETE FROM investor_positions
  WHERE investor_id = p_merge_profile_id;

  -- 2. Update transactions
  UPDATE transactions_v2
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_transactions_updated = ROW_COUNT;

  -- 3. Update withdrawal requests
  UPDATE withdrawal_requests
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_withdrawals_updated = ROW_COUNT;

  -- 4. Update yield allocations
  UPDATE yield_allocations
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;
  GET DIAGNOSTICS v_allocations_updated = ROW_COUNT;

  -- 5. Update fee allocations
  UPDATE fee_allocations
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 6. Update IB allocations
  UPDATE ib_allocations
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 7. Update statements
  UPDATE statements
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 8. Update investor_yield_events
  UPDATE investor_yield_events
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 9. Update documents
  UPDATE documents
  SET investor_id = p_keep_profile_id
  WHERE investor_id = p_merge_profile_id;

  -- 10. Create audit record
  INSERT INTO audit_log (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    performed_at
  ) VALUES (
    'PROFILE_MERGE',
    'profiles',
    p_keep_profile_id,
    v_merged_data,
    jsonb_build_object(
      'positions_merged', v_positions_merged,
      'transactions_updated', v_transactions_updated,
      'withdrawals_updated', v_withdrawals_updated,
      'allocations_updated', v_allocations_updated
    ),
    v_admin,
    NOW()
  );

  -- 11. Soft-delete the merged profile (don't hard delete for audit trail)
  UPDATE profiles
  SET
    email = email || '_merged_' || NOW()::text,
    is_active = false,
    updated_at = NOW()
  WHERE id = p_merge_profile_id;

  -- 12. Recompute positions for keep profile
  PERFORM recompute_investor_positions_for_investor(p_keep_profile_id);

  RETURN jsonb_build_object(
    'success', true,
    'keep_profile_id', p_keep_profile_id,
    'merged_profile_id', p_merge_profile_id,
    'positions_merged', v_positions_merged,
    'transactions_updated', v_transactions_updated,
    'withdrawals_updated', v_withdrawals_updated,
    'allocations_updated', v_allocations_updated,
    'message', 'Profiles merged successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO audit_log (
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    performed_by,
    performed_at
  ) VALUES (
    'PROFILE_MERGE_FAILED',
    'profiles',
    p_keep_profile_id,
    v_merged_data,
    jsonb_build_object('error', SQLERRM),
    v_admin,
    NOW()
  );

  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION merge_duplicate_profiles TO authenticated;

COMMENT ON FUNCTION merge_duplicate_profiles IS
  'Safely merge two duplicate profiles. Moves all data to keep_profile and deactivates merge_profile.';

-- ============================================================================
-- 3. Function to check for duplicate email before profile creation
-- ============================================================================
CREATE OR REPLACE FUNCTION check_email_uniqueness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'A profile with this email already exists (case-insensitive): %', NEW.email
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_email_uniqueness'
  ) THEN
    CREATE TRIGGER trg_check_email_uniqueness
      BEFORE INSERT OR UPDATE OF email ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION check_email_uniqueness();
  END IF;
END $$;

-- ============================================================================
-- 4. View for merge candidates with recommendations
-- ============================================================================
CREATE OR REPLACE VIEW v_merge_candidates AS
SELECT
  dp.duplicate_type,
  dp.match_key,
  dp.profile_ids[1] as recommended_keep_id,
  dp.profile_ids[2:] as merge_candidate_ids,
  dp.emails,
  dp.total_value_affected,
  dp.total_funds_affected,
  (
    SELECT jsonb_agg(jsonb_build_object(
      'profile_id', p.id,
      'email', p.email,
      'name', p.first_name || ' ' || p.last_name,
      'created_at', p.created_at,
      'position_count', (SELECT COUNT(*) FROM investor_positions ip WHERE ip.investor_id = p.id),
      'transaction_count', (SELECT COUNT(*) FROM transactions_v2 t WHERE t.investor_id = p.id AND (t.is_voided IS NULL OR t.is_voided = false))
    ) ORDER BY p.created_at)
    FROM profiles p
    WHERE p.id = ANY(dp.profile_ids)
  ) as profile_details
FROM v_potential_duplicate_profiles dp
WHERE dp.profile_count = 2  -- Start with simple duplicates
ORDER BY dp.total_value_affected DESC;

COMMENT ON VIEW v_merge_candidates IS
  'Shows duplicate profiles with merge recommendations. First profile (oldest) is recommended to keep.';

GRANT SELECT ON v_merge_candidates TO authenticated;

