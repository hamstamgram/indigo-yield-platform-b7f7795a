-- =============================================================================
-- SCORCHED EARTH AUDIT: Phase 1
-- Fix 1: IB Commission from GROSS yield (ADDITIVE model: fee + IB both from gross)
-- Fix 2: Enable negative yield (proportional loss distribution, fees = 0)
-- Fix 3: Enable zero yield recording
-- Fix 4: Allow negative YIELD transactions in apply_transaction_with_crystallization
-- Fix 5: Allow negative yield percentage in validate_yield_parameters
-- =============================================================================

-- =====================================================================
-- FIX 4: apply_transaction_with_crystallization - allow negative YIELD
-- Must be applied FIRST as V5 engine depends on it
-- =====================================================================
CREATE OR REPLACE FUNCTION public.apply_transaction_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_new_total_aum numeric DEFAULT NULL::numeric,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_fund_last_crystal_date date;
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_crystal_amount numeric := 0;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  -- Admin guard
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Allowed: DEPOSIT, WITHDRAWAL, FEE, ADJUSTMENT, INTEREST, FEE_CREDIT, IB_CREDIT, YIELD', p_tx_type;
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must be non-zero';
  END IF;

  IF p_reference_id IS NULL OR p_reference_id = '' THEN
    RAISE EXCEPTION 'Reference ID is required for idempotency';
  END IF;

  -- Idempotency check
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

  -- Advisory lock on investor+fund
  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- ====================================================================
  -- FUND-LEVEL crystallization check BEFORE position creation.
  -- ====================================================================
  IF p_tx_type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT') THEN
    SELECT MAX(ip.last_yield_crystallization_date)
    INTO v_fund_last_crystal_date
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

    IF v_fund_last_crystal_date IS NOT NULL AND v_fund_last_crystal_date < p_tx_date THEN
      IF p_new_total_aum IS NULL THEN
        SELECT total_aum INTO p_new_total_aum
        FROM fund_daily_aum
        WHERE fund_id = p_fund_id AND aum_date <= p_tx_date
          AND purpose = 'transaction' AND is_voided = false
        ORDER BY aum_date DESC LIMIT 1;

        IF p_new_total_aum IS NULL THEN
          SELECT total_aum INTO p_new_total_aum
          FROM fund_daily_aum
          WHERE fund_id = p_fund_id AND aum_date <= p_tx_date AND is_voided = false
          ORDER BY aum_date DESC LIMIT 1;
        END IF;
      END IF;

      IF p_new_total_aum IS NOT NULL AND p_new_total_aum > 0 THEN
        v_crystal_result := crystallize_yield_before_flow(
          p_fund_id := p_fund_id,
          p_closing_aum := p_new_total_aum,
          p_trigger_type := 'transaction',
          p_trigger_reference := p_reference_id,
          p_event_ts := (p_tx_date::timestamp + interval '12 hours'),
          p_admin_id := v_admin,
          p_purpose := p_purpose
        );

        v_crystal_amount := COALESCE((v_crystal_result->>'gross_yield')::numeric, 0);
      END IF;
    END IF;
  END IF;

  -- Get or create position
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

  -- Calculate balance after
  -- FIX: YIELD preserves sign (allows negative yield for loss months)
  CASE p_tx_type
    WHEN 'DEPOSIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'FEE' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'ADJUSTMENT' THEN
      v_balance_after := v_balance_before + p_amount;
    WHEN 'YIELD' THEN
      -- SCORCHED EARTH FIX: Allow negative yield (loss distribution)
      v_balance_after := v_balance_before + p_amount;
    WHEN 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    ELSE
      v_balance_after := v_balance_before + p_amount;
  END CASE;

  -- Insert transaction (trg_ledger_sync handles position update)
  -- FIX: YIELD preserves sign for negative yield support
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, p_tx_date, v_fund.asset,
    CASE
      WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount)
      WHEN p_tx_type = 'YIELD' THEN p_amount  -- Preserve sign for negative yield
      ELSE ABS(p_amount)
    END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false,
    p_distribution_id
  )
  RETURNING id INTO v_tx_id;

  -- AUM auto-recording after transaction
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, v_post_aum, p_purpose, 'transaction', v_admin)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 'idempotent', false, 'tx_id', v_tx_id,
    'crystallized_yield_amount', v_crystal_amount,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'last_crystallized_at', p_tx_date, 'tx_type', p_tx_type, 'amount', p_amount,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_tx
    FROM transactions_v2
    WHERE reference_id = p_reference_id AND is_voided = false LIMIT 1;

    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists (race condition handled)'
    );
END;
$function$;


