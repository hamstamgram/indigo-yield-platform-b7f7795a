-- =============================================================================
-- CRITICAL PRODUCTION FIXES — Execute via Supabase Dashboard SQL Editor
-- =============================================================================
-- Date: 2026-04-15
-- Target: nkfimvovosdehmyyjubn (INDIGO YIELD FUND)
--
-- INSTRUCTIONS:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire script
--   3. Click "Run" to execute
--   4. Verify results (see verification queries at bottom)
--
-- Fixes applied:
--   1. void_and_reissue_transaction: canonical_rpc flag before INSERT (P0)
--   2. void_and_reissue_full_exit: canonical_rpc flag before INSERT (P0)
--   3. void_yield_distribution: reference_id pattern match for yield_flat_ (P1)
--   4. v_liquidity_risk view recreated (after drop in batch_6)
--   5. v_concentration_risk view recreated (after drop)
--   6. migration history cleanup (for supabase CLI to work again)
-- =============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ FIX 1: void_and_reissue_transaction — canonical_rpc defense-in-depth     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION public.void_and_reissue_transaction(
  p_original_tx_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_new_date date,
  p_new_notes text DEFAULT NULL,
  p_new_tx_hash text DEFAULT NULL,
  p_closing_aum numeric DEFAULT NULL,
  p_reason text DEFAULT 'Void and reissue correction'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_position RECORD;
  v_void_result jsonb;
  v_new_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_computed_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_original_tx_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_original_tx_id;
  END IF;

  IF v_orig.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required';
  END IF;

  IF v_orig.is_system_generated THEN
    RAISE EXCEPTION 'Cannot void-and-reissue system-generated transactions (yield/fee/IB). Use void yield distribution instead.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_balance_before := COALESCE(v_position.current_value, 0);

  v_new_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, tx_subtype, amount, tx_date,
    notes, tx_hash, reference_id, correction_id,
    balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_tx_id,
    v_orig.investor_id,
    v_orig.fund_id,
    v_orig.type,
    v_orig.tx_subtype,
    p_new_amount,
    p_new_date,
    COALESCE(p_new_notes, v_orig.notes),
    COALESCE(p_new_tx_hash, v_orig.tx_hash),
    'reissue_' || p_original_tx_id::text,
    p_original_tx_id,
    v_balance_before,
    v_balance_before + p_new_amount,
    false,
    p_admin_id,
    NOW()
  );

  v_balance_after := v_balance_before + p_new_amount;

  UPDATE investor_positions
  SET current_value = current_value + p_new_amount,
      updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  IF NOT FOUND THEN
    INSERT INTO investor_positions (investor_id, fund_id, current_value, invested_amount, currency, updated_at)
    VALUES (v_orig.investor_id, v_orig.fund_id, p_new_amount, p_new_amount, v_orig.currency, NOW());
  END IF;

  IF p_closing_aum IS NOT NULL THEN
    v_computed_closing_aum := p_closing_aum;
  ELSE
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_computed_closing_aum
    FROM investor_positions
    WHERE fund_id = v_orig.fund_id;
  END IF;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_orig.fund_id, 'reissue', p_new_amount, v_computed_closing_aum,
    v_new_tx_id, v_orig.investor_id, p_new_date, p_admin_id
  );

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE', 'transactions_v2', v_new_tx_id::text, p_admin_id,
    jsonb_build_object(
      'original_tx_id', p_original_tx_id, 'original_amount', v_orig.amount,
      'original_date', v_orig.tx_date, 'original_type', v_orig.type
    ),
    jsonb_build_object(
      'new_tx_id', v_new_tx_id, 'new_amount', p_new_amount,
      'new_date', p_new_date, 'closing_aum', v_computed_closing_aum,
      'balance_before', v_balance_before, 'balance_after', v_balance_after
    ),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true, 'voided_tx_id', p_original_tx_id, 'new_tx_id', v_new_tx_id,
    'new_amount', p_new_amount, 'new_date', p_new_date,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'closing_aum', v_computed_closing_aum
  );
