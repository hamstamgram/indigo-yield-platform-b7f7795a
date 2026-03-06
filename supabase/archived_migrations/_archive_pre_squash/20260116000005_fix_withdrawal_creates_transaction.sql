-- ============================================================================
-- P0 FIX: Withdrawal Completion Must Create Ledger Transaction
-- Date: 2026-01-16
-- Issue: complete_withdrawal() only updates status but NEVER creates a
--        WITHDRAWAL transaction in transactions_v2 or updates investor_positions.
--        This causes position drift where balances don't decrease after withdrawals.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Fix complete_withdrawal to create transaction and update position
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id uuid,
  p_tx_hash text DEFAULT NULL::text,
  p_admin_notes text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_fund RECORD;
  v_current_position numeric(28,10);
  v_new_position numeric(28,10);
  v_tx_id uuid;
  v_admin_id uuid;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  v_admin_id := auth.uid();

  -- Get request details with fund info
  SELECT
    wr.*,
    f.asset AS fund_asset,
    f.code AS fund_code
  INTO v_request
  FROM public.withdrawal_requests wr
  JOIN public.funds f ON f.id = wr.fund_id
  WHERE wr.id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status != 'processing' THEN
    RAISE EXCEPTION 'Can only complete requests in processing. Current status: %', v_request.status;
  END IF;

  -- Get current investor position
  SELECT current_value INTO v_current_position
  FROM investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  v_current_position := COALESCE(v_current_position, 0);
  v_new_position := v_current_position - ABS(v_request.processed_amount);

  -- =========================================================================
  -- CRITICAL FIX: Create WITHDRAWAL transaction in ledger
  -- =========================================================================
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_date,
    value_date,
    asset,
    amount,
    type,
    balance_before,
    balance_after,
    tx_hash,
    reference_id,
    notes,
    approved_by,
    approved_at,
    created_by,
    is_voided
  ) VALUES (
    v_request.investor_id,
    v_request.fund_id,
    COALESCE(v_request.settlement_date, CURRENT_DATE),
    COALESCE(v_request.settlement_date, CURRENT_DATE),
    v_request.fund_asset,
    -ABS(v_request.processed_amount),  -- Negative for withdrawal
    'WITHDRAWAL'::tx_type,
    v_current_position,
    v_new_position,
    COALESCE(p_tx_hash, v_request.tx_hash),
    'WR-' || v_request.id::text,  -- Reference back to withdrawal request
    COALESCE(p_admin_notes, 'Withdrawal completed'),
    v_admin_id,
    NOW(),
    v_admin_id,
    false
  )
  RETURNING id INTO v_tx_id;

  -- =========================================================================
  -- CRITICAL FIX: Update investor position
  -- =========================================================================
  UPDATE investor_positions
  SET
    current_value = v_new_position,
    last_transaction_date = COALESCE(v_request.settlement_date, CURRENT_DATE),
    updated_at = NOW()
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  -- If no position exists, create one (edge case)
  IF NOT FOUND THEN
    INSERT INTO investor_positions (
      investor_id,
      fund_id,
      current_value,
      cost_basis,
      shares,
      last_transaction_date
    ) VALUES (
      v_request.investor_id,
      v_request.fund_id,
      v_new_position,
      0,
      0,
      COALESCE(v_request.settlement_date, CURRENT_DATE)
    );
  END IF;

  -- Update withdrawal request status
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action with transaction ID
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'tx_hash', COALESCE(p_tx_hash, v_request.tx_hash),
      'processed_amount', v_request.processed_amount,
      'transaction_id', v_tx_id,
      'position_before', v_current_position,
      'position_after', v_new_position,
      'admin_notes', p_admin_notes
    )
  );

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'WITHDRAWAL_COMPLETED',
    'withdrawal_requests',
    p_request_id::text,
    v_admin_id,
    jsonb_build_object(
      'transaction_id', v_tx_id,
      'amount', v_request.processed_amount,
      'position_before', v_current_position,
      'position_after', v_new_position
    )
  );

  RETURN TRUE;
END;
$function$;

COMMENT ON FUNCTION complete_withdrawal(uuid, text, text) IS
  'Complete a withdrawal request. Creates WITHDRAWAL transaction and updates investor position. ADMIN ONLY.';