-- =====================================================================
-- FIX 5: validate_yield_parameters - allow negative yield percentage
-- =====================================================================
CREATE OR REPLACE FUNCTION public.validate_yield_parameters(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_purpose text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_aum numeric(28,10);
  v_gross_yield numeric(28,10);
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
  -- SCORCHED EARTH FIX: Allow negative yield percentage
  -- Removed: IF p_gross_yield_pct < 0 THEN error
  -- Added: warning for negative yield
  IF p_gross_yield_pct < 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code', 'NEGATIVE_YIELD',
      'message', 'Negative yield: ' || p_gross_yield_pct || '%. All balances will decrease proportionally. Fees = 0.'
    );
  END IF;

  IF p_gross_yield_pct > 50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_HIGH', 'message', 'Yield percentage exceeds 50% daily maximum');
  ELSIF p_gross_yield_pct > 10 THEN
    v_warnings := v_warnings || jsonb_build_object('code', 'HIGH_YIELD', 'message', 'Yield percentage above 10% - please verify');
  END IF;

  -- Also warn for very negative
  IF p_gross_yield_pct < -50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_LOW', 'message', 'Negative yield exceeds -50% - please verify');
  END IF;

  -- Check AUM exists
  SELECT total_aum INTO v_fund_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_yield_date AND purpose = p_purpose::aum_purpose AND NOT is_voided
  ORDER BY created_at DESC LIMIT 1;

  IF v_fund_aum IS NULL THEN
    v_errors := v_errors || jsonb_build_object('code', 'NO_AUM', 'message', 'No AUM record found for date');
  ELSIF v_fund_aum = 0 THEN
    v_errors := v_errors || jsonb_build_object('code', 'ZERO_AUM', 'message', 'AUM is zero - cannot apply yield');
  END IF;

  -- Calculate gross yield
  IF v_fund_aum IS NOT NULL AND v_fund_aum > 0 THEN
    v_gross_yield := v_fund_aum * (p_gross_yield_pct / 100);

    IF v_gross_yield > 0 AND v_gross_yield < 0.01 THEN
      v_warnings := v_warnings || jsonb_build_object('code', 'SMALL_YIELD', 'message', 'Calculated yield is very small: ' || v_gross_yield::text);
    END IF;
  END IF;

  -- Check for duplicate
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND effective_date = p_yield_date AND purpose = p_purpose AND status = 'applied'
  ) THEN
    v_errors := v_errors || jsonb_build_object('code', 'DUPLICATE', 'message', 'Yield already applied for this date');
  END IF;

  -- Check fees account exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE account_type = 'fees_account') THEN
    v_errors := v_errors || jsonb_build_object('code', 'NO_FEES_ACCOUNT', 'message', 'INDIGO Fees account not found');
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'calculated_yield', v_gross_yield,
    'aum', v_fund_aum
  );
END;
$function$;


