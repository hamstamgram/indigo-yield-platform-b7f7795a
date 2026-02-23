-- 1. get_active_funds_summary
CREATE OR REPLACE FUNCTION get_active_funds_summary()
RETURNS TABLE(id uuid, code text, name text, asset text, total_aum numeric, investor_count bigint, aum_record_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.check_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH fund_metrics AS (
    SELECT
      ip.fund_id,
      SUM(ip.current_value) as calculated_aum,
      COUNT(DISTINCT CASE WHEN p.account_type = 'investor' THEN ip.investor_id END) as distinct_investors
    FROM investor_positions ip
    JOIN profiles p ON ip.investor_id = p.id
    WHERE ip.current_value > 0
    GROUP BY ip.fund_id
  )
  SELECT
    f.id,
    f.code,
    f.name,
    f.asset,
    COALESCE(fm.calculated_aum, 0) as total_aum,
    COALESCE(fm.distinct_investors, 0) as investor_count,
    0::bigint as aum_record_count -- Deprecated
  FROM funds f
  LEFT JOIN fund_metrics fm ON f.id = fm.fund_id
  WHERE f.status = 'active'
  ORDER BY total_aum DESC NULLS LAST;
END;
$$;


-- 2. reset_all_data_keep_profiles
CREATE OR REPLACE FUNCTION reset_all_data_keep_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM require_super_admin();
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  DELETE FROM yield_allocations;
  DELETE FROM fee_allocations;
  DELETE FROM ib_allocations;
  DELETE FROM ib_commission_ledger;
  DELETE FROM platform_fee_ledger;
  DELETE FROM transactions_v2;
  DELETE FROM yield_distributions;
  DELETE FROM investor_positions;
  DELETE FROM investor_fund_performance;
  DELETE FROM generated_statements;
  DELETE FROM withdrawal_requests;
  DELETE FROM data_edit_audit;
END;
$$;


-- 3. cascade_void_to_allocations
CREATE OR REPLACE FUNCTION cascade_void_to_allocations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_voided = true AND (OLD.is_voided = false OR OLD.is_voided IS NULL) THEN
    UPDATE yield_allocations SET is_voided = true
    WHERE distribution_id = NEW.id AND (is_voided = false OR is_voided IS NULL);
    UPDATE fee_allocations SET is_voided = true, voided_at = NOW()
    WHERE distribution_id = NEW.id AND (is_voided = false OR is_voided IS NULL);
    UPDATE ib_allocations SET is_voided = true, voided_at = NOW()
    WHERE distribution_id = NEW.id AND (is_voided = false OR is_voided IS NULL);
  END IF;
  RETURN NEW;
END;
$$;


-- 4. void_transaction
CREATE OR REPLACE FUNCTION void_transaction(
    p_transaction_id uuid,
    p_admin_id uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx RECORD;
  v_alloc RECORD;
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
  v_yield_allocations_voided int := 0;
  v_ib_allocations_voided int := 0;
  v_credits_voided int := 0;
  v_date date;
BEGIN
  -- ===== ADVISORY LOCK =====
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Authorization Check
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: admin role required'; END IF;
  IF NOT check_is_admin(p_admin_id) THEN RAISE EXCEPTION 'Unauthorized for user %', p_admin_id; END IF;

  -- Load Transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found: %', p_transaction_id; END IF;
  IF v_tx.is_voided THEN RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id; END IF;

  -- First Principles Historical Lock
  IF check_historical_lock(v_tx.fund_id, v_tx.tx_date) THEN
    RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot void a transaction on % because a subsequent Yield Distribution is locked on the ledger. You must void the subsequent yield distributions first to safely unwind the ledger.', v_tx.tx_date;
  END IF;

  -- 1. Void the transaction itself
  UPDATE transactions_v2 SET 
    is_voided = true, 
    voided_at = now(), 
    voided_by = p_admin_id,
    voided_by_profile_id = p_admin_id, 
    void_reason = p_reason
  WHERE id = p_transaction_id;

  -- 2. Cascade Void: Fee Allocations linked to this transaction
  UPDATE fee_allocations SET 
    is_voided = true, 
    voided_at = now(), 
    voided_by = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id) 
    AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  -- 3. Cascade Void: IB Ledger
  UPDATE ib_commission_ledger SET 
    is_voided = true, 
    voided_at = now(), 
    voided_by = p_admin_id,
    void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id 
    AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  -- 4. Cascade Void: Platform Fee Ledger
  UPDATE platform_fee_ledger SET 
    is_voided = true, 
    voided_at = now(), 
    voided_by = p_admin_id,
    void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id 
    AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  -- 5. Cascade Void: Yield Allocations and linked Credit Transactions (V7 FIX)
  IF v_tx.type = 'YIELD' THEN
    SELECT * INTO v_alloc FROM yield_allocations WHERE transaction_id = p_transaction_id AND is_voided = false;
    IF FOUND THEN
        IF v_alloc.fee_credit_transaction_id IS NOT NULL THEN
            UPDATE transactions_v2 SET 
              is_voided = true, 
              voided_at = now(), 
              voided_by = p_admin_id,
              void_reason = 'Cascade void from yield: ' || p_transaction_id::text
            WHERE id = v_alloc.fee_credit_transaction_id AND is_voided = false;
            v_credits_voided := v_credits_voided + 1;
        END IF;

        IF v_alloc.ib_credit_transaction_id IS NOT NULL THEN
            UPDATE transactions_v2 SET 
              is_voided = true, 
              voided_at = now(), 
              voided_by = p_admin_id,
              void_reason = 'Cascade void from yield: ' || p_transaction_id::text
            WHERE id = v_alloc.ib_credit_transaction_id AND is_voided = false;
            v_credits_voided := v_credits_voided + 1;
        END IF;

        IF v_alloc.distribution_id IS NOT NULL THEN
            UPDATE yield_distributions SET
              gross_yield = gross_yield - v_alloc.gross_amount,
              gross_yield_amount = gross_yield_amount - v_alloc.gross_amount,
              total_net_amount = total_net_amount - v_alloc.net_amount,
              total_fee_amount = total_fee_amount - v_alloc.fee_amount,
              total_ib_amount = total_ib_amount - v_alloc.ib_amount,
              net_yield = net_yield - v_alloc.net_amount,
              total_fees = total_fees - v_alloc.fee_amount,
              total_ib = total_ib - v_alloc.ib_amount,
              allocation_count = allocation_count - 1
            WHERE id = v_alloc.distribution_id;
        END IF;

        UPDATE yield_allocations SET is_voided = true WHERE id = v_alloc.id;
        v_yield_allocations_voided := 1;
    END IF;
  ELSIF v_tx.type = 'FEE' OR v_tx.type = 'IB' THEN
    UPDATE yield_allocations SET is_voided = true
    WHERE (fee_transaction_id = p_transaction_id OR ib_transaction_id = p_transaction_id)
      AND is_voided = false;
    GET DIAGNOSTICS v_yield_allocations_voided = ROW_COUNT;
  END IF;

  -- 6. Distribution Parent Update (Legacy/Safety)
  IF v_tx.type = 'YIELD' AND v_tx.distribution_id IS NOT NULL AND v_yield_allocations_voided = 0 THEN
    UPDATE yield_distributions 
    SET allocation_count = allocation_count - 1,
        investor_count = investor_count - 1
    WHERE id = v_tx.distribution_id AND is_voided = false;
  END IF;

  -- audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'daily_aum_voided', v_daily_aum_voided, 
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided, 
      'platform_fee_voided', v_platform_fee_voided,
      'yield_allocations_voided', v_yield_allocations_voided,
      'credits_voided', v_credits_voided),
    jsonb_build_object('source', 'void_transaction_v7_1to1', 'v7_1to1_credits', true));

  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id, 
    'voided_at', now(),
    'daily_aum_voided', v_daily_aum_voided, 
    'fee_allocations_voided', v_fee_allocations_voided,
    'ib_ledger_voided', v_ib_ledger_voided, 
    'platform_fee_voided', v_platform_fee_voided,
    'yield_allocations_voided', v_yield_allocations_voided,
    'credits_voided', v_credits_voided,
    'message', 'Transaction voided with recursive 1:1 credit cascade and distribution total updates');
