-- =============================================================================
-- QA Master Runner
-- =============================================================================
-- Orchestrates the full QA suite: seed -> generate -> execute -> validate -> report.
--
-- Usage (run on Supabase development branch):
--
--   -- Full run:
--   SELECT qa_full_run('run_20260130_001', 42);
--
--   -- Smoke test (first 100 steps only):
--   SELECT qa_smoke_test('smoke_001');
--
--   -- Just invariants (no scenarios):
--   SELECT qa_run_invariants();
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_full_run(
  p_run_tag text DEFAULT 'run_' || to_char(now(), 'YYYYMMDD_HH24MI'),
  p_seed int DEFAULT 42
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed_result jsonb;
  v_gen_result jsonb;
  v_exec_result jsonb;
  v_ref_result jsonb;
  v_inv_result jsonb;
  v_report jsonb;
  v_start timestamptz := clock_timestamp();
BEGIN
  RAISE NOTICE 'QA Full Run: % (seed=%)', p_run_tag, p_seed;

  -- =========================================================================
  -- Step 1: Seed the test world
  -- =========================================================================
  RAISE NOTICE 'Step 1: Seeding test world...';
  v_seed_result := qa_seed_world(p_run_tag);
  RAISE NOTICE 'Seed complete: % entities', v_seed_result->>'entities_created';

  -- =========================================================================
  -- Step 2: Generate scenarios
  -- =========================================================================
  RAISE NOTICE 'Step 2: Generating scenarios...';
  v_gen_result := qa_generate_scenarios(p_run_tag, p_seed);
  RAISE NOTICE 'Generated: % scenarios, % steps',
    v_gen_result->>'scenarios_generated',
    v_gen_result->>'total_steps';

  -- =========================================================================
  -- Step 3: Execute all scenarios
  -- =========================================================================
  RAISE NOTICE 'Step 3: Executing scenarios...';
  v_exec_result := qa_execute_scenarios(p_run_tag);
  RAISE NOTICE 'Executed: % passed, % failed',
    v_exec_result->>'passed',
    v_exec_result->>'failed';

  -- =========================================================================
  -- Step 4: Run reference model validation
  -- =========================================================================
  RAISE NOTICE 'Step 4: Validating reference model...';
  v_ref_result := qa_validate_reference_model(p_run_tag);
  RAISE NOTICE 'Reference model: % checks, % mismatches',
    v_ref_result->>'checks',
    v_ref_result->>'mismatches';

  -- =========================================================================
  -- Step 5: Run invariant pack
  -- =========================================================================
  RAISE NOTICE 'Step 5: Running invariant pack...';
  v_inv_result := qa_run_invariants(p_run_tag);
  RAISE NOTICE 'Invariants: overall_pass=%', v_inv_result->>'overall_pass';

  -- =========================================================================
  -- Step 6: Generate report
  -- =========================================================================
  RAISE NOTICE 'Step 6: Generating report...';
  v_report := qa_generate_report(p_run_tag);

  RAISE NOTICE 'Full run complete in %s',
    extract(epoch from clock_timestamp() - v_start)::text || 's';

  RETURN jsonb_build_object(
    'run_tag', p_run_tag,
    'seed', p_seed,
    'duration_seconds', round(extract(epoch from clock_timestamp() - v_start)::numeric, 2),
    'seed_result', v_seed_result,
    'generation', v_gen_result,
    'execution', v_exec_result,
    'reference_model', v_ref_result,
    'invariants', v_inv_result,
    'report', v_report
  );
END;
$$;

-- =============================================================================
-- Smoke test (first 100 steps only)
-- =============================================================================
CREATE OR REPLACE FUNCTION qa_smoke_test(
  p_run_tag text DEFAULT 'smoke_' || to_char(now(), 'YYYYMMDD_HH24MI'),
  p_seed int DEFAULT 42,
  p_max_steps int DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed_result jsonb;
  v_gen_result jsonb;
  v_exec_result jsonb;
  v_inv_result jsonb;
BEGIN
  -- Seed
  v_seed_result := qa_seed_world(p_run_tag);

  -- Generate
  v_gen_result := qa_generate_scenarios(p_run_tag, p_seed);

  -- Execute only first N steps
  v_exec_result := qa_execute_scenarios(p_run_tag, p_max_steps);

  -- Run invariants
  v_inv_result := qa_run_invariants(p_run_tag);

  RETURN jsonb_build_object(
    'run_tag', p_run_tag,
    'type', 'smoke_test',
    'max_steps', p_max_steps,
    'execution', v_exec_result,
    'invariants', v_inv_result
  );
END;
$$;

-- =============================================================================
-- Quick invariant check (no test world needed, runs on production data)
-- =============================================================================
CREATE OR REPLACE FUNCTION qa_quick_invariants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN qa_run_invariants(NULL);  -- NULL = check all data, not scoped to QA
END;
$$;