-- =====================================================================
-- FIX 1 + 2 + 3: V5 Apply Engine
-- - IB from NET (not GROSS)
-- - Negative yield: proportional loss, fees = 0
-- - Zero yield: create header, skip transactions
-- =====================================================================
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
  p_distribution_date date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;

  -- Segment building
  v_seg_start date;
  v_seg_end date;
  v_seg_closing_aum numeric;
  v_seg_idx int := 0;
  v_seg_count int := 0;
  v_seg_yield numeric;
  v_balance_sum numeric;
  v_segments_meta jsonb := '[]'::jsonb;

  -- Running totals
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_seg_yield numeric := 0;
  v_fees_account_gross numeric := 0;
  v_allocation_count int := 0;
  v_opening_aum numeric := 0;

  -- Largest remainder
  v_largest_investor_id uuid;
  v_largest_gross numeric := 0;
  v_largest_fee_pct numeric := 0;
  v_largest_ib_rate numeric := 0;
  v_largest_ib_parent_id uuid;
  v_residual numeric;
  v_adj_fee numeric;
  v_adj_ib numeric;
  v_adj_net numeric;

  -- Per-investor iteration
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate_seg numeric;

  -- Negative yield flag
  v_is_negative_yield boolean := false;

  -- Transaction results
  v_tx_result jsonb;
  v_tx_id uuid;
  v_yield_tx_id uuid;
  v_fee_tx_result jsonb;
  v_fee_tx_id uuid;
  v_ib_tx_result jsonb;
  v_ib_tx_id uuid;

  -- Crystal consolidation
  v_crystals_consolidated int := 0;
  v_crystal_dist RECORD;

  -- Final check
  v_final_positions_sum numeric;
  v_is_month_end boolean;
  v_tx_date date;

  -- Allocation record
  v_alloc RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Load fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Period setup
  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end) + interval '1 month - 1 day')::date);

  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  -- Advisory lock
  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Uniqueness check
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end
      AND purpose = p_purpose AND is_voided = false
      AND consolidated_into_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Distribution already exists for fund % period ending % with purpose %',
      p_fund_id, v_period_end, p_purpose;
  END IF;

  -- Fees account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  -- Suppress AUM auto-recording during yield transaction creation
  PERFORM set_config('indigo.aum_synced', 'true', true);

  -- ============================================================
  -- TEMP TABLES
  -- ============================================================
  DROP TABLE IF EXISTS _v5_bal;
  DROP TABLE IF EXISTS _v5_tot;
  DROP TABLE IF EXISTS _v5_segs;

  CREATE TEMP TABLE _v5_bal (
    investor_id uuid PRIMARY KEY,
    balance numeric NOT NULL DEFAULT 0,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _v5_tot (
    investor_id uuid PRIMARY KEY,
    total_gross numeric NOT NULL DEFAULT 0,
    total_fee numeric NOT NULL DEFAULT 0,
    total_ib numeric NOT NULL DEFAULT 0,
    total_net numeric NOT NULL DEFAULT 0,
    seg_detail jsonb NOT NULL DEFAULT '[]'::jsonb,
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _v5_segs (
    seg_idx int PRIMARY KEY,
    seg_start date NOT NULL,
    seg_end date NOT NULL,
    closing_aum numeric NOT NULL,
    is_last boolean NOT NULL DEFAULT false
  ) ON COMMIT DROP;

  -- ============================================================
  -- Opening balances
  -- ============================================================
  INSERT INTO _v5_bal (investor_id, balance, account_type, ib_parent_id, ib_rate, investor_name)
  SELECT
    p.id,
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    p.account_type::text,
    p.ib_parent_id,
    get_investor_ib_pct(p.id, p_fund_id, v_period_end),
    trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- Initialize totals
  INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
  SELECT investor_id, ib_parent_id, ib_rate, investor_name FROM _v5_bal;

  SELECT COALESCE(SUM(balance), 0) INTO v_opening_aum FROM _v5_bal;

  -- ============================================================
  -- Build segments from crystallization events
  -- ============================================================
  v_seg_start := v_period_start;
  v_seg_idx := 0;

  FOR v_inv IN
    SELECT
      yd.effective_date,
      COALESCE(fae.closing_aum, 0) as closing_aum
    FROM yield_distributions yd
    LEFT JOIN fund_aum_events fae
      ON fae.fund_id = yd.fund_id
      AND fae.event_date = yd.effective_date
      AND fae.is_voided = false
      AND fae.trigger_type IN ('deposit', 'withdrawal', 'transaction')
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date > v_period_start
      AND yd.effective_date <= v_period_end
      AND yd.is_voided = false
      AND yd.distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND yd.consolidated_into_id IS NULL
    ORDER BY yd.effective_date
  LOOP
    v_seg_idx := v_seg_idx + 1;
    INSERT INTO _v5_segs (seg_idx, seg_start, seg_end, closing_aum)
    VALUES (v_seg_idx, v_seg_start, v_inv.effective_date, v_inv.closing_aum);
    v_seg_start := v_inv.effective_date;
  END LOOP;

  -- Last/only segment
  v_seg_idx := v_seg_idx + 1;
  INSERT INTO _v5_segs (seg_idx, seg_start, seg_end, closing_aum, is_last)
  VALUES (v_seg_idx, v_seg_start, v_period_end, p_recorded_aum, true);
  v_seg_count := v_seg_idx;

  -- ============================================================
  -- Create the distribution header (amounts updated later)
  -- ============================================================
  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end,
    allocation_count
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin, 'segmented_v5', p_purpose, v_is_month_end,
    0
  ) RETURNING id INTO v_distribution_id;

  -- Consolidate crystallization distributions
  FOR v_crystal_dist IN
    SELECT id FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date >= v_period_start AND effective_date <= v_period_end
      AND is_voided = false
      AND distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND consolidated_into_id IS NULL
      AND id != v_distribution_id
  LOOP
    UPDATE yield_distributions
    SET consolidated_into_id = v_distribution_id
    WHERE id = v_crystal_dist.id;
    v_crystals_consolidated := v_crystals_consolidated + 1;
  END LOOP;

  -- ============================================================
  -- Process each segment
  -- ============================================================
  FOR v_seg_idx IN 1..v_seg_count LOOP
    SELECT * INTO v_inv FROM _v5_segs WHERE seg_idx = v_seg_idx;
    v_seg_start := v_inv.seg_start;
    v_seg_end := v_inv.seg_end;
    v_seg_closing_aum := v_inv.closing_aum;

    -- Apply capital flows for this segment
    FOR v_inv IN
      SELECT t.investor_id, SUM(t.amount) as flow_amount
      FROM transactions_v2 t
      WHERE t.fund_id = p_fund_id
        AND t.is_voided = false
        AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
        AND t.tx_date >= v_seg_start
        AND (
          (v_seg_idx < v_seg_count AND t.tx_date < v_seg_end)
          OR
          (v_seg_idx = v_seg_count AND t.tx_date <= v_seg_end)
        )
      GROUP BY t.investor_id
    LOOP
      INSERT INTO _v5_bal (investor_id, balance, account_type, ib_parent_id, ib_rate, investor_name)
      SELECT v_inv.investor_id, v_inv.flow_amount, p.account_type::text,
             p.ib_parent_id, get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end),
             trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
      FROM profiles p WHERE p.id = v_inv.investor_id
      ON CONFLICT (investor_id)
      DO UPDATE SET balance = _v5_bal.balance + v_inv.flow_amount;

      INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
      SELECT v_inv.investor_id, p.ib_parent_id, get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end),
             trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
      FROM profiles p WHERE p.id = v_inv.investor_id
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Compute segment yield
    SELECT COALESCE(SUM(balance), 0) INTO v_balance_sum FROM _v5_bal;
    v_seg_yield := v_seg_closing_aum - v_balance_sum;

    -- Track total segment yield (positive and negative)
    v_total_seg_yield := v_total_seg_yield + v_seg_yield;

    -- SCORCHED EARTH FIX: Determine if this segment has negative yield
    v_is_negative_yield := (v_seg_yield < 0);

    -- Skip ONLY if zero yield or no balances (zero = flat month, nothing to do)
    IF v_seg_yield = 0 OR v_balance_sum <= 0 THEN
      v_segments_meta := v_segments_meta || jsonb_build_object(
        'seg_idx', v_seg_idx, 'start', v_seg_start, 'end', v_seg_end,
        'closing_aum', v_seg_closing_aum, 'yield', v_seg_yield, 'skipped', true
      );
      CONTINUE;
    END IF;

    -- Allocate yield proportionally (positive OR negative)
    FOR v_inv IN
      SELECT b.investor_id, b.balance, b.account_type, b.ib_parent_id,
             b.ib_rate, b.investor_name
      FROM _v5_bal b WHERE b.balance > 0
    LOOP
      v_share := v_inv.balance / v_balance_sum;
      v_gross := ROUND((v_seg_yield * v_share)::numeric, 8);

      -- Track fees_account gross separately for dust calculation
      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
      END IF;

      -- SCORCHED EARTH FIX: Negative yield = fees and IB are ZERO
      IF v_is_negative_yield THEN
        v_fee_pct := 0;
        v_fee := 0;
        v_ib_rate_seg := 0;
        v_ib := 0;
        v_net := v_gross; -- Full loss passed to investor
      ELSE
        -- Positive yield: normal fee/IB calculation
        -- fees_account earns yield at 0% fee (no self-charging)
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_seg_end);
        END IF;
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

        -- IB commission from GROSS yield (ADDITIVE model: fee + IB both from gross)
        -- IB = gross * ib_rate / 100
        v_ib_rate_seg := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end);
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate_seg > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate_seg / 100)::numeric, 8);
        ELSE
          v_ib := 0;
        END IF;

        v_net := v_gross - v_fee - v_ib;
      END IF;

      -- Running balance updates
      UPDATE _v5_bal SET balance = balance + v_net WHERE investor_id = v_inv.investor_id;

      -- Credit fees to fees_account for non-fees_account investors (positive yield only)
      IF v_fee > 0 AND v_inv.account_type != 'fees_account' THEN
        INSERT INTO _v5_bal (investor_id, balance, account_type)
        VALUES (v_fees_account_id, v_fee, 'fees_account')
        ON CONFLICT (investor_id) DO UPDATE SET balance = _v5_bal.balance + v_fee;
        INSERT INTO _v5_tot (investor_id, investor_name)
        VALUES (v_fees_account_id, 'Fees Account')
        ON CONFLICT DO NOTHING;
      END IF;

      -- Credit IB commission (positive yield only)
      IF v_ib > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
        INSERT INTO _v5_bal (investor_id, balance, account_type, investor_name)
        SELECT v_inv.ib_parent_id, v_ib, p.account_type::text,
               trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
        FROM profiles p WHERE p.id = v_inv.ib_parent_id
        ON CONFLICT (investor_id) DO UPDATE SET balance = _v5_bal.balance + v_ib;
        INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
        SELECT v_inv.ib_parent_id, NULL, 0,
               trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
        FROM profiles p WHERE p.id = v_inv.ib_parent_id
        ON CONFLICT DO NOTHING;
      END IF;

      -- Accumulate totals (exclude fees_account from header totals)
      UPDATE _v5_tot SET
        total_gross = total_gross + v_gross,
        total_fee = total_fee + v_fee,
        total_ib = total_ib + v_ib,
        total_net = total_net + v_net,
        seg_detail = seg_detail || jsonb_build_object(
          'seg', v_seg_idx, 'start', v_seg_start, 'end', v_seg_end,
          'gross', v_gross, 'fee_pct', v_fee_pct, 'fee', v_fee,
          'ib_pct', v_ib_rate_seg, 'ib', v_ib, 'net', v_net
        )
      WHERE investor_id = v_inv.investor_id;

      -- Header totals exclude fees_account (internal compounding)
      IF v_inv.investor_id != v_fees_account_id THEN
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;

      -- Dust adjustment: track largest REAL investor (positive yield only)
      IF NOT v_is_negative_yield AND v_inv.investor_id != v_fees_account_id AND v_gross > v_largest_gross THEN
        v_largest_gross := v_gross;
        v_largest_investor_id := v_inv.investor_id;
        v_largest_fee_pct := v_fee_pct;
        v_largest_ib_rate := v_ib_rate_seg;
        v_largest_ib_parent_id := v_inv.ib_parent_id;
      END IF;
    END LOOP;

    v_segments_meta := v_segments_meta || jsonb_build_object(
      'seg_idx', v_seg_idx, 'start', v_seg_start, 'end', v_seg_end,
      'closing_aum', v_seg_closing_aum, 'yield', v_seg_yield, 'skipped', false,
      'negative', v_is_negative_yield,
      'investors', (SELECT count(*) FROM _v5_bal WHERE balance > 0)
    );
  END LOOP;

  -- ============================================================
  -- Largest remainder dust adjustment (positive yield only)
  -- ============================================================
  IF v_total_seg_yield > 0 THEN
    v_residual := v_total_seg_yield - v_total_gross - v_fees_account_gross;

    IF v_residual != 0 AND v_largest_investor_id IS NOT NULL THEN
      v_adj_fee := ROUND((v_residual * COALESCE(v_largest_fee_pct, 0) / 100)::numeric, 8);
      -- IB dust adjustment from GROSS (ADDITIVE model)
      v_adj_ib := ROUND((v_residual * COALESCE(v_largest_ib_rate, 0) / 100)::numeric, 8);
      v_adj_net := v_residual - v_adj_fee - v_adj_ib;

      UPDATE _v5_tot SET
        total_gross = total_gross + v_residual,
        total_fee = total_fee + v_adj_fee,
        total_ib = total_ib + v_adj_ib,
        total_net = total_net + v_adj_net
      WHERE investor_id = v_largest_investor_id;

      v_total_gross := v_total_gross + v_residual;
      v_total_net := v_total_net + v_adj_net;
      v_total_fees := v_total_fees + v_adj_fee;
      v_total_ib := v_total_ib + v_adj_ib;
    END IF;
  ELSE
    v_residual := 0;
  END IF;

  -- ============================================================
  -- Create transactions and allocation records
  -- ============================================================
  FOR v_alloc IN
    SELECT t.investor_id, t.total_gross, t.total_fee, t.total_ib, t.total_net,
           t.seg_detail, t.ib_parent_id, t.ib_rate, t.investor_name
    FROM _v5_tot t
    WHERE t.total_net != 0 OR t.total_gross != 0
  LOOP
    -- YIELD transaction for investor (positive or negative)
    IF v_alloc.total_net != 0 THEN
      v_tx_result := apply_transaction_with_crystallization(
        p_investor_id := v_alloc.investor_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'YIELD',
        p_amount := v_alloc.total_net,  -- Can be negative for loss months
        p_tx_date := v_tx_date,
        p_reference_id := 'yield_v5_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'V5 segmented yield for ' || to_char(v_period_start, 'Mon YYYY') ||
          E'\n' || v_alloc.seg_detail::text,
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
          investor_balance = (
            SELECT COALESCE(current_value, 0) FROM investor_positions
            WHERE investor_id = v_alloc.investor_id AND fund_id = p_fund_id
          ),
          investor_share_pct = CASE
            WHEN v_total_gross != 0
            THEN ROUND((v_alloc.total_gross / v_total_gross * 100)::numeric, 6)
            ELSE 0
          END,
          fund_yield_pct = CASE
            WHEN v_opening_aum > 0
            THEN ROUND((v_total_gross / v_opening_aum * 100)::numeric, 6)
            ELSE 0
          END,
          gross_yield_amount = v_alloc.total_gross,
          fee_pct = CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
                         ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
          fee_amount = v_alloc.total_fee,
          ib_amount = v_alloc.total_ib,
          net_yield_amount = v_alloc.total_net
        WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
      END IF;

      -- yield_allocations
      INSERT INTO yield_allocations (
        distribution_id, investor_id, fund_id, gross_amount, net_amount,
        fee_amount, ib_amount, adb_share, fee_pct, ib_pct,
        transaction_id, created_at
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, p_fund_id,
        v_alloc.total_gross, v_alloc.total_net,
        v_alloc.total_fee, v_alloc.total_ib,
        0,
        CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
             ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
        v_alloc.ib_rate,
        v_yield_tx_id, NOW()
      );

      v_allocation_count := v_allocation_count + 1;
    END IF;

    -- Fee allocation records (positive yield only, skip for fees_account)
    IF v_alloc.total_fee > 0 AND v_alloc.investor_id != v_fees_account_id THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_alloc.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_alloc.total_gross,
        get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end),
        v_alloc.total_fee, NULL, v_admin
      );

      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date,
        asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id,
        NULLIF(v_alloc.investor_name, ''),
        v_alloc.total_gross,
        get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end),
        v_alloc.total_fee, v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    -- IB allocation (positive yield only)
    IF v_alloc.total_ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
      v_ib_tx_result := apply_transaction_with_crystallization(
        p_investor_id := v_alloc.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_alloc.total_ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit_v5_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'IB commission from V5 yield for ' || to_char(v_period_start, 'Mon YYYY'),
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
             v_alloc.total_gross, v_alloc.ib_rate, v_alloc.total_ib,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
    END IF;
  END LOOP;

  -- ============================================================
  -- FEE_CREDIT to fees_account (positive yield only)
  -- ============================================================
  IF v_total_fees > 0 THEN
    v_fee_tx_result := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_v5_' || v_distribution_id::text,
      p_notes := 'Platform fees from V5 yield for ' || to_char(v_period_start, 'Mon YYYY'),
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

  -- Auto-mark IB allocations as paid for reporting
  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
  END IF;

  -- ============================================================
  -- Update distribution header with final totals
  -- ============================================================
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
      'segments', v_segments_meta,
      'version', 'v5_scorched_earth',
      'opening_aum', v_opening_aum,
      'crystals_consolidated', v_crystals_consolidated,
      'ib_source', 'gross_yield',
      'negative_yield_support', true
    )
  WHERE id = v_distribution_id;

  -- ============================================================
  -- Record AUM
  -- ============================================================
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
  VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v5',
    is_month_end = EXCLUDED.is_month_end, updated_at = now();

  -- ============================================================
  -- Audit log
  -- ============================================================
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_V5_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('opening_aum', v_opening_aum),
    jsonb_build_object(
      'recorded_aum', p_recorded_aum, 'gross_yield', v_total_gross,
      'net_yield', v_total_net, 'total_fees', v_total_fees,
      'total_ib', v_total_ib, 'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id, 'fund_code', v_fund.code,
      'period_start', v_period_start, 'period_end', v_period_end,
      'purpose', p_purpose::text, 'calculation_method', 'segmented_v5_scorched_earth',
      'segment_count', v_seg_count, 'crystals_consolidated', v_crystals_consolidated,
      'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
      'dust_residual', v_residual, 'dust_receiver', v_largest_investor_id,
      'distribution_date', v_tx_date,
      'ib_source', 'gross_yield',
      'negative_yield_support', true,
      'segments', v_segments_meta
    )
  );

  -- ============================================================
  -- Final conservation check
  -- ============================================================
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_final_positions_sum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
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
    'segment_count', v_seg_count,
    'crystals_consolidated', v_crystals_consolidated,
    'segments', v_segments_meta,
    'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
    'position_sum', v_final_positions_sum,
    'position_aum_match', ABS(v_final_positions_sum - p_recorded_aum) < 0.00000001,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
    'distribution_date', v_tx_date,
    'fund_asset', v_fund.asset,
    'investor_count', v_allocation_count,
    'days_in_period', (v_period_end - v_period_start + 1),
    'ib_source', 'gross_yield',
    'negative_yield_support', true,
    'features', ARRAY[
      'segmented_proportional', 'per_segment_fees', 'per_segment_ib_rates',
      'ib_in_running_balance', 'fees_account_yield', 'largest_remainder',
      'crystal_consolidation', 'aum_only_input', 'segment_notes_in_tx',
      'inception_date_period_start', 'visibility_scope_control',
      'yield_event_enrichment', 'distribution_date_override',
      'ib_from_gross_yield', 'negative_yield_proportional_loss'
    ]
  );
