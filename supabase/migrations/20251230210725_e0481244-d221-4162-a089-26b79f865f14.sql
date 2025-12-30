-- ============================================================================
-- Migration: Batch Transaction RPC for Investor Wizard
-- P1-5: Atomic batch creation of initial transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_create_transactions_batch(
  p_requests jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_request jsonb;
  v_results jsonb := '[]'::jsonb;
  v_created_count integer := 0;
  v_skipped_count integer := 0;
  v_tx_id uuid;
  v_investor_id uuid;
  v_fund_id uuid;
  v_type text;
  v_amount numeric;
  v_tx_date date;
  v_notes text;
  v_ref_id text;
BEGIN
  -- Validate admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'code', 'AUTH_REQUIRED');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required', 'code', 'ADMIN_REQUIRED');
  END IF;

  -- Process each request
  FOR v_request IN SELECT * FROM jsonb_array_elements(p_requests)
  LOOP
    v_investor_id := (v_request->>'investor_id')::uuid;
    v_fund_id := (v_request->>'fund_id')::uuid;
    v_type := COALESCE(v_request->>'type', 'DEPOSIT');
    v_amount := (v_request->>'amount')::numeric;
    v_tx_date := COALESCE((v_request->>'tx_date')::date, CURRENT_DATE);
    v_notes := v_request->>'notes';
    v_ref_id := v_request->>'reference_id';

    -- Validate required fields
    IF v_investor_id IS NULL OR v_fund_id IS NULL OR v_amount IS NULL THEN
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'error',
        'reason', 'Missing required fields: investor_id, fund_id, or amount'
      );
      CONTINUE;
    END IF;

    -- Check idempotency via reference_id
    IF v_ref_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref_id AND NOT is_voided
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'skipped',
        'reason', 'already_exists'
      );
      CONTINUE;
    END IF;

    -- Get fund asset
    DECLARE
      v_asset text;
    BEGIN
      SELECT asset INTO v_asset FROM funds WHERE id = v_fund_id;
      IF v_asset IS NULL THEN
        v_results := v_results || jsonb_build_object(
          'reference_id', v_ref_id,
          'status', 'error',
          'reason', 'Fund not found'
        );
        CONTINUE;
      END IF;

      -- Create transaction
      INSERT INTO transactions_v2 (
        investor_id,
        fund_id,
        type,
        asset,
        amount,
        tx_date,
        value_date,
        notes,
        source,
        is_system_generated,
        reference_id,
        visibility_scope,
        created_by
      ) VALUES (
        v_investor_id,
        v_fund_id,
        v_type,
        v_asset,
        v_amount,
        v_tx_date,
        v_tx_date,
        v_notes,
        'investor_wizard_batch',
        false,
        v_ref_id,
        'investor_visible',
        v_admin_id
      ) RETURNING id INTO v_tx_id;

      -- Update or create position
      INSERT INTO investor_positions (
        investor_id,
        fund_id,
        current_value,
        cost_basis,
        shares,
        fund_class
      ) VALUES (
        v_investor_id,
        v_fund_id,
        CASE WHEN v_type IN ('DEPOSIT', 'INTEREST', 'IB_COMMISSION') THEN v_amount ELSE -v_amount END,
        v_amount,
        0,
        v_asset
      )
      ON CONFLICT (investor_id, fund_id) 
      DO UPDATE SET 
        current_value = investor_positions.current_value + 
          CASE WHEN v_type IN ('DEPOSIT', 'INTEREST', 'IB_COMMISSION') THEN v_amount ELSE -v_amount END,
        cost_basis = investor_positions.cost_basis + 
          CASE WHEN v_type = 'DEPOSIT' THEN v_amount ELSE 0 END,
        updated_at = now();

      v_created_count := v_created_count + 1;
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'created',
        'transaction_id', v_tx_id
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'skipped_count', v_skipped_count,
    'results', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_transactions_batch TO authenticated;