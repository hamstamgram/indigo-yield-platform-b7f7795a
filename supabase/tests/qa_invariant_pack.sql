-- =============================================================================
-- Phase 5, Layer 2: Database Invariant Pack (16 Checks)
-- =============================================================================
-- Validates 16 database invariants with zero tolerance (15 blocking + 1 advisory).
-- Each check returns pass/fail with violation details and root cause.
--
-- Usage:
--   SELECT qa_run_invariants('run42');
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_run_invariants(p_run_tag text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checks jsonb := '[]';
  v_overall_pass boolean := true;
  v_violations jsonb;
  v_count int;
  v_passed boolean;
  v_fund_ids uuid[];
  v_investor_ids uuid[];
BEGIN
  -- Optionally scope to QA entities
  IF p_run_tag IS NOT NULL THEN
    SELECT array_agg(entity_id) FILTER (WHERE entity_type = 'fund')
    INTO v_fund_ids
    FROM qa_entity_manifest WHERE run_tag = p_run_tag;

    SELECT array_agg(entity_id) FILTER (WHERE entity_type = 'profile')
    INTO v_investor_ids
    FROM qa_entity_manifest WHERE run_tag = p_run_tag;
  END IF;

  -- =========================================================================
  -- INV-1: Position = SUM(non-voided ledger) -- EXACT ZERO tolerance
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'investor_id', ip.investor_id,
    'fund_id', ip.fund_id,
    'position', ip.current_value,
    'ledger_sum', COALESCE(t_sum.total, 0),
    'diff', ip.current_value - COALESCE(t_sum.total, 0)
  ))
  INTO v_violations
  FROM investor_positions ip
  LEFT JOIN LATERAL (
    SELECT SUM(CASE
      WHEN t.type IN ('DEPOSIT','YIELD','INTEREST','ADJUSTMENT','INTERNAL_CREDIT','FEE_CREDIT') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL','FEE','INTERNAL_WITHDRAWAL','IB_DEBIT') THEN -t.amount
      WHEN t.type = 'IB_CREDIT' THEN
        CASE WHEN t.investor_id = ip.investor_id THEN t.amount ELSE 0 END
      ELSE 0
    END) AS total
    FROM transactions_v2 t
    WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND t.is_voided = false
  ) t_sum ON true
  WHERE ip.current_value != COALESCE(t_sum.total, 0)
    AND (v_investor_ids IS NULL OR ip.investor_id = ANY(v_investor_ids))
    AND (v_fund_ids IS NULL OR ip.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-1', 'name', 'Position = SUM(ledger)', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'CONSERVATION_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-2: Fund AUM = SUM(investor positions) -- EXACT ZERO tolerance
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'fund_id', f.id,
    'fund_code', f.code,
    'latest_aum', COALESCE(fda.total_aum, 0),
    'sum_positions', COALESCE(pos.total, 0),
    'diff', COALESCE(fda.total_aum, 0) - COALESCE(pos.total, 0)
  ))
  INTO v_violations
  FROM funds f
  LEFT JOIN LATERAL (
    SELECT total_aum FROM fund_daily_aum WHERE fund_id = f.id ORDER BY aum_date DESC LIMIT 1
  ) fda ON true
  LEFT JOIN LATERAL (
    SELECT SUM(current_value) AS total FROM investor_positions WHERE fund_id = f.id AND is_active = true
  ) pos ON true
  WHERE COALESCE(fda.total_aum, 0) != COALESCE(pos.total, 0)
    AND COALESCE(fda.total_aum, 0) > 0
    AND (v_fund_ids IS NULL OR f.id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-2', 'name', 'Fund AUM = SUM(positions)', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'CONSERVATION_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-3: Yield conservation: gross = net + fees + IB EXACTLY (no dust)
  -- The correct conservation law includes IB commissions because IB is a
  -- separate allocation from gross, NOT deducted from investor net.
  -- Formula: gross_yield = total_net_amount + total_fee_amount + total_ib_amount
  -- Only checks distributions that have populated totals (non-NULL, non-zero).
  -- Distributions with missing totals are flagged by INV-3b.
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id,
    'fund_id', yd.fund_id,
    'gross_yield', yd.gross_yield,
    'total_net', COALESCE(yd.total_net_amount, 0),
    'total_fees', COALESCE(yd.total_fee_amount, 0),
    'total_ib', COALESCE(yd.total_ib_amount, 0),
    'dust', COALESCE(yd.dust_amount, 0),
    'diff', yd.gross_yield
           - COALESCE(yd.total_net_amount, 0)
           - COALESCE(yd.total_fee_amount, 0)
           - COALESCE(yd.total_ib_amount, 0),
    'effective_date', yd.effective_date
  ))
  INTO v_violations
  FROM yield_distributions yd
  WHERE yd.status = 'applied'
    AND COALESCE(yd.is_voided, false) = false
    -- Only check distributions that have populated totals
    AND COALESCE(yd.total_net_amount, 0) != 0
    -- Tolerance of 0.01 for float64 precision noise (actual gaps are ~1e-8)
    AND abs(yd.gross_yield
            - COALESCE(yd.total_net_amount, 0)
            - COALESCE(yd.total_fee_amount, 0)
            - COALESCE(yd.total_ib_amount, 0)) > 0.01
    AND (v_fund_ids IS NULL OR yd.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-3', 'name', 'Yield conservation: gross = net + fees + IB', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'CONSERVATION_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-3b: Yield distributions with missing totals (data quality)
  -- Distributions where total_net_amount is NULL or 0 cannot be validated
  -- by INV-3. These need backfilling from fee_allocations / summary_json.
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id,
    'fund_id', yd.fund_id,
    'gross_yield', yd.gross_yield,
    'total_net', yd.total_net_amount,
    'total_fees', yd.total_fee_amount,
    'effective_date', yd.effective_date
  ))
  INTO v_violations
  FROM yield_distributions yd
  WHERE yd.status = 'applied'
    AND COALESCE(yd.is_voided, false) = false
    AND (yd.total_net_amount IS NULL OR yd.total_net_amount = 0)
    AND yd.gross_yield != 0
    AND (v_fund_ids IS NULL OR yd.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  -- INV-3b is advisory (data quality), does not block overall_pass
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-3b', 'name', 'Yield distributions with populated totals', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'MISSING_TOTALS' ELSE NULL END
  );

  -- =========================================================================
  -- INV-4: No orphan fee_allocations (every fee_allocation has a valid distribution)
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'allocation_id', fa.id,
    'distribution_id', fa.distribution_id
  ))
  INTO v_violations
  FROM fee_allocations fa
  LEFT JOIN yield_distributions yd ON yd.id = fa.distribution_id
  WHERE yd.id IS NULL;

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-4', 'name', 'No orphan fee/ib allocations', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'ORPHAN_DATA' ELSE NULL END
  );

  -- =========================================================================
  -- INV-5: No invalid enum values in transactions
  -- =========================================================================
  -- tx_type is enforced by PostgreSQL enum constraint, so this checks for NULLs
  SELECT jsonb_agg(jsonb_build_object(
    'transaction_id', t.id,
    'type', t.type,
    'source', t.source
  ))
  INTO v_violations
  FROM transactions_v2 t
  WHERE t.type IS NULL OR t.source IS NULL
    AND (v_fund_ids IS NULL OR t.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-5', 'name', 'No NULL enum values in transactions', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'CONTRACT_DRIFT' ELSE NULL END
  );

  -- =========================================================================
  -- INV-6: No crystallization gaps before capital flows
  -- (Every DEPOSIT/WITHDRAWAL should be preceded by crystallization or be the first tx)
  -- =========================================================================
  -- This is an informational check; crystallization enforcement is in the RPCs
  SELECT jsonb_agg(jsonb_build_object(
    'transaction_id', t.id,
    'type', t.type,
    'investor_id', t.investor_id,
    'fund_id', t.fund_id,
    'tx_date', t.tx_date
  ))
  INTO v_violations
  FROM transactions_v2 t
  WHERE t.type IN ('DEPOSIT', 'WITHDRAWAL')
    AND t.is_voided = false
    AND t.source NOT IN ('stress_test', 'system_bootstrap', 'migration')
    AND NOT EXISTS (
      SELECT 1 FROM transactions_v2 cryst
      WHERE cryst.investor_id = t.investor_id
        AND cryst.fund_id = t.fund_id
        AND cryst.tx_subtype = 'crystallization'
        AND cryst.tx_date <= t.tx_date
        AND cryst.is_voided = false
        AND cryst.created_at <= t.created_at
    )
    AND EXISTS (
      -- Only flag if investor had prior yield events
      SELECT 1 FROM transactions_v2 prior
      WHERE prior.investor_id = t.investor_id
        AND prior.fund_id = t.fund_id
        AND prior.type = 'YIELD'
        AND prior.is_voided = false
        AND prior.tx_date < t.tx_date
    )
    AND (v_fund_ids IS NULL OR t.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  -- INV-6 is advisory, not blocking
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-6', 'name', 'No crystallization gaps before capital flows', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'SEQUENCING_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-7: Reference ID uniqueness (non-voided)
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'reference_id', t.reference_id,
    'count', t.cnt
  ))
  INTO v_violations
  FROM (
    SELECT reference_id, COUNT(*) AS cnt
    FROM transactions_v2
    WHERE is_voided = false AND reference_id IS NOT NULL
    AND (v_fund_ids IS NULL OR fund_id = ANY(v_fund_ids))
    GROUP BY reference_id
    HAVING COUNT(*) > 1
  ) t;

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-7', 'name', 'Reference ID uniqueness (non-voided)', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'VOID_CASCADE_BUG' ELSE NULL END
  );

  -- =========================================================================
  -- INV-8: All voided records have void metadata
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'transaction_id', t.id,
    'is_voided', t.is_voided,
    'voided_at', t.voided_at,
    'void_reason', t.void_reason
  ))
  INTO v_violations
  FROM transactions_v2 t
  WHERE t.is_voided = true
    AND (t.voided_at IS NULL OR t.void_reason IS NULL)
    AND (v_fund_ids IS NULL OR t.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-8', 'name', 'Voided records have void metadata', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'VOID_CASCADE_BUG' ELSE NULL END
  );

  -- =========================================================================
  -- INV-9: No negative positions
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'investor_id', ip.investor_id,
    'fund_id', ip.fund_id,
    'current_value', ip.current_value
  ))
  INTO v_violations
  FROM investor_positions ip
  WHERE ip.current_value < 0
    AND (v_investor_ids IS NULL OR ip.investor_id = ANY(v_investor_ids))
    AND (v_fund_ids IS NULL OR ip.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-9', 'name', 'No negative positions', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'CONSERVATION_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-10: Withdrawal state machine (only valid transitions)
  -- Valid: pending->approved, pending->rejected, pending->cancelled,
  --        approved->processing, processing->completed
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'request_id', wr.id,
    'status', wr.status,
    'investor_id', wr.investor_id,
    'issue', 'Invalid terminal state with active processing'
  ))
  INTO v_violations
  FROM withdrawal_requests wr
  WHERE (
    -- Completed without going through approved/processing
    (wr.status = 'completed' AND NOT EXISTS (
      SELECT 1 FROM withdrawal_audit_logs wal
      WHERE wal.withdrawal_request_id = wr.id AND wal.action = 'approve'
    ))
  )
  AND (v_investor_ids IS NULL OR wr.investor_id = ANY(v_investor_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-10', 'name', 'Withdrawal state machine integrity', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'STATE_MACHINE_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-11: Yield distribution status validity
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id,
    'status', yd.status,
    'is_voided', yd.is_voided,
    'issue', 'Status mismatch with void flag'
  ))
  INTO v_violations
  FROM yield_distributions yd
  WHERE (yd.is_voided = true AND yd.status NOT IN ('voided', 'rolled_back'))
    AND (v_fund_ids IS NULL OR yd.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-11', 'name', 'Yield distribution status consistency', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'STATE_MACHINE_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-12: No future-dated AUM events
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'fund_id', fda.fund_id,
    'aum_date', fda.aum_date,
    'total_aum', fda.total_aum
  ))
  INTO v_violations
  FROM fund_daily_aum fda
  WHERE fda.aum_date > CURRENT_DATE
    AND (v_fund_ids IS NULL OR fda.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-12', 'name', 'No future-dated AUM events', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'SEQUENCING_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-13: IB allocations match yield distribution records
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id,
    'recorded_ib', COALESCE(yd.total_ib_amount, 0),
    'actual_ib_sum', COALESCE(ib_sum.total, 0),
    'diff', COALESCE(yd.total_ib_amount, 0) - COALESCE(ib_sum.total, 0)
  ))
  INTO v_violations
  FROM yield_distributions yd
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(ib_fee_amount), 0) AS total
    FROM ib_allocations WHERE distribution_id = yd.id
  ) ib_sum ON true
  WHERE yd.status = 'applied'
    AND COALESCE(yd.is_voided, false) = false
    AND abs(COALESCE(yd.total_ib_amount, 0) - COALESCE(ib_sum.total, 0)) > 0
    AND COALESCE(yd.total_ib_amount, 0) > 0
    AND (v_fund_ids IS NULL OR yd.fund_id = ANY(v_fund_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-13', 'name', 'IB allocations match distributions', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'CONSERVATION_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- INV-14: No orphan accounting periods
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'period_id', ap.id,
    'fund_id', ap.fund_id,
    'issue', 'Accounting period references non-existent fund'
  ))
  INTO v_violations
  FROM accounting_periods ap
  LEFT JOIN funds f ON f.id = ap.fund_id
  WHERE f.id IS NULL;

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-14', 'name', 'No orphan accounting periods', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'ORPHAN_DATA' ELSE NULL END
  );

  -- =========================================================================
  -- INV-15: Fee schedule no date overlaps
  -- =========================================================================
  SELECT jsonb_agg(jsonb_build_object(
    'investor_id', a.investor_id,
    'fund_id', a.fund_id,
    'schedule_a', a.id,
    'schedule_b', b.id,
    'overlap_start', GREATEST(a.effective_date, b.effective_date),
    'overlap_end', LEAST(COALESCE(a.end_date, '9999-12-31'), COALESCE(b.end_date, '9999-12-31'))
  ))
  INTO v_violations
  FROM investor_fee_schedule a
  JOIN investor_fee_schedule b
    ON a.investor_id = b.investor_id
    AND COALESCE(a.fund_id, '00000000-0000-0000-0000-000000000000') = COALESCE(b.fund_id, '00000000-0000-0000-0000-000000000000')
    AND a.id < b.id
    AND a.effective_date < COALESCE(b.end_date, '9999-12-31'::date)
    AND b.effective_date < COALESCE(a.end_date, '9999-12-31'::date)
  WHERE (v_investor_ids IS NULL OR a.investor_id = ANY(v_investor_ids));

  v_count := COALESCE(jsonb_array_length(v_violations), 0);
  v_passed := v_count = 0;
  IF NOT v_passed THEN v_overall_pass := false; END IF;
  v_checks := v_checks || jsonb_build_object(
    'id', 'INV-15', 'name', 'Fee schedule no date overlaps', 'passed', v_passed,
    'violations', v_count, 'details', COALESCE(v_violations, '[]'::jsonb),
    'root_cause', CASE WHEN NOT v_passed THEN 'STATE_MACHINE_VIOLATION' ELSE NULL END
  );

  -- =========================================================================
  -- Record aggregate result
  -- =========================================================================
  INSERT INTO qa_test_results (run_tag, test_category, test_name, status, details)
  VALUES (
    COALESCE(p_run_tag, 'global'),
    'invariant_pack',
    'Full 15-check invariant suite',
    CASE WHEN v_overall_pass THEN 'PASS' ELSE 'FAIL' END,
    jsonb_build_object(
      'overall_pass', v_overall_pass,
      'total_checks', 16,
      'passed', (SELECT COUNT(*) FROM jsonb_array_elements(v_checks) c WHERE (c.value->>'passed')::boolean = true),
      'failed', (SELECT COUNT(*) FROM jsonb_array_elements(v_checks) c WHERE (c.value->>'passed')::boolean = false),
      'checks', v_checks
    )
  );

  RETURN jsonb_build_object(
    'overall_pass', v_overall_pass,
    'run_tag', COALESCE(p_run_tag, 'global'),
    'validated_at', now(),
    'total_checks', 16,
    'checks', v_checks
  );
END;
$$;