END;
$$;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ FIX 2: void_and_reissue_full_exit — canonical_rpc defense-in-depth      ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_reason text,
  p_new_date date DEFAULT NULL,
  p_send_precision text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_withdrawal_request RECORD;
  v_void_result jsonb;
  v_dust_sweep_count int := 0;
  v_investor_id uuid;
  v_fund_id uuid;
  v_asset text;
  v_original_amount numeric;
  v_restored_amount numeric;
  v_new_withdrawal_amount numeric;
  v_dust_amount numeric;
  v_new_withdrawal_tx_id uuid;
  v_dust_debit_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_balance_before numeric;
  v_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  v_investor_id := v_tx.investor_id;
  v_fund_id := v_tx.fund_id;
  v_asset := v_tx.asset;
  v_original_amount := ABS(v_tx.amount);

  SELECT * INTO v_withdrawal_request FROM withdrawal_requests
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id
    AND status IN ('completed', 'approved')
  ORDER BY created_at DESC LIMIT 1;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(amount), 0) INTO v_restored_amount
  FROM transactions_v2
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = false;

  IF v_restored_amount < 0 THEN v_restored_amount := 0; END IF;

  v_new_withdrawal_amount := LEAST(p_new_amount, v_restored_amount);
  v_dust_amount := GREATEST(v_restored_amount - v_new_withdrawal_amount, 0);

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  v_new_withdrawal_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, amount, tx_date,
    notes, reference_id, balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_withdrawal_tx_id, v_investor_id, v_fund_id,
    'WITHDRAWAL', -v_new_withdrawal_amount, COALESCE(p_new_date, v_tx.tx_date),
    'Full-exit reissue', 'reissue_full_' || p_transaction_id::text,
    v_balance_before, v_balance_before - v_new_withdrawal_amount,
    false, p_admin_id, NOW()
  );

  IF v_dust_amount > 0 THEN
    v_dust_debit_tx_id := gen_random_uuid();

    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, amount, tx_date,
      notes, reference_id, balance_before, balance_after,
      is_system_generated, created_by, created_at
    ) VALUES (
      v_dust_debit_tx_id, v_investor_id, v_fund_id,
      'DUST_SWEEP', -v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
      'Dust sweep reissue', 'dust-sweep-reissue-' || p_transaction_id::text,
      v_balance_before - v_new_withdrawal_amount, v_balance_before - v_new_withdrawal_amount - v_dust_amount,
      false, p_admin_id, NOW()
    );

    IF v_fees_account_id IS NOT NULL THEN
      v_dust_credit_tx_id := gen_random_uuid();

      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, amount, tx_date,
        notes, reference_id, balance_before, balance_after,
        is_system_generated, created_by, created_at
      ) VALUES (
        v_dust_credit_tx_id, v_fees_account_id, v_fund_id,
        'DUST_SWEEP', v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
        'Dust sweep reissue (fees credit)', 'dust-sweep-reissue-' || p_transaction_id::text,
        0, v_dust_amount,
        false, p_admin_id, NOW()
      );

      INSERT INTO investor_positions (investor_id, fund_id, current_value, invested_amount, currency, updated_at)
      VALUES (v_fees_account_id, v_fund_id, v_dust_amount, 0, v_asset, NOW())
      ON CONFLICT (investor_id, fund_id) DO UPDATE
        SET current_value = COALESCE(investor_positions.current_value, 0) + v_dust_amount,
            updated_at = NOW();
    END IF;
  END IF;

  UPDATE investor_positions
  SET current_value = GREATEST(COALESCE(current_value, 0) - v_restored_amount, 0),
      updated_at = NOW()
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum
  FROM investor_positions WHERE fund_id = v_fund_id;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_fund_id, 'full_exit_reissue', -v_new_withdrawal_amount,
    v_closing_aum, v_new_withdrawal_tx_id, v_investor_id,
    COALESCE(p_new_date, v_tx.tx_date), p_admin_id
  );

  IF v_withdrawal_request.id IS NOT NULL THEN
    UPDATE withdrawal_requests
    SET status = 'completed', processed_amount = v_new_withdrawal_amount
    WHERE id = v_withdrawal_request.id;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_amount', v_original_amount),
    jsonb_build_object('new_amount', v_new_withdrawal_amount, 'dust', v_dust_amount, 'closing_aum', v_closing_aum),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true, 'voided_tx_id', p_transaction_id, 'new_tx_id', v_new_withdrawal_tx_id,
    'dust_debit_tx_id', v_dust_debit_tx_id, 'dust_credit_tx_id', v_dust_credit_tx_id,
    'new_withdrawal_amount', v_new_withdrawal_amount, 'dust_amount', v_dust_amount,
    'restored_balance', v_restored_amount, 'closing_aum', v_closing_aum
  );