END;
$function$;

-- =====================================================================
-- FIX 1 + 2 + 3: V5 Preview Engine (same fixes as apply)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund RECORD;
  v_fees_account_id uuid;
  v_period_start date;
  v_opening_aum numeric(28,10);
  v_gross_yield numeric(28,10);
  v_total_gross numeric(28,10) := 0;
  v_total_net numeric(28,10) := 0;
  v_total_fees numeric(28,10) := 0;
  v_total_ib numeric(28,10) := 0;
  v_dust numeric(28,10) := 0;
  v_investor_count integer := 0;
  v_segment_count integer := 0;
  v_segments jsonb := '[]'::jsonb;
  v_allocations jsonb := '[]'::jsonb;
  v_crystal_dates date[];
  v_seg_start date;
  v_seg_end date;
  v_seg_days integer;
  v_total_days integer;
  v_seg_yield numeric(28,10);
  v_seg_total_balance numeric(28,10);
  v_inv RECORD;
  v_fee_pct numeric(28,10);
  v_ib_pct numeric(28,10);
  v_ib_parent uuid;
  v_inv_gross numeric(28,10);
  v_inv_fee numeric(28,10);
  v_inv_net numeric(28,10);
  v_inv_ib numeric(28,10);
  v_inv_share numeric(28,10);
  v_crystal_count integer := 0;
  v_conservation_check boolean := true;
  v_result jsonb;
  v_is_negative_yield boolean := false;