END;
$$;


-- 5. apply_segmented_yield_distribution_v5
CREATE OR REPLACE FUNCTION apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_recorded_aum numeric,
    p_period_end date,
    p_purpose text,
    p_created_by uuid,
    p_distribution_date date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_distribution_id uuid;
    v_total_yield numeric;
    v_total_fees numeric;
    v_total_ib numeric;
    v_total_fee_credit numeric := 0;
    v_total_ib_credit numeric := 0;
    v_investor_count integer;
    v_period_start date;
    v_fees_account_id uuid;
    v_opening_aum numeric;
    v_fund_asset text;
    v_fund_class text;
    v_alloc record;
    v_tx_id uuid;
    v_closing_aum numeric;
    v_dist_date date;
    v_visibility visibility_scope;
BEGIN
    -- 1. Set canonical mutation guard
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    v_dist_date := COALESCE(p_distribution_date, p_period_end);

    -- FIRST PRINCIPLES: Historical Lock Check
    IF check_historical_lock(p_fund_id, v_dist_date, true) THEN
        RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot apply yield distribution on % because a distribution already exists for this date or a subsequent distribution is locked.', v_dist_date;
    END IF;

    -- 2. Establish context
    v_period_start := date_trunc('month', p_period_end);

    SELECT id INTO v_fees_account_id FROM profiles
    WHERE account_type = 'fees_account'::account_type
    ORDER BY created_at ASC LIMIT 1;

    SELECT asset, fund_class INTO v_fund_asset, v_fund_class
    FROM funds WHERE id = p_fund_id;

    SELECT COALESCE(SUM(current_value), 0) INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    -- 2b. Materialize allocations
    CREATE TEMP TABLE _yield_alloc ON COMMIT DROP AS
      SELECT * FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end);

    -- 3. Calculate Totals
    SELECT
        COALESCE(SUM(gross), 0),
        COALESCE(SUM(fee), 0),
        COALESCE(SUM(ib), 0),
        COALESCE(SUM(fee_credit), 0),
        COALESCE(SUM(ib_credit), 0),
        COUNT(DISTINCT investor_id)
    INTO
        v_total_yield, v_total_fees, v_total_ib,
        v_total_fee_credit, v_total_ib_credit,
        v_investor_count
    FROM _yield_alloc;

    -- 4. Insert Distribution Header
    INSERT INTO yield_distributions (
        fund_id, effective_date, recorded_aum, gross_yield, total_fees, total_ib,
        total_fee_credit, total_ib_credit, created_by, purpose,
        period_end, period_start, status, opening_aum, net_yield, investor_count,
        gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, allocation_count
    ) VALUES (
        p_fund_id, v_dist_date, p_recorded_aum, v_total_yield, v_total_fees, v_total_ib,
        v_total_fee_credit, v_total_ib_credit, p_created_by, p_purpose,
        p_period_end, v_period_start, 'applied', v_opening_aum,
        (v_total_yield - v_total_fees - v_total_ib), v_investor_count,
        v_total_yield, (v_total_yield - v_total_fees - v_total_ib),
        v_total_fees, v_total_ib, v_investor_count
    ) RETURNING id INTO v_distribution_id;

    -- 5. Insert yield_allocations
    INSERT INTO yield_allocations (
        distribution_id, investor_id, fund_id,
        position_value_at_calc, ownership_pct, gross_amount,
        fee_pct, fee_amount, ib_pct, ib_amount, net_amount,
        fee_credit, ib_credit
    )
    SELECT
        v_distribution_id, investor_id, p_fund_id,
        current_value, share, gross,
        fee_pct, fee, ib_rate, ib, net,
        fee_credit, ib_credit
    FROM _yield_alloc;

    -- 6. Create transactions 
    v_visibility := CASE WHEN p_purpose = 'reporting' THEN 'investor_visible' ELSE 'admin_only' END::visibility_scope;

    -- Investor Yield Credits
    FOR v_alloc IN SELECT investor_id, net FROM _yield_alloc WHERE net != 0
    LOOP
        INSERT INTO transactions_v2 (
            fund_id, investor_id, tx_date, value_date,
            asset, fund_class, amount, type, source,
            distribution_id, reference_id,
            is_system_generated, purpose, visibility_scope, created_by
        ) VALUES (
            p_fund_id, v_alloc.investor_id, v_dist_date, v_dist_date,
            v_fund_asset, v_fund_class, v_alloc.net, 'YIELD'::tx_type, 'yield_distribution'::tx_source,
            v_distribution_id, 'yield_v5_' || v_distribution_id || '_' || v_alloc.investor_id,
            true, p_purpose, v_visibility, p_created_by
        ) RETURNING id INTO v_tx_id;
        
        UPDATE yield_allocations SET transaction_id = v_tx_id 
        WHERE distribution_id = v_distribution_id AND investor_id = v_alloc.investor_id;
    END LOOP;

    -- Platform Fee Credits
    IF v_total_fee_credit != 0 AND v_fees_account_id IS NOT NULL THEN
        INSERT INTO transactions_v2 ( 
            fund_id, investor_id, tx_date, value_date, asset, fund_class, 
            amount, type, source, distribution_id, reference_id, 
            is_system_generated, purpose, visibility_scope, created_by 
        )
        VALUES ( 
            p_fund_id, v_fees_account_id, v_dist_date, v_dist_date, 
            v_fund_asset, v_fund_class, v_total_fee_credit, 'FEE_CREDIT'::tx_type, 
            'yield_distribution'::tx_source, v_distribution_id, 'fee_credit_v5_' || v_distribution_id, 
            true, p_purpose, 'admin_only'::visibility_scope, p_created_by 
        )
        RETURNING id INTO v_tx_id;
        
        UPDATE yield_allocations SET fee_credit_transaction_id = v_tx_id 
        WHERE distribution_id = v_distribution_id AND fee_credit != 0;
    END IF;

    -- IB Commission Credits
    FOR v_alloc IN SELECT ib_parent_id AS investor_id, SUM(ib) AS total_ib_amount 
                   FROM _yield_alloc WHERE ib != 0 AND ib_parent_id IS NOT NULL 
                   GROUP BY ib_parent_id
    LOOP
        INSERT INTO transactions_v2 ( 
            fund_id, investor_id, tx_date, value_date, asset, fund_class, 
            amount, type, source, distribution_id, reference_id, 
            is_system_generated, purpose, visibility_scope, created_by 
        )
        VALUES ( 
            p_fund_id, v_alloc.investor_id, v_dist_date, v_dist_date, 
            v_fund_asset, v_fund_class, v_alloc.total_ib_amount, 'IB_CREDIT'::tx_type, 
            'yield_distribution'::tx_source, v_distribution_id, 'ib_credit_v5_' || v_distribution_id || '_' || v_alloc.investor_id, 
            true, p_purpose, 'admin_only'::visibility_scope, p_created_by 
        )
        RETURNING id INTO v_tx_id;
        
        UPDATE yield_allocations SET ib_credit_transaction_id = v_tx_id 
        WHERE distribution_id = v_distribution_id 
          AND investor_id IN (
              SELECT ya_inner.investor_id 
              FROM yield_allocations ya_inner 
              JOIN profiles p_inner ON p_inner.id = ya_inner.investor_id 
              WHERE ya_inner.distribution_id = v_distribution_id 
                AND p_inner.ib_parent_id = v_alloc.investor_id
          );
    END LOOP;

    -- 7. Legacy Tracking
    INSERT INTO fee_allocations ( distribution_id, fund_id, investor_id, fees_account_id, period_start, period_end, purpose, base_net_income, fee_percentage, fee_amount, created_by )
    SELECT v_distribution_id, p_fund_id, investor_id, v_fees_account_id, v_period_start, p_period_end, p_purpose, gross, fee_pct, fee, p_created_by FROM _yield_alloc WHERE fee > 0;

    INSERT INTO ib_allocations ( distribution_id, fund_id, ib_investor_id, source_investor_id, source_net_income, ib_percentage, ib_fee_amount, effective_date, period_start, period_end, purpose, created_by )
    SELECT v_distribution_id, p_fund_id, ib_parent_id, investor_id, gross, ib_rate, ib, v_dist_date, v_period_start, p_period_end, p_purpose, p_created_by FROM _yield_alloc WHERE ib > 0;

    -- 8. Final AUM logic (from positions - now guaranteed to be updated by transactions above)
    SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum FROM investor_positions WHERE fund_id = p_fund_id AND is_active = true;
    UPDATE yield_distributions SET closing_aum = v_closing_aum WHERE id = v_distribution_id;

    PERFORM set_config('indigo.canonical_rpc', 'false', true);
    RETURN v_distribution_id;