END;
$$;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ FIX 3: void_yield_distribution — reference_id pattern match fix (P1)    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- The apply function (apply_segmented_yield_distribution_v5) uses:
--   yield_flat_{dist_id}_{investor_id}   (investor yield)
--   yield_flat_fees_{dist_id}            (fees account yield)
--   fee_flat_{dist_id}                   (fee credit)
--   ib_flat_{dist_id}_{investor_id}      (ib credit)
--
-- But void_yield_distribution was looking for:
--   yield_adb_, yield_v5_, fee_credit_, ib_credit_
-- These NEVER match, causing voided_count=0 on every void.
CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void',
  p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
  v_affected_investor RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
        UPDATE investor_yield_events SET is_voided = true
        WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
          AND is_voided = false;
      END IF;

      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void ALL yield-type transactions linked to this distribution
  -- Covers ALL known reference_id patterns across apply function versions:
  --   yield_adb_, yield_v5_, yield_flat_, yield_flat_fees_, yield- (v7 hyphen format)
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
        reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
     OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
     OR reference_id LIKE 'yield_flat_' || p_distribution_id::text || '_%'
     OR reference_id LIKE 'yield_flat_fees_' || p_distribution_id::text || '%'
     OR reference_id LIKE 'yield-' || p_distribution_id::text || '-%'
     OR (distribution_id = p_distribution_id AND type IN ('YIELD', 'INTEREST'))
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void ALL fee-credit transactions linked to this distribution
  -- Covers: fee_credit_, fee_credit_v5_, fee_flat_
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
        reference_id = 'fee_credit_' || p_distribution_id::text
     OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
     OR reference_id LIKE 'fee_flat_' || p_distribution_id::text || '%'
     OR (distribution_id = p_distribution_id AND type = 'FEE_CREDIT')
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void ALL IB-credit transactions linked to this distribution
  -- Covers: ib_credit_, ib_credit_v5_, ib_flat_
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_flat_' || p_distribution_id::text || '_%'
      OR (distribution_id = p_distribution_id AND type = 'IB_CREDIT')
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason WHERE id = p_distribution_id;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events SET is_voided = true
    WHERE trigger_transaction_id IN (SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true)
      AND NOT is_voided;
  END IF;

  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals, 'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id)
  );

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id, 'voided_count', v_voided_txs, 'voided_crystals', v_voided_crystals);
END;
$function$;

REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO service_role;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ FIX 4: Recreate v_liquidity_risk view (dropped in batch_6)              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
CREATE OR REPLACE VIEW public.v_liquidity_risk
WITH (security_invoker = true)
AS
SELECT f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    COALESCE(pos.total_aum, 0) AS total_aum,
    COALESCE(wr_agg.total_pending, 0) AS pending_withdrawals,
    COALESCE(pos.active_positions, 0) AS active_positions,
        CASE
            WHEN COALESCE(pos.total_aum, 0) > 0 THEN round(COALESCE(wr_agg.total_pending, 0) / pos.total_aum * 100, 2)
            ELSE 0
        END AS withdrawal_ratio,
        CASE
            WHEN COALESCE(pos.total_aum, 0) = 0 THEN 'NO_AUM'
            WHEN (COALESCE(wr_agg.total_pending, 0) / NULLIF(pos.total_aum, 0)) > 0.3 THEN 'HIGH'
            WHEN (COALESCE(wr_agg.total_pending, 0) / NULLIF(pos.total_aum, 0)) > 0.15 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS risk_level
   FROM funds f
     LEFT JOIN ( SELECT ip.fund_id,
            sum(ip.current_value) AS total_aum,
            count(*)::integer AS active_positions
           FROM investor_positions ip
          WHERE ip.is_active = true
          GROUP BY ip.fund_id) pos ON pos.fund_id = f.id
     LEFT JOIN ( SELECT wr.fund_id,
            sum(wr.requested_amount) FILTER (WHERE wr.status IN ('pending', 'approved', 'processing')) AS total_pending
           FROM withdrawal_requests wr
          GROUP BY wr.fund_id) wr_agg ON wr_agg.fund_id = f.id
  WHERE f.status = 'active';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ FIX 5: Recreate v_concentration_risk view                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