BEGIN
  -- Validate inputs
  IF p_fund_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund ID is required');
  END IF;

  -- SCORCHED EARTH FIX: Allow negative AUM change (recorded_aum < opening_aum)
  -- but recorded_aum itself must still be positive (fund can't have negative total value)
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be positive');
  END IF;

  -- Get fund info
  SELECT id, code, asset, name, perf_fee_bps
  INTO v_fund
  FROM funds
  WHERE id = p_fund_id AND status = 'active';

  IF v_fund.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found or inactive');
  END IF;

  -- Get fees account
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE account_type = 'fees_account' AND is_system_account = true
  LIMIT 1;

  -- Determine period start
  SELECT COALESCE(
    (SELECT MAX(yd.period_end) + 1
     FROM yield_distributions yd
     WHERE yd.fund_id = p_fund_id
       AND yd.is_voided = false
       AND yd.status IN ('applied', 'corrected')
       AND yd.purpose = p_purpose),
    (SELECT f.inception_date FROM funds f WHERE f.id = p_fund_id)
  ) INTO v_period_start;

  v_total_days := (p_period_end - v_period_start) + 1;
  IF v_total_days <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Invalid period: %s to %s (%s days)', v_period_start, p_period_end, v_total_days));
  END IF;

  -- Get opening AUM (ALL positions including fees_account and IB)
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND ip.current_value > 0;

  IF v_opening_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active positions found for this fund');
  END IF;

  v_gross_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_gross_yield < 0);

  -- Get crystallization dates
  SELECT ARRAY_AGG(DISTINCT event_date ORDER BY event_date)
  INTO v_crystal_dates
  FROM investor_yield_events iye
  WHERE iye.fund_id = p_fund_id
    AND iye.event_date > v_period_start
    AND iye.event_date <= p_period_end
    AND iye.is_voided = false
    AND iye.trigger_type IN ('crystallization', 'deposit_crystal', 'withdrawal_crystal');

  v_crystal_count := COALESCE(array_length(v_crystal_dates, 1), 0);

  -- Create temp table for per-investor running totals
  CREATE TEMP TABLE IF NOT EXISTS _preview_investor_totals (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    account_type account_type,
    total_gross numeric(28,10) DEFAULT 0,
    total_fee numeric(28,10) DEFAULT 0,
    total_net numeric(28,10) DEFAULT 0,
    total_ib numeric(28,10) DEFAULT 0,
    fee_pct numeric(28,10) DEFAULT 0,
    ib_parent_id uuid,
    ib_rate numeric(28,10) DEFAULT 0,
    segments jsonb DEFAULT '[]'::jsonb
  );
  TRUNCATE _preview_investor_totals;

  -- Process segments
  v_seg_start := v_period_start;

  FOR i IN 0..v_crystal_count LOOP
    IF i < v_crystal_count THEN
      v_seg_end := v_crystal_dates[i + 1];
    ELSE
      v_seg_end := p_period_end;
    END IF;

    v_seg_days := (v_seg_end - v_seg_start) + 1;
    IF v_seg_days <= 0 THEN
      v_seg_start := v_seg_end + 1;
      CONTINUE;
    END IF;

    v_segment_count := v_segment_count + 1;

    -- Calculate segment yield proportionally
    v_seg_yield := ROUND((v_gross_yield * v_seg_days::numeric / v_total_days::numeric)::numeric, 8);

    -- Get total balance
    SELECT COALESCE(SUM(ip.current_value), 0)
    INTO v_seg_total_balance
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND ip.current_value > 0;

    -- SCORCHED EARTH FIX: Only skip if zero yield or no balance
    IF v_seg_yield = 0 OR v_seg_total_balance <= 0 THEN
      v_segments := v_segments || jsonb_build_object(
        'segment', v_segment_count,
        'start', v_seg_start,
        'end', v_seg_end,
        'days', v_seg_days,
        'yield', v_seg_yield,
        'skipped', true
      );
      v_seg_start := v_seg_end + 1;
      CONTINUE;
    END IF;

    v_segments := v_segments || jsonb_build_object(
      'segment', v_segment_count,
      'start', v_seg_start,
      'end', v_seg_end,
      'days', v_seg_days,
      'yield', ROUND(v_seg_yield, 8),
      'total_balance', ROUND(v_seg_total_balance, 8),
      'negative', (v_seg_yield < 0),
      'skipped', false
    );

    -- Allocate yield to each investor
    FOR v_inv IN
      SELECT ip.investor_id,
             COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
             p.account_type,
             ip.current_value as balance,
             p.ib_parent_id,
             p.ib_percentage
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id
        AND ip.is_active = true
        AND ip.current_value > 0
    LOOP
      v_inv_share := ROUND((v_inv.balance / v_seg_total_balance)::numeric, 10);
      v_inv_gross := ROUND((v_seg_yield * v_inv_share)::numeric, 8);

      -- SCORCHED EARTH FIX: Negative yield = fees and IB are ZERO
      IF v_seg_yield < 0 THEN
        v_fee_pct := 0;
        v_inv_fee := 0;
        v_ib_pct := 0;
        v_inv_ib := 0;
        v_inv_net := v_inv_gross; -- Full loss
      ELSE
        -- Determine fee percentage
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          SELECT COALESCE(
            (SELECT fee_pct FROM investor_fee_schedule
             WHERE investor_id = v_inv.investor_id
               AND (fund_id = p_fund_id OR fund_id IS NULL)
               AND effective_date <= p_period_end
               AND (end_date IS NULL OR end_date >= p_period_end)
             ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1),
            (SELECT p2.fee_pct FROM profiles p2 WHERE p2.id = v_inv.investor_id),
            COALESCE(v_fund.perf_fee_bps::numeric / 100.0, 20.0)
          ) INTO v_fee_pct;
        END IF;

        v_inv_fee := ROUND((v_inv_gross * v_fee_pct / 100.0)::numeric, 8);

        -- IB from GROSS yield (ADDITIVE model: fee + IB both from gross)
        v_ib_parent := v_inv.ib_parent_id;
        v_ib_pct := COALESCE(
          (SELECT ib_percentage FROM ib_commission_schedule
           WHERE investor_id = v_inv.investor_id
             AND (fund_id = p_fund_id OR fund_id IS NULL)
             AND effective_date <= p_period_end
             AND (end_date IS NULL OR end_date >= p_period_end)
           ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1),
          v_inv.ib_percentage,
          0
        );

        IF v_ib_parent IS NULL OR v_ib_pct <= 0 THEN
          v_inv_ib := 0;
          v_ib_pct := 0;
        ELSE
          -- IB = gross * ib_rate / 100
          v_inv_ib := ROUND((v_inv_gross * v_ib_pct / 100.0)::numeric, 8);
        END IF;

        v_inv_net := v_inv_gross - v_inv_fee - v_inv_ib;
      END IF;

      -- Accumulate (exclude fees_account from header totals)
      IF v_inv.account_type != 'fees_account' THEN
        v_total_gross := v_total_gross + v_inv_gross;
        v_total_fees := v_total_fees + v_inv_fee;
        v_total_ib := v_total_ib + v_inv_ib;
        v_total_net := v_total_net + v_inv_net;
      END IF;

      -- Upsert running totals
      INSERT INTO _preview_investor_totals (investor_id, investor_name, account_type, total_gross, total_fee, total_net, total_ib, fee_pct, ib_parent_id, ib_rate, segments)
      VALUES (v_inv.investor_id, v_inv.investor_name, v_inv.account_type, v_inv_gross, v_inv_fee, v_inv_net, v_inv_ib, v_fee_pct, v_ib_parent, v_ib_pct,
        jsonb_build_array(jsonb_build_object('seg', v_segment_count, 'gross', ROUND(v_inv_gross, 8), 'fee', ROUND(v_inv_fee, 8), 'net', ROUND(v_inv_net, 8), 'ib', ROUND(v_inv_ib, 8), 'share_pct', ROUND(v_inv_share * 100, 6)))
      )
      ON CONFLICT (investor_id) DO UPDATE SET
        total_gross = _preview_investor_totals.total_gross + v_inv_gross,
        total_fee = _preview_investor_totals.total_fee + v_inv_fee,
        total_net = _preview_investor_totals.total_net + v_inv_net,
        total_ib = _preview_investor_totals.total_ib + v_inv_ib,
        fee_pct = v_fee_pct,
        ib_parent_id = v_ib_parent,
        ib_rate = v_ib_pct,
        segments = _preview_investor_totals.segments || jsonb_build_array(jsonb_build_object('seg', v_segment_count, 'gross', ROUND(v_inv_gross, 8), 'fee', ROUND(v_inv_fee, 8), 'net', ROUND(v_inv_net, 8), 'ib', ROUND(v_inv_ib, 8), 'share_pct', ROUND(v_inv_share * 100, 6)));
    END LOOP;

    v_seg_start := v_seg_end + 1;
  END LOOP;

  -- Build allocations output (include ALL accounts, even negative)
  SELECT jsonb_agg(
    jsonb_build_object(
      'investor_id', t.investor_id,
      'investor_name', t.investor_name,
      'account_type', t.account_type,
      'gross', ROUND(t.total_gross, 8),
      'fee', ROUND(t.total_fee, 8),
      'net', ROUND(t.total_net, 8),
      'ib', ROUND(t.total_ib, 8),
      'fee_pct', ROUND(t.fee_pct, 4),
      'ib_parent_id', t.ib_parent_id,
      'ib_rate', ROUND(t.ib_rate, 4),
      'segments', t.segments
    ) ORDER BY t.total_gross DESC
  )
  INTO v_allocations
  FROM _preview_investor_totals t
  WHERE t.total_gross != 0; -- Changed from > 0 to != 0 for negative yield

  -- Count investors
  SELECT COUNT(*) INTO v_investor_count
  FROM _preview_investor_totals t
  WHERE t.total_gross != 0 AND t.account_type = 'investor';

  -- Calculate dust
  v_dust := v_gross_yield - (v_total_gross + (
    SELECT COALESCE(SUM(t.total_gross), 0) FROM _preview_investor_totals t WHERE t.account_type = 'fees_account'
  ));

  -- Conservation check
  v_conservation_check := ABS(v_total_gross - (v_total_net + v_total_fees + v_total_ib)) < 0.00000001;

  -- Clean up
  DROP TABLE IF EXISTS _preview_investor_totals;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'fund_id', v_fund.id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', p_period_end,
    'days_in_period', v_total_days,
    'opening_aum', ROUND(v_opening_aum, 8),
    'recorded_aum', ROUND(p_recorded_aum, 8),
    'gross_yield', ROUND(v_total_gross, 8),
    'net_yield', ROUND(v_total_net, 8),
    'total_fees', ROUND(v_total_fees, 8),
    'total_ib', ROUND(v_total_ib, 8),
    'dust_amount', ROUND(v_dust, 8),
    'investor_count', v_investor_count,
    'segment_count', v_segment_count,
    'segments', v_segments,
    'allocations', COALESCE(v_allocations, '[]'::jsonb),
    'crystal_count', v_crystal_count,
    'conservation_check', v_conservation_check,
    'is_negative_yield', v_is_negative_yield,
    'ib_source', 'gross_yield',
    'features', jsonb_build_array('segmented_proportional', 'ib_from_gross_yield', 'negative_yield_proportional_loss'),
    'purpose', p_purpose
  );

  RETURN v_result;
END;
$function$;

-- Drop the duplicate text-based overload if it exists
DROP FUNCTION IF EXISTS public.preview_segmented_yield_distribution_v5(uuid, date, numeric, text);
