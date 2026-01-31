-- =============================================================================
-- Phase 8: Report Generator
-- =============================================================================
-- Generates JSON and Markdown reports from QA test results.
--
-- Usage:
--   SELECT qa_generate_report('run42');
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_generate_report(p_run_tag text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scenarios jsonb;
  v_operations jsonb;
  v_invariants jsonb;
  v_failures jsonb;
  v_drift jsonb;
  v_report jsonb;
BEGIN
  -- =========================================================================
  -- 1. Scenario summary
  -- =========================================================================
  SELECT jsonb_build_object(
    'total', COUNT(DISTINCT scenario_id),
    'passed', COUNT(DISTINCT scenario_id) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM qa_scenario_manifest m2
      WHERE m2.run_tag = p_run_tag
        AND m2.scenario_id = m.scenario_id
        AND m2.executed = true
        AND (m2.execution_result->>'success')::boolean = false
    )),
    'failed', COUNT(DISTINCT scenario_id) FILTER (WHERE EXISTS (
      SELECT 1 FROM qa_scenario_manifest m2
      WHERE m2.run_tag = p_run_tag
        AND m2.scenario_id = m.scenario_id
        AND m2.executed = true
        AND (m2.execution_result->>'success')::boolean = false
    ))
  )
  INTO v_scenarios
  FROM qa_scenario_manifest m
  WHERE m.run_tag = p_run_tag;

  -- =========================================================================
  -- 2. Operations summary
  -- =========================================================================
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'executed', COUNT(*) FILTER (WHERE executed = true),
    'passed', COUNT(*) FILTER (WHERE executed = true AND (execution_result->>'success')::boolean = true),
    'failed', COUNT(*) FILTER (WHERE executed = true AND (execution_result->>'success')::boolean = false),
    'pending', COUNT(*) FILTER (WHERE executed = false)
  )
  INTO v_operations
  FROM qa_scenario_manifest
  WHERE run_tag = p_run_tag;

  -- =========================================================================
  -- 3. Invariant results
  -- =========================================================================
  SELECT jsonb_build_object(
    'total', COALESCE((details->'total_checks')::int, 0),
    'passed', COALESCE((
      SELECT COUNT(*) FROM jsonb_array_elements(details->'checks') c
      WHERE (c.value->>'passed')::boolean = true
    ), 0),
    'failed', COALESCE((
      SELECT COUNT(*) FROM jsonb_array_elements(details->'checks') c
      WHERE (c.value->>'passed')::boolean = false
    ), 0)
  )
  INTO v_invariants
  FROM qa_test_results
  WHERE run_tag = p_run_tag
    AND test_category = 'invariant_pack'
  ORDER BY executed_at DESC
  LIMIT 1;

  IF v_invariants IS NULL THEN
    v_invariants := jsonb_build_object('total', 0, 'passed', 0, 'failed', 0);
  END IF;

  -- =========================================================================
  -- 4. Failure details
  -- =========================================================================
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'scenario_id', scenario_id,
    'step', step_number,
    'rpc', rpc_name,
    'reference_id', reference_id,
    'root_cause', CASE
      WHEN execution_result->>'error' LIKE '%enum%' THEN 'CONTRACT_DRIFT'
      WHEN execution_result->>'error' LIKE '%violation%' THEN 'CONSERVATION_VIOLATION'
      WHEN execution_result->>'error' LIKE '%duplicate%' THEN 'IDEMPOTENCY_CHECK'
      WHEN execution_result->>'error' LIKE '%void%' THEN 'VOID_CASCADE_BUG'
      WHEN execution_result->>'error' LIKE '%precision%' THEN 'PRECISION_BUG'
      WHEN execution_result->>'error' LIKE '%state%' THEN 'STATE_MACHINE_VIOLATION'
      ELSE 'UNKNOWN'
    END,
    'details', execution_result->>'error'
  ) ORDER BY step_number), '[]'::jsonb)
  INTO v_failures
  FROM qa_scenario_manifest
  WHERE run_tag = p_run_tag
    AND executed = true
    AND (execution_result->>'success')::boolean = false
    AND expected_success = true;  -- Only actual failures, not expected ones

  -- =========================================================================
  -- 5. Drift count
  -- =========================================================================
  SELECT COALESCE((details->>'enumsWithDrift')::int, 0)
  INTO v_drift
  FROM qa_test_results
  WHERE run_tag = p_run_tag
    AND test_category = 'contract_drift'
  ORDER BY executed_at DESC
  LIMIT 1;

  IF v_drift IS NULL THEN v_drift := '0'::jsonb; END IF;

  -- =========================================================================
  -- 6. Build full report
  -- =========================================================================
  v_report := jsonb_build_object(
    'run_tag', p_run_tag,
    'run_at', now(),
    'scenarios', COALESCE(v_scenarios, jsonb_build_object('total', 0, 'passed', 0, 'failed', 0)),
    'operations', COALESCE(v_operations, jsonb_build_object('total', 0, 'executed', 0, 'passed', 0, 'failed', 0, 'pending', 0)),
    'invariants', v_invariants,
    'drift_items', v_drift,
    'failures', COALESCE(v_failures, '[]'::jsonb),
    'categories', (
      SELECT COALESCE(jsonb_object_agg(
        scenario_category,
        jsonb_build_object(
          'total', cat_total,
          'passed', cat_passed,
          'failed', cat_failed,
          'pass_rate', CASE WHEN cat_total > 0 THEN round(cat_passed::numeric / cat_total * 100, 1) ELSE 0 END
        )
      ), '{}'::jsonb)
      FROM (
        SELECT
          scenario_category,
          COUNT(DISTINCT scenario_id) AS cat_total,
          COUNT(DISTINCT scenario_id) FILTER (WHERE NOT EXISTS (
            SELECT 1 FROM qa_scenario_manifest m2
            WHERE m2.run_tag = p_run_tag
              AND m2.scenario_id = m.scenario_id
              AND m2.executed = true
              AND (m2.execution_result->>'success')::boolean = false
          )) AS cat_passed,
          COUNT(DISTINCT scenario_id) FILTER (WHERE EXISTS (
            SELECT 1 FROM qa_scenario_manifest m2
            WHERE m2.run_tag = p_run_tag
              AND m2.scenario_id = m.scenario_id
              AND m2.executed = true
              AND (m2.execution_result->>'success')::boolean = false
          )) AS cat_failed
        FROM qa_scenario_manifest m
        WHERE m.run_tag = p_run_tag
        GROUP BY scenario_category
      ) cats
    )
  );

  -- Record report generation
  INSERT INTO qa_test_results (run_tag, test_category, test_name, status, details)
  VALUES (p_run_tag, 'report', 'Full QA Report Generated', 'PASS', v_report);

  RETURN v_report;
