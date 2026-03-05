-- Fix apply_segmented_yield_distribution_v5 dropped legacy RPC dependency

-- 3. preview_segmented_yield_distribution_v5: matching read-only version (same math)

-- =============================================================
-- 1. apply_transaction_with_crystallization: guard p_new_total_aum
-- =============================================================
CREATE OR REPLACE FUNCTION public.apply_investor_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  -- Guard: auto-crystallization via p_new_total_aum is disabled.
  -- Record transaction-purpose yield manually before any deposit/withdrawal.
  IF p_new_total_aum IS NOT NULL THEN
    RAISE EXCEPTION
      'Auto-crystallization is disabled. Pass p_new_total_aum = NULL. '
      'Record a transaction-purpose yield distribution manually before each deposit/withdrawal.';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Fund not found: %', p_fund_id; END IF;

  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT' THEN v_balance_after := v_balance_before + p_amount;
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    ELSE v_balance_after := v_balance_before + p_amount;
  END CASE;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE p_amount END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  ) RETURNING id INTO v_tx_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, v_post_aum, p_purpose, 'transaction_sum', v_admin)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 2. apply_segmented_yield_distribution_v5: flat position-proportional
--    gross = recorded_aum - SUM(live positions)
--    allocate by current position share
--    no segments, no crystal markers, no fund_aum_events
-- =============================================================

-- 3. preview_segmented_yield_distribution_v5: matching read-only version (same math)

-- =============================================================
-- 1. apply_transaction_with_crystallization: guard p_new_total_aum
-- =============================================================
CREATE OR REPLACE FUNCTION public.apply_transaction_with_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  -- Guard: auto-crystallization via p_new_total_aum is disabled.
  -- Record transaction-purpose yield manually before any deposit/withdrawal.
  IF p_new_total_aum IS NOT NULL THEN
    RAISE EXCEPTION
      'Auto-crystallization is disabled. Pass p_new_total_aum = NULL. '
      'Record a transaction-purpose yield distribution manually before each deposit/withdrawal.';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Fund not found: %', p_fund_id; END IF;

  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT' THEN v_balance_after := v_balance_before + p_amount;
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    ELSE v_balance_after := v_balance_before + p_amount;
  END CASE;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE p_amount END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  ) RETURNING id INTO v_tx_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, v_post_aum, p_purpose, 'transaction_sum', v_admin)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 2. apply_segmented_yield_distribution_v5: flat position-proportional
