-- =============================================================================
-- Phase 2: QA World Cleanup
-- =============================================================================
-- Removes all QA-seeded entities for a given run_tag.
-- Handles FK dependencies by deleting in correct order:
--   transactions -> positions -> fee_schedules -> profiles -> funds
--
-- Usage:
--   SELECT qa_cleanup_world('run42');
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_cleanup_world(p_run_tag text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted jsonb := '{}';
  v_count int;
  v_entity_ids uuid[];
  v_fund_ids uuid[];
  v_profile_ids uuid[];
BEGIN
  -- Collect all entity IDs for this run
  SELECT array_agg(entity_id) FILTER (WHERE entity_type = 'fund')
  INTO v_fund_ids
  FROM qa_entity_manifest
  WHERE run_tag = p_run_tag;

  SELECT array_agg(entity_id) FILTER (WHERE entity_type = 'profile')
  INTO v_profile_ids
  FROM qa_entity_manifest
  WHERE run_tag = p_run_tag;

  -- If nothing to clean, return early
  IF v_fund_ids IS NULL AND v_profile_ids IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'No entities found for run_tag: ' || p_run_tag);
  END IF;

  -- =========================================================================
  -- 1. Delete QA test results
  -- =========================================================================
  DELETE FROM qa_test_results WHERE run_tag = p_run_tag;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('test_results', v_count);

  -- =========================================================================
  -- 2. Delete scenario manifest entries
  -- =========================================================================
  DELETE FROM qa_scenario_manifest WHERE run_tag = p_run_tag;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('scenarios', v_count);

  -- =========================================================================
  -- 3. Void and delete transactions (for QA investors in QA funds)
  -- =========================================================================
  IF v_profile_ids IS NOT NULL AND v_fund_ids IS NOT NULL THEN
    -- First void all non-voided transactions
    UPDATE transactions_v2
    SET is_voided = true, voided_at = now(), void_reason = 'QA cleanup: ' || p_run_tag
    WHERE investor_id = ANY(v_profile_ids)
      AND fund_id = ANY(v_fund_ids)
      AND is_voided = false;

    -- Delete fee_allocations linked to QA distributions
    DELETE FROM fee_allocations
    WHERE distribution_id IN (
      SELECT id FROM yield_distributions
      WHERE fund_id = ANY(v_fund_ids)
      AND (reference_id LIKE 'QA-' || p_run_tag || '-%' OR created_by = ANY(v_profile_ids))
    );

    -- Delete ib_allocations linked to QA distributions
    DELETE FROM ib_allocations
    WHERE distribution_id IN (
      SELECT id FROM yield_distributions
      WHERE fund_id = ANY(v_fund_ids)
      AND (reference_id LIKE 'QA-' || p_run_tag || '-%' OR created_by = ANY(v_profile_ids))
    );

    -- Delete yield distributions for QA funds
    DELETE FROM yield_distributions
    WHERE fund_id = ANY(v_fund_ids)
    AND (reference_id LIKE 'QA-' || p_run_tag || '-%' OR created_by = ANY(v_profile_ids));
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('yield_distributions', v_count);

    -- Delete transactions
    DELETE FROM transactions_v2
    WHERE investor_id = ANY(v_profile_ids)
      AND fund_id = ANY(v_fund_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('transactions', v_count);
  END IF;

  -- =========================================================================
  -- 4. Delete withdrawal requests
  -- =========================================================================
  IF v_profile_ids IS NOT NULL THEN
    DELETE FROM withdrawal_requests
    WHERE investor_id = ANY(v_profile_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('withdrawal_requests', v_count);
  END IF;

  -- =========================================================================
  -- 5. Delete investor positions
  -- =========================================================================
  IF v_profile_ids IS NOT NULL AND v_fund_ids IS NOT NULL THEN
    DELETE FROM investor_positions
    WHERE investor_id = ANY(v_profile_ids)
      AND fund_id = ANY(v_fund_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('positions', v_count);
  END IF;

  -- =========================================================================
  -- 6. Delete fee schedules
  -- =========================================================================
  IF v_profile_ids IS NOT NULL THEN
    DELETE FROM investor_fee_schedule
    WHERE investor_id = ANY(v_profile_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('fee_schedules', v_count);
  END IF;

  -- =========================================================================
  -- 7. Delete fund_daily_aum records for QA funds
  -- =========================================================================
  IF v_fund_ids IS NOT NULL THEN
    DELETE FROM fund_daily_aum
    WHERE fund_id = ANY(v_fund_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('fund_daily_aum', v_count);

    DELETE FROM fund_aum_events
    WHERE fund_id = ANY(v_fund_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('fund_aum_events', v_count);
  END IF;

  -- =========================================================================
  -- 8. Delete profiles (after all dependent records removed)
  -- =========================================================================
  IF v_profile_ids IS NOT NULL THEN
    DELETE FROM profiles
    WHERE id = ANY(v_profile_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('profiles', v_count);
  END IF;

  -- =========================================================================
  -- 9. Delete funds (after all dependent records removed)
  -- =========================================================================
  IF v_fund_ids IS NOT NULL THEN
    DELETE FROM funds
    WHERE id = ANY(v_fund_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('funds', v_count);
  END IF;

  -- =========================================================================
  -- 10. Delete entity manifest
  -- =========================================================================
  DELETE FROM qa_entity_manifest WHERE run_tag = p_run_tag;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('manifest_entries', v_count);

  RETURN jsonb_build_object(
    'success', true,
    'run_tag', p_run_tag,
    'cleaned_at', now(),
    'deleted', v_deleted
  );
END;
$$;
