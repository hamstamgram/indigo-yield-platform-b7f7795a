-- Migration: Add advisory locks to void_yield_distribution (P1) and apply_investor_transaction 9-param (P2)
-- Also creates missing recalculate_fund_aum_for_date function (P2)

-- =============================================================================
-- 1. PATCH void_yield_distribution: Add pg_advisory_xact_lock
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."void_yield_distribution"(
  "p_distribution_id" "uuid",
  "p_admin_id" "uuid",
  "p_reason" "text" DEFAULT 'Administrative void'::"text",
  "p_void_crystals" boolean DEFAULT false
) RETURNS json
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_dist RECORD; v_voided_txs int := 0; v_voided_allocs int := 0; v_voided_crystals int := 0; v_crystal RECORD; v_tx RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- P1 FIX: Advisory lock to prevent concurrent void of the same distribution
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE investor_yield_events SET is_voided = true WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%' AND is_voided = false;
      UPDATE fund_aum_events SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE fund_id = v_dist.fund_id AND trigger_reference LIKE '%' || v_crystal.id::text || '%' AND NOT is_voided;
      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = 'Cascade void from distribution ' || p_distribution_id::text, consolidated_into_id = NULL WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  FOR v_tx IN SELECT id, investor_id, amount FROM transactions_v2 WHERE (reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%' OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%') AND NOT is_voided
  LOOP UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id; v_voided_txs := v_voided_txs + 1; END LOOP;

  FOR v_tx IN SELECT id FROM transactions_v2 WHERE (reference_id = 'fee_credit_' || p_distribution_id::text OR reference_id = 'fee_credit_v5_' || p_distribution_id::text) AND NOT is_voided
  LOOP UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id; v_voided_txs := v_voided_txs + 1; END LOOP;

  FOR v_tx IN SELECT id FROM transactions_v2 WHERE (reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%' OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%') AND NOT is_voided
  LOOP UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id; v_voided_txs := v_voided_txs + 1; END LOOP;

  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason WHERE id = p_distribution_id;

  UPDATE investor_yield_events SET is_voided = true WHERE trigger_transaction_id IN (SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true) AND NOT is_voided;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals, 'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id)
  );

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id, 'voided_transactions', v_voided_txs, 'voided_crystals', v_voided_crystals);
END;
$$;

-- =============================================================================
-- 2. PATCH apply_investor_transaction 9-param: Add pg_advisory_xact_lock
-- =============================================================================
CREATE OR REPLACE FUNCTION public.apply_investor_transaction(
    p_fund_id uuid,
    p_investor_id uuid,
    p_tx_type tx_type,
    p_amount numeric,
    p_tx_date date,
    p_reference_id text,
    p_admin_id uuid,
    p_notes text DEFAULT NULL::text,
    p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_fund record;
    v_transaction_id uuid;
    v_investor_lock_key bigint;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- Type-aware amount guard
    IF p_amount <= 0 AND p_tx_type NOT IN (
      'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST', 'FEE'
    ) THEN
        RAISE EXCEPTION 'Amount must be positive for % transactions', p_tx_type
          USING ERRCODE = 'P0001';
    END IF;

    IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST', 'FEE', 'ADJUSTMENT') THEN
        RAISE EXCEPTION 'Invalid transaction type for this function: %', p_tx_type USING ERRCODE = 'P0002';
    END IF;

    -- P2 FIX: Advisory lock to prevent concurrent submissions for same investor+fund
    v_investor_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_investor_lock_key);

    -- Fetch and lock fund
    SELECT * INTO v_fund
    FROM funds
    WHERE id = p_fund_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fund not found' USING ERRCODE = 'P0003';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_investor_id) THEN
        RAISE EXCEPTION 'Investor profile not found' USING ERRCODE = 'P0004';
    END IF;

    -- Idempotency check
    IF EXISTS (
        SELECT 1 FROM transactions_v2 
        WHERE fund_id = p_fund_id 
        AND investor_id = p_investor_id 
        AND tx_date = p_tx_date 
        AND type = p_tx_type 
        AND amount = p_amount
        AND notes LIKE '%' || p_reference_id || '%'
        AND NOT is_voided
    ) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Transaction already explicitly recorded (idempotent)',
            'reference_id', p_reference_id
        );
    END IF;

    INSERT INTO public.transactions_v2 (
        fund_id, investor_id, type, asset, amount, tx_date, created_by, notes, is_voided
    ) VALUES (
        p_fund_id, p_investor_id, p_tx_type, v_fund.asset, p_amount, p_tx_date,
        p_admin_id, COALESCE(p_notes, p_tx_type || ' - ' || p_reference_id), false
    ) RETURNING id INTO v_transaction_id;

    INSERT INTO public.audit_log (actor_user, action, entity, entity_id, new_values) VALUES (
        p_admin_id, 'apply_investor_transaction', 'transactions_v2', v_transaction_id::text,
        jsonb_build_object(
            'fund_id', p_fund_id, 'investor_id', p_investor_id, 'tx_type', p_tx_type,
            'amount', p_amount, 'tx_date', p_tx_date, 'reference_id', p_reference_id
        )
    );

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', p_tx_type || ' successfully applied'
    );
END;
$function$;

-- =============================================================================
-- 3. CREATE recalculate_fund_aum_for_date (P2 -- closes void-AUM-refresh gap)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_fund_aum_for_date(
    p_fund_id uuid,
    p_target_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_position_sum numeric;
    v_rows_affected int;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- Sum active investor positions for this fund
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_position_sum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    -- Upsert fund_daily_aum for the target date (transaction purpose)
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (
        p_fund_id,
        p_target_date,
        v_position_sum,
        'transaction'::aum_purpose,
        'position_recompute',
        auth.uid(),
        (extract(day from (p_target_date + interval '1 day')) = 1)
    )
    ON CONFLICT (fund_id, aum_date, purpose)
    WHERE NOT is_voided
    DO UPDATE SET
        total_aum = EXCLUDED.total_aum,
        source = 'position_recompute',
        updated_at = now();

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'fund_id', p_fund_id,
        'target_date', p_target_date,
        'computed_aum', v_position_sum,
        'rows_affected', v_rows_affected
    );
END;
$function$;