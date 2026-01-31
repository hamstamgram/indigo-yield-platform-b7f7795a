-- =============================================================================
-- Phase 5, Layer 1: Independent Reference Model
-- =============================================================================
-- Computes expected positions and fund AUM from first principles using
-- exact rational arithmetic. Compares against actual DB state.
--
-- Usage:
--   SELECT qa_validate_reference_model('run42');
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_validate_reference_model(p_run_tag text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
  v_mismatches jsonb := '[]';
  v_mismatch_count int := 0;
  v_check_count int := 0;
  v_expected_position numeric;
  v_actual_position numeric;
  v_diff numeric;
  v_investor_ids uuid[];
  v_fund_ids uuid[];
BEGIN
  -- =========================================================================
  -- 1. Collect all QA investors and funds
  -- =========================================================================
  SELECT array_agg(DISTINCT entity_id) FILTER (WHERE entity_type = 'profile' AND entity_label NOT LIKE '%Admin%' AND entity_label NOT LIKE '%Fees%' AND entity_label NOT LIKE '%IB%')
  INTO v_investor_ids
  FROM qa_entity_manifest
  WHERE run_tag = p_run_tag;

  SELECT array_agg(DISTINCT entity_id) FILTER (WHERE entity_type = 'fund')
  INTO v_fund_ids
  FROM qa_entity_manifest
  WHERE run_tag = p_run_tag;

  IF v_investor_ids IS NULL OR v_fund_ids IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No QA entities found for run_tag: ' || p_run_tag,
      'checks', 0
    );
  END IF;

  -- =========================================================================
  -- 2. For each investor+fund, compute expected position from ledger
  -- =========================================================================
  FOR v_rec IN
    SELECT
      ip.investor_id,
      ip.fund_id,
      ip.current_value AS actual_position,
      COALESCE(ledger.ledger_total, 0) AS expected_position,
      p.first_name || ' ' || p.last_name AS investor_name,
      f.code AS fund_code
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    JOIN funds f ON f.id = ip.fund_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'ADJUSTMENT', 'INTERNAL_CREDIT', 'FEE_CREDIT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -t.amount
          WHEN t.type = 'IB_CREDIT' THEN t.amount  -- IB_CREDIT goes to IB, not deducted from investor
          ELSE 0
        END
      ), 0) AS ledger_total
      FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = ip.fund_id
        AND t.is_voided = false
    ) ledger ON true
    WHERE ip.investor_id = ANY(v_investor_ids)
      AND ip.fund_id = ANY(v_fund_ids)
  LOOP
    v_check_count := v_check_count + 1;
    v_diff := abs(v_rec.actual_position - v_rec.expected_position);

    IF v_diff > 0 THEN
      v_mismatch_count := v_mismatch_count + 1;
      v_mismatches := v_mismatches || jsonb_build_object(
        'investor_id', v_rec.investor_id,
        'investor_name', v_rec.investor_name,
        'fund_id', v_rec.fund_id,
        'fund_code', v_rec.fund_code,
        'actual_position', v_rec.actual_position,
        'expected_position', v_rec.expected_position,
        'difference', v_diff,
        'root_cause', CASE
          WHEN v_diff < 0.01 THEN 'PRECISION_BUG'
          ELSE 'CONSERVATION_VIOLATION'
        END
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- 3. Validate Fund AUM = SUM(investor positions)
  -- =========================================================================
  FOR v_rec IN
    SELECT
      f.id AS fund_id,
      f.code AS fund_code,
      COALESCE(fda.total_aum, 0) AS recorded_aum,
      COALESCE(pos_sum.total_positions, 0) AS sum_positions
    FROM funds f
    LEFT JOIN LATERAL (
      SELECT total_aum
      FROM fund_daily_aum
      WHERE fund_id = f.id
      ORDER BY aum_date DESC
      LIMIT 1
    ) fda ON true
    LEFT JOIN LATERAL (
      SELECT SUM(current_value) AS total_positions
      FROM investor_positions
      WHERE fund_id = f.id AND is_active = true
    ) pos_sum ON true
    WHERE f.id = ANY(v_fund_ids)
  LOOP
    v_check_count := v_check_count + 1;
    v_diff := abs(v_rec.recorded_aum - v_rec.sum_positions);

    IF v_diff > 0 AND v_rec.recorded_aum > 0 THEN
      v_mismatch_count := v_mismatch_count + 1;
      v_mismatches := v_mismatches || jsonb_build_object(
        'fund_id', v_rec.fund_id,
        'fund_code', v_rec.fund_code,
        'recorded_aum', v_rec.recorded_aum,
        'sum_positions', v_rec.sum_positions,
        'difference', v_diff,
        'root_cause', 'AUM_POSITION_MISMATCH'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- 4. Record results
  -- =========================================================================
  INSERT INTO qa_test_results (run_tag, test_category, test_name, status, details)
  VALUES (
    p_run_tag,
    'reference_model',
    'Position vs Ledger Reconciliation',
    CASE WHEN v_mismatch_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    jsonb_build_object(
      'checks', v_check_count,
      'mismatches', v_mismatch_count,
      'details', v_mismatches
    )
  );

  RETURN jsonb_build_object(
    'success', v_mismatch_count = 0,
    'run_tag', p_run_tag,
    'validated_at', now(),
    'checks', v_check_count,
    'mismatches', v_mismatch_count,
    'mismatch_details', v_mismatches
  );
END;
$$;