CREATE OR REPLACE VIEW public.v_concentration_risk
WITH (security_invoker = true)
AS
WITH fund_totals AS (
         SELECT investor_positions.fund_id,
            sum(investor_positions.current_value) AS total_aum
           FROM investor_positions
          WHERE investor_positions.is_active = true
          GROUP BY investor_positions.fund_id
        )
 SELECT f.id AS fund_id,
    f.code AS fund_code,
    p.id AS investor_id,
    TRIM(BOTH FROM (COALESCE(p.first_name, '') || ' ') || COALESCE(p.last_name, '')) AS investor_name,
    p.account_type::text AS account_type,
    ip.current_value AS position_value,
    ft.total_aum AS fund_aum,
        CASE
            WHEN ft.total_aum > 0 THEN round(ip.current_value / ft.total_aum * 100, 2)
            ELSE 0
        END AS ownership_pct,
        CASE
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0)) >= 0.40 THEN 'CRITICAL'
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0)) >= 0.25 THEN 'HIGH'
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0)) >= 0.15 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS concentration_level
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
     JOIN profiles p ON p.id = ip.investor_id
     JOIN fund_totals ft ON ft.fund_id = f.id
  WHERE ip.is_active = true AND f.status = 'active' AND p.account_type = 'investor'
  ORDER BY (
        CASE
            WHEN ft.total_aum > 0 THEN round(ip.current_value / ft.total_aum * 100, 2)
            ELSE 0
        END) DESC;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ FIX 6: Migration history cleanup                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- The supabase CLI migration history is out of sync. The schema_migrations
-- table has entries where the `name` column doesn't match local filenames
-- (due to file renames + partial pushes). Delete all entries and re-insert
-- with names that match the current local filenames. The CLI compares both
-- version AND name.

-- First, delete stale entries for renamed migrations
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('20260414000004', '20260414000005', '20260414000006', '20260414000007', '20260414000008')
  AND name NOT IN (
    'ps3_runtime_warnings', 'archive_backup_tables',
    'ps4_disable_redundant_triggers', 'operational_monitoring_views',
    'remove_qa_functions'
  );

-- Fix 20260601010000 back to applied (it was repaired to reverted earlier)
UPDATE supabase_migrations.schema_migrations
SET name = 'stabilization_phase2_void_sanitization'
WHERE version = '20260601010000'
  AND name != 'stabilization_phase2_void_sanitization';

-- Ensure all already-applied phase migrations have correct names
UPDATE supabase_migrations.schema_migrations
SET name = 'stabilization_phase3_yield_constraint'
WHERE version = '20260601020000' AND name != 'stabilization_phase3_yield_constraint';

UPDATE supabase_migrations.schema_migrations
SET name = 'stabilization_phase4_notifications'
WHERE version = '20260601030000' AND name != 'stabilization_phase4_notifications';

UPDATE supabase_migrations.schema_migrations
SET name = 'stabilization_phase5_reporting'
WHERE version = '20260601040000' AND name != 'stabilization_phase5_reporting';

UPDATE supabase_migrations.schema_migrations
SET name = 'reconciliation_enum_alignment'
WHERE version = '20260610010000' AND name != 'reconciliation_enum_alignment';

UPDATE supabase_migrations.schema_migrations
SET name = 'add_voided_by_profile_id_fund_aum_events'
WHERE version = '20260615000000' AND name != 'add_voided_by_profile_id_fund_aum_events';

UPDATE supabase_migrations.schema_migrations
SET name = 'add_updated_at_to_fund_aum_events'
WHERE version = '20260615000001' AND name != 'add_updated_at_to_fund_aum_events';

UPDATE supabase_migrations.schema_migrations
SET name = 'fix_yield_constraint_violations_add_missing_checks'
WHERE version = '20260616000000' AND name != 'fix_yield_constraint_violations_add_missing_checks';

UPDATE supabase_migrations.schema_migrations
SET name = 'fix_void_and_reissue_canonical_rpc'
WHERE version = '20260617000000' AND name != 'fix_void_and_reissue_canonical_rpc';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ VERIFICATION QUERIES — Run these separately to confirm fixes            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- SELECT proname, prosrc LIKE '%set_config%canonical_rpc%' AS has_canonical_rpc
--   FROM pg_proc WHERE proname IN ('void_and_reissue_transaction', 'void_and_reissue_full_exit', 'void_yield_distribution');
--
-- SELECT table_name FROM information_schema.views WHERE table_name IN ('v_liquidity_risk', 'v_concentration_risk');
--
-- SELECT version, name FROM supabase_migrations.schema_migrations
--   WHERE version::text LIKE '202606%' ORDER BY version;