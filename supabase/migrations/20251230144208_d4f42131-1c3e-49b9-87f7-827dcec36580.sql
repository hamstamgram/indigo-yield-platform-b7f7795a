-- Drop and recreate the run_data_integrity_check function - fix orphan transaction check
DROP FUNCTION IF EXISTS public.run_data_integrity_check();

CREATE FUNCTION public.run_data_integrity_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{"checks": [], "run_at": null, "summary": {}}'::jsonb;
  check_result jsonb;
  position_mismatch_count int := 0;
  pnl_error_count int := 0;
  orphan_tx_count int := 0;
  missing_aum_count int := 0;
  duplicate_ref_count int := 0;
BEGIN
  result := jsonb_set(result, '{run_at}', to_jsonb(now()));

  -- Check 1: Position-Transaction Mismatches
  SELECT COUNT(*) INTO position_mismatch_count
  FROM (
    SELECT 
      ip.investor_id,
      ip.fund_id,
      ip.current_value as position_value,
      COALESCE(SUM(
        CASE 
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
          ELSE 0
        END
      ), 0) as tx_sum
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id 
      AND t.fund_id = ip.fund_id 
      AND t.is_voided = false
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(ip.current_value - COALESCE(SUM(
      CASE 
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
        ELSE 0
      END
    ), 0)) > 0.01
  ) mismatches;

  check_result := jsonb_build_object(
    'name', 'position_transaction_reconciliation',
    'status', CASE WHEN position_mismatch_count = 0 THEN 'ok' ELSE 'error' END,
    'count', position_mismatch_count,
    'message', CASE WHEN position_mismatch_count = 0 
      THEN 'All positions reconcile with transactions' 
      ELSE format('%s positions have value mismatches', position_mismatch_count)
    END
  );
  result := jsonb_set(result, '{checks}', result->'checks' || check_result);

  -- Check 2: Unrealized P&L Calculation Errors
  SELECT COUNT(*) INTO pnl_error_count
  FROM investor_positions
  WHERE ABS(COALESCE(unrealized_pnl, 0) - (current_value - cost_basis)) > 0.01;

  check_result := jsonb_build_object(
    'name', 'unrealized_pnl_accuracy',
    'status', CASE WHEN pnl_error_count = 0 THEN 'ok' ELSE 'warning' END,
    'count', pnl_error_count,
    'message', CASE WHEN pnl_error_count = 0 
      THEN 'All unrealized P&L values are correct' 
      ELSE format('%s positions have incorrect unrealized P&L', pnl_error_count)
    END
  );
  result := jsonb_set(result, '{checks}', result->'checks' || check_result);

  -- Check 3: Orphan Transactions (no matching position) - FIXED: use investor_id not id
  SELECT COUNT(*) INTO orphan_tx_count
  FROM transactions_v2 t
  LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
  WHERE t.is_voided = false
    AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
    AND ip.investor_id IS NULL;

  check_result := jsonb_build_object(
    'name', 'orphan_transactions',
    'status', CASE WHEN orphan_tx_count = 0 THEN 'ok' ELSE 'warning' END,
    'count', orphan_tx_count,
    'message', CASE WHEN orphan_tx_count = 0 
      THEN 'No orphan transactions found' 
      ELSE format('%s transactions have no matching position', orphan_tx_count)
    END
  );
  result := jsonb_set(result, '{checks}', result->'checks' || check_result);

  -- Check 4: Active Funds Missing AUM Records
  SELECT COUNT(*) INTO missing_aum_count
  FROM funds f
  LEFT JOIN fund_daily_aum fda ON fda.fund_id = f.id AND fda.is_voided = false
  WHERE f.status = 'active'
  GROUP BY f.id
  HAVING COUNT(fda.id) = 0;

  check_result := jsonb_build_object(
    'name', 'missing_fund_aum',
    'status', CASE WHEN missing_aum_count = 0 THEN 'ok' ELSE 'warning' END,
    'count', COALESCE(missing_aum_count, 0),
    'message', CASE WHEN COALESCE(missing_aum_count, 0) = 0 
      THEN 'All active funds have AUM records' 
      ELSE format('%s active funds have no AUM records', missing_aum_count)
    END
  );
  result := jsonb_set(result, '{checks}', result->'checks' || check_result);

  -- Check 5: Duplicate Transaction Reference IDs
  SELECT COUNT(*) INTO duplicate_ref_count
  FROM (
    SELECT reference_id
    FROM transactions_v2
    WHERE reference_id IS NOT NULL AND is_voided = false
    GROUP BY reference_id
    HAVING COUNT(*) > 1
  ) dups;

  check_result := jsonb_build_object(
    'name', 'duplicate_reference_ids',
    'status', CASE WHEN duplicate_ref_count = 0 THEN 'ok' ELSE 'error' END,
    'count', duplicate_ref_count,
    'message', CASE WHEN duplicate_ref_count = 0 
      THEN 'No duplicate reference IDs found' 
      ELSE format('%s duplicate reference IDs detected', duplicate_ref_count)
    END
  );
  result := jsonb_set(result, '{checks}', result->'checks' || check_result);

  -- Summary
  result := jsonb_set(result, '{summary}', jsonb_build_object(
    'total_checks', 5,
    'errors', (
      (CASE WHEN position_mismatch_count > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN duplicate_ref_count > 0 THEN 1 ELSE 0 END)
    ),
    'warnings', (
      (CASE WHEN pnl_error_count > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN orphan_tx_count > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(missing_aum_count, 0) > 0 THEN 1 ELSE 0 END)
    ),
    'passed', 5 - (
      (CASE WHEN position_mismatch_count > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN duplicate_ref_count > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN pnl_error_count > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN orphan_tx_count > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(missing_aum_count, 0) > 0 THEN 1 ELSE 0 END)
    )
  ));

  RETURN result;
END;
$$;