END;
$$;


-- 6. validate_yield_parameters
CREATE OR REPLACE FUNCTION validate_yield_parameters(
    p_fund_id uuid,
    p_yield_date date,
    p_purpose text,
    p_gross_yield_pct numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fund_aum numeric(28,10);
  v_gross_yield numeric(28,10);
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
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

  IF p_gross_yield_pct < -50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_LOW', 'message', 'Negative yield exceeds -50% - please verify');
  END IF;

  -- Check AUM exists (Dynamically calculated based on transactions snapshot)
  -- Uses the active unified logic to fetch AUM exactly on the given date
  SELECT snapshot_aum INTO v_fund_aum
  FROM get_funds_aum_snapshot(p_yield_date)
  WHERE fund_id = p_fund_id;

  IF v_fund_aum IS NULL THEN
    -- Fallback to sum of positions if snapshot missed it (shouldn't happen)
    SELECT COALESCE(SUM(current_value), 0) INTO v_fund_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id;
  END IF;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
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
$$;

-- 7. force_delete_investor
CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid, p_admin_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE v_admin uuid; v_name text;
BEGIN
  -- We allow passing admin_id from edge function or fallback to session
  v_admin := COALESCE(p_admin_id, auth.uid());
  
  -- Basic auth check if no p_admin_id provided
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name
  FROM profiles WHERE id = p_investor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Investor not found');
  END IF;

  -- Bypassing the canonical trigger is necessary for full deletion
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- 1. Notifications & Comms
  DELETE FROM notifications WHERE user_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id OR user_id = p_investor_id;
  DELETE FROM support_tickets WHERE user_id = p_investor_id;

  -- 2. Compliance & Alerts
  DELETE FROM risk_alerts WHERE investor_id = p_investor_id OR acknowledged_by = p_investor_id OR resolved_by = p_investor_id;
  DELETE FROM admin_integrity_runs WHERE scope_investor_id = p_investor_id OR created_by = p_investor_id;
  DELETE FROM admin_alerts WHERE acknowledged_by = p_investor_id;
  
  -- 3. Yield & Fees
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id OR ib_investor_id = p_investor_id OR created_by = p_investor_id OR paid_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE source_investor_id = p_investor_id OR ib_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;
  DELETE FROM ib_commission_schedule WHERE investor_id = p_investor_id;
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM platform_fee_ledger WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;

  -- 4. Transactions & Positions
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id OR created_by = p_investor_id OR approved_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM investor_position_snapshots WHERE investor_id = p_investor_id;
  DELETE FROM investor_daily_balance WHERE investor_id = p_investor_id;
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id OR approved_by = p_investor_id OR rejected_by = p_investor_id OR cancelled_by = p_investor_id OR created_by = p_investor_id;

  -- 5. Documents & Statements
  DELETE FROM generated_statements WHERE investor_id = p_investor_id OR user_id = p_investor_id OR generated_by = p_investor_id;
  DELETE FROM statements WHERE investor_id = p_investor_id OR investor_profile_id = p_investor_id;
  DELETE FROM documents WHERE user_profile_id = p_investor_id OR created_by_profile_id = p_investor_id;

  -- 6. Infrastructure & Config
  -- ( fund_daily_aum deprecated )
  UPDATE yield_distributions SET dust_receiver_id = NULL WHERE dust_receiver_id = p_investor_id;
  UPDATE yield_distributions SET voided_by = NULL WHERE voided_by = p_investor_id;
  UPDATE global_fee_settings SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE system_config SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE statement_periods SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE statement_periods SET finalized_by = NULL WHERE finalized_by = p_investor_id;

  -- 7. Identity & Access
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;
  DELETE FROM data_edit_audit WHERE edited_by = p_investor_id;
  DELETE FROM profiles WHERE id = p_investor_id;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, meta)
  VALUES (v_admin, 'FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text,
    jsonb_build_object('investor_name', v_name, 'v10_canonical_bypass', true));

  RETURN jsonb_build_object('success', true, 'deleted_investor', p_investor_id, 'name', v_name);
END;
$$;
