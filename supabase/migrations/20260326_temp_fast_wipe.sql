-- Temporary fast wipe function - creates, runs, then drops itself
CREATE OR REPLACE FUNCTION _fast_wipe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_count int;
  v_yd_count int;
  v_ip_count int;
BEGIN
  -- Set backfill mode
  UPDATE system_config SET value = '"backfill"' WHERE key = 'system_mode';

  -- Bypass canonical mutation guard
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Delete children first
  DELETE FROM ib_commission_ledger;
  DELETE FROM ib_allocations;
  DELETE FROM fee_allocations;
  DELETE FROM yield_allocations;
  DELETE FROM fund_daily_aum;
  DELETE FROM withdrawal_requests;
  DELETE FROM statement_periods;

  -- Delete protected tables (canonical_rpc bypass active)
  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_tx_count = ROW_COUNT;

  DELETE FROM yield_distributions;
  GET DIAGNOSTICS v_yd_count = ROW_COUNT;

  DELETE FROM investor_positions;
  GET DIAGNOSTICS v_ip_count = ROW_COUNT;

  -- Restore system mode
  UPDATE system_config SET value = '"live"' WHERE key = 'system_mode';

  RETURN jsonb_build_object(
    'transactions_deleted', v_tx_count,
    'distributions_deleted', v_yd_count,
    'positions_deleted', v_ip_count
  );
END;
$$;