-- ============================================================================
-- 2. Backfill function for existing completed withdrawals without transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_missing_withdrawal_transactions(
  p_admin_id uuid
)
RETURNS TABLE(
  request_id uuid,
  investor_id uuid,
  fund_id uuid,
  amount numeric,
  transaction_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wr RECORD;
  v_tx_id uuid;
  v_current_pos numeric;
  v_count integer := 0;
BEGIN
  -- Require admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin required for backfill';
  END IF;

  -- Find completed withdrawals without corresponding transactions
  FOR v_wr IN
    SELECT
      wr.id,
      wr.investor_id,
      wr.fund_id,
      wr.processed_amount,
      wr.settlement_date,
      wr.tx_hash,
      f.asset AS fund_asset,
      f.code AS fund_code
    FROM withdrawal_requests wr
    JOIN funds f ON f.id = wr.fund_id
    WHERE wr.status = 'completed'
      AND wr.processed_amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.reference_id = 'WR-' || wr.id::text
          AND t.type = 'WITHDRAWAL'
          AND t.is_voided = false
      )
    ORDER BY wr.request_date
  LOOP
    -- Get current position
    SELECT current_value INTO v_current_pos
    FROM investor_positions
    WHERE investor_positions.investor_id = v_wr.investor_id
      AND investor_positions.fund_id = v_wr.fund_id;

    v_current_pos := COALESCE(v_current_pos, 0);

    -- Create the missing transaction
    INSERT INTO transactions_v2 (
      investor_id,
      fund_id,
      tx_date,
      value_date,
      asset,
      amount,
      type,
      balance_before,
      balance_after,
      tx_hash,
      reference_id,
      notes,
      approved_by,
      approved_at,
      created_by,
      is_voided
    ) VALUES (
      v_wr.investor_id,
      v_wr.fund_id,
      COALESCE(v_wr.settlement_date, CURRENT_DATE),
      COALESCE(v_wr.settlement_date, CURRENT_DATE),
      v_wr.fund_asset,
      -ABS(v_wr.processed_amount),
      'WITHDRAWAL'::tx_type,
      v_current_pos,  -- Note: This is current, not historical
      v_current_pos - ABS(v_wr.processed_amount),
      v_wr.tx_hash,
      'WR-' || v_wr.id::text,
      'BACKFILL: Missing withdrawal transaction',
      p_admin_id,
      NOW(),
      p_admin_id,
      false
    )
    RETURNING id INTO v_tx_id;

    -- Update position
    UPDATE investor_positions
    SET
      current_value = current_value - ABS(v_wr.processed_amount),
      updated_at = NOW()
    WHERE investor_positions.investor_id = v_wr.investor_id
      AND investor_positions.fund_id = v_wr.fund_id;

    v_count := v_count + 1;

    -- Return info about what was fixed
    request_id := v_wr.id;
    investor_id := v_wr.investor_id;
    fund_id := v_wr.fund_id;
    amount := v_wr.processed_amount;
    transaction_id := v_tx_id;
    status := 'BACKFILLED';
    RETURN NEXT;
  END LOOP;

  -- Log the backfill operation
  IF v_count > 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
    VALUES (
      'BACKFILL_WITHDRAWAL_TRANSACTIONS',
      'transactions_v2',
      'batch',
      p_admin_id,
      jsonb_build_object('count', v_count, 'timestamp', NOW())
    );
  END IF;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION backfill_missing_withdrawal_transactions(uuid) IS
  'Find completed withdrawals without ledger transactions and create them. Returns list of fixed records. ADMIN ONLY.';

-- ============================================================================
-- 3. View to detect missing withdrawal transactions
-- ============================================================================

CREATE OR REPLACE VIEW public.v_missing_withdrawal_transactions AS
SELECT
  wr.id AS request_id,
  wr.investor_id,
  p.email AS investor_email,
  wr.fund_id,
  f.code AS fund_code,
  wr.processed_amount,
  wr.settlement_date,
  wr.request_date,
  wr.status
FROM withdrawal_requests wr
JOIN funds f ON f.id = wr.fund_id
JOIN profiles p ON p.id = wr.investor_id
WHERE wr.status = 'completed'
  AND wr.processed_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.reference_id = 'WR-' || wr.id::text
      AND t.type = 'WITHDRAWAL'
      AND t.is_voided = false
  );

COMMENT ON VIEW v_missing_withdrawal_transactions IS
  'Shows completed withdrawals that are missing ledger transactions. Empty = healthy.';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION backfill_missing_withdrawal_transactions(uuid) TO authenticated;
GRANT SELECT ON v_missing_withdrawal_transactions TO authenticated;

COMMIT;