--    gross = recorded_aum - SUM(live positions)
--    allocate by current position share
--    no segments, no crystal markers, no fund_aum_events
-- =============================================================
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose public.aum_purpose DEFAULT 'reporting',
  p_distribution_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;

  -- Yield computation
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;

  -- Running totals (exclude fees_account from investor header)
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_fees_account_net numeric := 0;
  v_allocation_count int := 0;

  -- Dust
  v_residual numeric := 0;

  -- Per-investor iteration
  v_inv RECORD;
  v_alloc RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;

  -- Transaction results
  v_tx_result jsonb;
  v_yield_tx_id uuid;
  v_fee_tx_result jsonb;
  v_fee_tx_id uuid;
  v_ib_tx_result jsonb;
  v_ib_tx_id uuid;

  -- Final check
  v_final_positions_sum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  v_is_month_end := (p_period_end = v_period_end);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Duplicate check (exclude crystal flow markers)
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end
      AND purpose = p_purpose AND is_voided = false
      AND consolidated_into_id IS NULL
      AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
  ) THEN
    RAISE EXCEPTION 'Distribution already exists for fund % period ending % with purpose %',
      p_fund_id, v_period_end, p_purpose;
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  -- ============================================================
  -- FLAT YIELD COMPUTATION
  -- gross = recorded_aum - SUM(live investor_positions)
  -- ============================================================
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- Distribution header (amounts updated after allocation loop)
  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end, allocation_count
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'flat_position_proportional_v6', p_purpose, v_is_month_end, 0
  ) RETURNING id INTO v_distribution_id;

  -- ============================================================
  -- TEMP TABLE: compute per-investor allocations (two-pass to handle dust)
  -- ============================================================
  DROP TABLE IF EXISTS _vflat_alloc;
  CREATE TEMP TABLE _vflat_alloc (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    investor_email text,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    current_value numeric NOT NULL DEFAULT 0,
    gross numeric NOT NULL DEFAULT 0,
    fee_pct numeric NOT NULL DEFAULT 0,
    fee numeric NOT NULL DEFAULT 0,
    ib_rate numeric NOT NULL DEFAULT 0,
    ib numeric NOT NULL DEFAULT 0,
    net numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  -- Pass 1: Compute allocations by position share
  IF v_total_month_yield != 0 AND v_opening_aum > 0 THEN
    FOR v_inv IN
      SELECT ip.investor_id, ip.current_value,
             p.account_type::text AS account_type,
             p.ib_parent_id,
             trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
             p.email AS investor_email
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value > 0
      ORDER BY ip.current_value DESC
    LOOP
      v_share := v_inv.current_value / v_opening_aum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        v_fee_pct := 0; v_ib_rate := 0;
        v_fee := 0; v_ib := 0; v_net := v_gross;
      ELSE
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end);
        END IF;
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_period_end);
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE
          v_ib := 0;
        END IF;

        v_net := v_gross - v_fee - v_ib;
      END IF;

      -- Track header totals (exclude fees_account from investor header)
      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
        v_fees_account_net := v_fees_account_net + v_net;
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;

      INSERT INTO _vflat_alloc (
        investor_id, investor_name, investor_email, account_type, ib_parent_id,
        current_value, gross, fee_pct, fee, ib_rate, ib, net
      ) VALUES (
        v_inv.investor_id, v_inv.investor_name, v_inv.investor_email,
        v_inv.account_type, v_inv.ib_parent_id,
        v_inv.current_value, v_gross, v_fee_pct, v_fee, v_ib_rate, v_ib, v_net
      );
    END LOOP;
  END IF;

  -- Dust = total yield - investor gross - fees_account gross (rounding residual)
  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

  -- Route dust to fees_account (added to fees_account net)
  v_fees_account_net := v_fees_account_net + v_residual;

  -- ============================================================
  -- Pass 2: Create transactions
  -- ============================================================
  FOR v_alloc IN
    SELECT * FROM _vflat_alloc
    WHERE investor_id != v_fees_account_id
      AND net != 0
    ORDER BY gross DESC
  LOOP
    -- YIELD transaction for investor
    v_tx_result := apply_transaction_with_crystallization(
      p_investor_id := v_alloc.investor_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := v_alloc.net,
      p_tx_date := v_tx_date,
      p_reference_id := 'yield_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
      p_notes := 'Flat yield ' || to_char(v_period_start, 'Mon YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := NULLIF(v_tx_result->>'tx_id', '')::uuid;

    -- Set visibility scope
    IF v_yield_tx_id IS NOT NULL THEN
      IF p_purpose = 'reporting'::aum_purpose THEN
        UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope
        WHERE id = v_yield_tx_id;
      ELSE
        UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
        WHERE id = v_yield_tx_id;
      END IF;

      -- Enrich investor_yield_events
      UPDATE investor_yield_events SET
        gross_yield_amount = v_alloc.gross,
        fee_pct = v_alloc.fee_pct,
        fee_amount = v_alloc.fee,
        ib_amount = v_alloc.ib,
        net_yield_amount = v_alloc.net,
        investor_balance = v_alloc.current_value
      WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
    END IF;

    -- yield_allocations
    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
      0, v_alloc.fee_pct, v_alloc.ib_rate, v_yield_tx_id, NOW()
    );
    v_allocation_count := v_allocation_count + 1;

    -- Fee allocation records
    IF v_alloc.fee > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_alloc.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_alloc.gross,
        v_alloc.fee_pct, v_alloc.fee, NULL, v_admin
      );

      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date,
        asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id,
        NULLIF(v_alloc.investor_name, ''),
        v_alloc.gross, v_alloc.fee_pct, v_alloc.fee,
        v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    -- IB commission
    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
      v_ib_tx_result := apply_transaction_with_crystallization(
        p_investor_id := v_alloc.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_alloc.ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'IB commission flat yield ' || to_char(v_period_start, 'Mon YYYY'),
        p_admin_id := v_admin,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := NULLIF(v_ib_tx_result->>'tx_id', '')::uuid;

      UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
      WHERE distribution_id = v_distribution_id
        AND investor_id = v_alloc.investor_id
        AND ib_transaction_id IS NULL;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, source_investor_name,
        ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT p_fund_id, v_distribution_id, v_alloc.investor_id,
             NULLIF(v_alloc.investor_name, ''),
             v_alloc.ib_parent_id,
             trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
             v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
    END IF;
  END LOOP;

  -- FEE_CREDIT to fees_account (sum of all investor fees)
  IF v_total_fees > 0 THEN
    v_fee_tx_result := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_flat_' || v_distribution_id::text,
      p_notes := 'Platform fees flat yield ' || to_char(v_period_start, 'Mon YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := NULLIF(v_fee_tx_result->>'tx_id', '')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  -- fees_account YIELD tx (own position yield + dust)
  IF v_fees_account_net != 0 THEN
    v_tx_result := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := v_fees_account_net,
      p_tx_date := v_tx_date,
      p_reference_id := 'yield_flat_fees_' || v_distribution_id::text,
      p_notes := 'Fees account yield + dust flat ' || to_char(v_period_start, 'Mon YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := NULLIF(v_tx_result->>'tx_id', '')::uuid;

    -- fees_account yield is always admin_only
    IF v_yield_tx_id IS NOT NULL THEN
      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_yield_tx_id;
    END IF;
  END IF;

  -- Auto-mark IB as paid for reporting
  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
  END IF;

  -- Update distribution header with final totals
  UPDATE yield_distributions SET
    gross_yield = v_total_gross,
    gross_yield_amount = v_total_gross,
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    net_yield = v_total_net,
    total_fees = v_total_fees,
    total_ib = v_total_ib,
    dust_amount = COALESCE(v_residual, 0),
    allocation_count = v_allocation_count,
    summary_json = jsonb_build_object(
      'version', 'flat_v6',
      'opening_aum', v_opening_aum,
      'is_negative_yield', v_is_negative_yield
    )
  WHERE id = v_distribution_id;

  -- Record AUM snapshot
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
  VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v5',
    is_month_end = EXCLUDED.is_month_end, updated_at = now();

  -- Audit log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_FLAT_V6_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('opening_aum', v_opening_aum),
    jsonb_build_object(
      'recorded_aum', p_recorded_aum, 'gross_yield', v_total_gross,
      'net_yield', v_total_net, 'total_fees', v_total_fees,
      'total_ib', v_total_ib, 'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id, 'fund_code', v_fund.code,
      'period_start', v_period_start, 'period_end', v_period_end,
      'purpose', p_purpose::text, 'calculation_method', 'flat_position_proportional_v6',
      'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
      'dust_residual', v_residual,
      'distribution_date', v_tx_date
    )
  );

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_final_positions_sum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'allocation_count', v_allocation_count,
    'investor_count', v_allocation_count,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'position_sum', v_final_positions_sum,
    'ib_auto_paid', (p_purpose = 'reporting'::aum_purpose),
    'crystals_consolidated', 0,
    'calculation_method', 'flat_position_proportional_v6'
  );
END;
$$;

-- =============================================================
-- 3. preview_segmented_yield_distribution_v5: flat read-only version
--    Drop both overloads, create single aum_purpose version.
--    Returns V5AllocationItem/V5YieldRPCResult shapes for TypeScript.
-- =============================================================
DROP FUNCTION IF EXISTS public.preview_segmented_yield_distribution_v5(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose);

CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose public.aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_fees_account_id uuid;

  -- Yield computation
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;

  -- Running totals (exclude fees_account from investor header)
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_residual numeric := 0;

  -- Per-investor iteration
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;

  -- Output
  v_allocations_out jsonb := '[]'::jsonb;
BEGIN
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be a positive number');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- Opening AUM = live position sum
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- Gross yield (flat)
  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- Allocate by position share
  IF v_total_month_yield != 0 AND v_opening_aum > 0 THEN
    FOR v_inv IN
      SELECT ip.investor_id, ip.current_value,
             p.account_type::text AS account_type,
             p.ib_parent_id,
             trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
             p.email AS investor_email
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value > 0
      ORDER BY ip.current_value DESC
    LOOP
      v_share := v_inv.current_value / v_opening_aum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        v_fee_pct := 0; v_ib_rate := 0;
        v_fee := 0; v_ib := 0; v_net := v_gross;
      ELSE
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end);
        END IF;
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_period_end);
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE
          v_ib := 0;
        END IF;

        v_net := v_gross - v_fee - v_ib;
      END IF;

      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;

        -- Build allocation item matching V5AllocationItem TypeScript shape
        v_allocations_out := v_allocations_out || jsonb_build_object(
          'investor_id', v_inv.investor_id,
          'investor_name', v_inv.investor_name,
          'investor_email', v_inv.investor_email,
          'account_type', v_inv.account_type,
          'gross', v_gross,
          'fee_pct', v_fee_pct,
          'fee', v_fee,
          'ib_parent_id', v_inv.ib_parent_id,
          'ib_rate', v_ib_rate,
          'ib', v_ib,
          'net', v_net,
          'segments', '[]'::jsonb
        );
      END IF;
    END LOOP;
  END IF;

  -- Dust
  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

  -- Return V5YieldRPCResult shape matching TypeScript types
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'investor_count', jsonb_array_length(v_allocations_out),
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'allocations', v_allocations_out,
    'is_negative_yield', v_is_negative_yield,
    'calculation_method', 'flat_position_proportional_v6'
  );
END;
$$;