END;
$$;

-- =============================================================================
-- Markdown report generator
-- =============================================================================
CREATE OR REPLACE FUNCTION qa_generate_markdown_report(p_run_tag text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report jsonb;
  v_md text;
  v_rec record;
BEGIN
  v_report := qa_generate_report(p_run_tag);

  v_md := '# QA Report: ' || p_run_tag || E'\n\n';
  v_md := v_md || '**Generated:** ' || (v_report->>'run_at') || E'\n\n';

  -- Summary
  v_md := v_md || E'## Summary\n\n';
  v_md := v_md || '| Metric | Total | Passed | Failed |' || E'\n';
  v_md := v_md || '|--------|-------|--------|--------|' || E'\n';
  v_md := v_md || '| Scenarios | ' || (v_report->'scenarios'->>'total') || ' | ' || (v_report->'scenarios'->>'passed') || ' | ' || (v_report->'scenarios'->>'failed') || ' |' || E'\n';
  v_md := v_md || '| Operations | ' || (v_report->'operations'->>'total') || ' | ' || (v_report->'operations'->>'passed') || ' | ' || (v_report->'operations'->>'failed') || ' |' || E'\n';
  v_md := v_md || '| Invariants | ' || (v_report->'invariants'->>'total') || ' | ' || (v_report->'invariants'->>'passed') || ' | ' || (v_report->'invariants'->>'failed') || ' |' || E'\n';
  v_md := v_md || E'\n';

  -- Drift
  v_md := v_md || '**Drift Items:** ' || (v_report->>'drift_items') || E'\n\n';

  -- Category breakdown
  v_md := v_md || E'## Category Breakdown\n\n';
  v_md := v_md || '| Category | Total | Passed | Failed | Rate |' || E'\n';
  v_md := v_md || '|----------|-------|--------|--------|------|' || E'\n';

  FOR v_rec IN
    SELECT key, value FROM jsonb_each(v_report->'categories')
  LOOP
    v_md := v_md || '| ' || v_rec.key || ' | ' || (v_rec.value->>'total') || ' | ' || (v_rec.value->>'passed') || ' | ' || (v_rec.value->>'failed') || ' | ' || (v_rec.value->>'pass_rate') || '% |' || E'\n';
  END LOOP;

  v_md := v_md || E'\n';

  -- Failures
  IF jsonb_array_length(v_report->'failures') > 0 THEN
    v_md := v_md || E'## Failures\n\n';
    FOR v_rec IN
      SELECT value FROM jsonb_array_elements(v_report->'failures')
    LOOP
      v_md := v_md || '- **' || (v_rec.value->>'scenario_id') || '** step ' || (v_rec.value->>'step') || ' (' || (v_rec.value->>'rpc') || '): ' || (v_rec.value->>'root_cause') || E'\n';
      v_md := v_md || '  - ' || COALESCE(v_rec.value->>'details', 'No details') || E'\n';
    END LOOP;
  ELSE
    v_md := v_md || E'## Failures\n\nNone!\n';
  END IF;

  RETURN v_md;
END;
$$;
