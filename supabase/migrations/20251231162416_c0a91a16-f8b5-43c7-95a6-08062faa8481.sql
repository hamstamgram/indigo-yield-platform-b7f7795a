-- ============================================================================
-- PLATFORM OPERATIONS REMEDIATION: Phases 1-6
-- Superadmin enforcement, IB logic, negative balance block, duplicate yield warning
-- ============================================================================

-- ============================================================================
-- PHASE 1: Helper function for superadmin requirement
-- ============================================================================
CREATE OR REPLACE FUNCTION public.require_super_admin(p_operation TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Superadmin required for %', p_operation;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.require_super_admin(TEXT) TO authenticated;

-- ============================================================================
-- PHASE 1: Update void_transaction with superadmin check
-- ============================================================================
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
  v_counterparty_tx RECORD;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_voided_fee_allocations int := 0;
  v_voided_ib_allocations int := 0;
  v_temp_count int := 0;
  v_distribution_voided boolean := false;
  v_withdrawal_cancelled boolean := false;
  v_ib_reversal_created boolean := false;
  v_resulting_balance numeric;
BEGIN
  -- PHASE 1: Require superadmin for void operations
  PERFORM public.require_super_admin('void_transaction');
  
  -- Get transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Check if already voided
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Require reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Void reason must be at least 3 characters';
  END IF;
  
  -- PHASE 3: Check if voiding would cause negative balance
  SELECT COALESCE(current_value, 0) - v_tx.amount INTO v_resulting_balance
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;
  
  IF v_resulting_balance IS NOT NULL AND v_resulting_balance < 0 AND v_tx.amount > 0 THEN
    RAISE EXCEPTION 'Cannot void: would result in negative balance (%.8f)', v_resulting_balance;
  END IF;
  
  -- Update transaction to voided
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;
  
  -- Recompute position for affected investor/fund
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- ========================================================================
  -- CASCADE 1: Void related fee_allocations
  -- ========================================================================
  UPDATE fee_allocations
  SET is_voided = true, 
      voided_at = now(), 
      voided_by = v_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_fee_allocations = ROW_COUNT;
  
  -- For YIELD/INTEREST transactions, void fee_allocations by distribution_id + investor
  IF v_tx.type IN ('YIELD', 'INTEREST') AND v_tx.distribution_id IS NOT NULL THEN
    UPDATE fee_allocations
    SET is_voided = true, 
        voided_at = now(), 
        voided_by = v_admin_id
    WHERE distribution_id = v_tx.distribution_id
      AND investor_id = v_tx.investor_id
      AND is_voided = false;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_voided_fee_allocations := v_voided_fee_allocations + v_temp_count;
  END IF;
  
  -- ========================================================================
  -- CASCADE 2: PHASE 4 - Create IB reversal transactions instead of just voiding
  -- ========================================================================
  IF v_tx.type = 'IB_CREDIT' THEN
    -- Create IB_DEBIT reversal transaction instead of voiding ib_allocations
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, fund_class,
      amount, tx_date, reference_id, notes, created_by,
      purpose, visibility_scope, is_system_generated, source
    )
    SELECT 
      v_tx.investor_id,
      v_tx.fund_id,
      'IB_DEBIT'::tx_type,
      v_tx.asset,
      v_tx.fund_class,
      -ABS(v_tx.amount),
      CURRENT_DATE,
      'reversal:' || p_transaction_id::text,
      'IB reversal: ' || p_reason,
      v_admin_id,
      v_tx.purpose,
      'admin_only',
      true,
      'void_reversal'
    WHERE NOT EXISTS (
      SELECT 1 FROM transactions_v2 
      WHERE reference_id = 'reversal:' || p_transaction_id::text
    );
    
    IF FOUND THEN
      v_ib_reversal_created := true;
      PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
    END IF;
    
    UPDATE ib_allocations
    SET is_voided = true, 
        voided_at = now(), 
        voided_by = v_admin_id
    WHERE ib_investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND effective_date = v_tx.tx_date
      AND is_voided = false;
    GET DIAGNOSTICS v_voided_ib_allocations = ROW_COUNT;
  END IF;
  
  -- For YIELD/INTEREST transactions, also handle IB reversals for source investor
  IF v_tx.type IN ('YIELD', 'INTEREST') AND v_tx.distribution_id IS NOT NULL THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, fund_class,
      amount, tx_date, reference_id, notes, created_by,
      purpose, visibility_scope, is_system_generated, source
    )
    SELECT 
      ia.ib_investor_id,
      ia.fund_id,
      'IB_DEBIT'::tx_type,
      v_tx.asset,
      v_tx.fund_class,
      -ABS(ia.ib_fee_amount),
      CURRENT_DATE,
      'reversal:ib:' || ia.id::text,
      'IB reversal (source yield voided): ' || p_reason,
      v_admin_id,
      v_tx.purpose,
      'admin_only',
      true,
      'void_reversal'
    FROM ib_allocations ia
    WHERE ia.source_investor_id = v_tx.investor_id
      AND ia.distribution_id = v_tx.distribution_id
      AND ia.is_voided = false
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 
        WHERE reference_id = 'reversal:ib:' || ia.id::text
      );
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    
    PERFORM recompute_investor_position(ia.ib_investor_id, ia.fund_id)
    FROM ib_allocations ia
    WHERE ia.source_investor_id = v_tx.investor_id
      AND ia.distribution_id = v_tx.distribution_id;
    
    UPDATE ib_allocations
    SET is_voided = true, 
        voided_at = now(), 
        voided_by = v_admin_id
    WHERE source_investor_id = v_tx.investor_id
      AND distribution_id = v_tx.distribution_id
      AND is_voided = false;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_voided_ib_allocations := v_voided_ib_allocations + v_temp_count;
  END IF;
  
  -- ========================================================================
  -- CASCADE 3: Check if all transactions for distribution are voided
  -- ========================================================================
  IF v_tx.distribution_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2 
      WHERE distribution_id = v_tx.distribution_id 
        AND is_voided = false
    ) THEN
      UPDATE yield_distributions
      SET status = 'voided', 
          voided_at = now(), 
          voided_by = v_admin_id, 
          void_reason = 'All transactions voided'
      WHERE id = v_tx.distribution_id
        AND status != 'voided';
      
      IF FOUND THEN
        v_distribution_voided := true;
      END IF;
    END IF;
  END IF;
  
  -- ========================================================================
  -- CASCADE 4/PHASE 6: Enhanced withdrawal cancellation
  -- ========================================================================
  IF v_tx.type = 'WITHDRAWAL' THEN
    UPDATE withdrawal_requests
    SET status = 'cancelled',
        cancellation_reason = 'Transaction voided: ' || p_reason,
        cancelled_by = v_admin_id,
        cancelled_at = now(),
        updated_at = now(),
        version = COALESCE(version, 0) + 1
    WHERE investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND status = 'completed'
      AND ABS(COALESCE(processed_amount, requested_amount) - ABS(v_tx.amount)) < 0.01
      AND DATE(processed_at) = v_tx.tx_date;
    
    IF FOUND THEN
      v_withdrawal_cancelled := true;
    END IF;
  END IF;
  
  -- ========================================================================
  -- Handle paired transactions
  -- ========================================================================
  IF v_tx.type = 'FEE' AND v_tx.reference_id IS NOT NULL THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE reference_id LIKE 'fee_credit_%' 
      AND fund_id = v_tx.fund_id
      AND type = 'FEE_CREDIT'
      AND investor_id = v_fees_account_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_fees_account_id, v_tx.fund_id);
    END IF;
  END IF;
  
  IF v_tx.type = 'FEE_CREDIT' AND v_tx.investor_id = v_fees_account_id THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'FEE'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
      
      UPDATE fee_allocations
      SET is_voided = true, 
          voided_at = now(), 
          voided_by = v_admin_id
      WHERE (credit_transaction_id = v_counterparty_tx.id OR debit_transaction_id = v_counterparty_tx.id)
        AND is_voided = false;
    END IF;
  END IF;
  
  IF v_tx.type = 'INTERNAL_WITHDRAWAL' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_CREDIT'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND amount = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  IF v_tx.type = 'INTERNAL_CREDIT' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_WITHDRAWAL'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = v_tx.amount
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- ========================================================================
  -- Audit log
  -- ========================================================================
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'id', v_tx.id,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'is_voided', false,
      'is_system_generated', v_tx.is_system_generated,
      'distribution_id', v_tx.distribution_id
    ),
    jsonb_build_object(
      'is_voided', true, 
      'voided_at', now(),
      'voided_by', v_admin_id,
      'void_reason', p_reason,
      'counterparty_voided', v_counterparty_tx IS NOT NULL,
      'fee_allocations_voided', v_voided_fee_allocations,
      'ib_allocations_voided', v_voided_ib_allocations,
      'ib_reversal_created', v_ib_reversal_created,
      'distribution_voided', v_distribution_voided,
      'withdrawal_cancelled', v_withdrawal_cancelled
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'voided_amount', v_tx.amount,
    'counterparty_voided', v_counterparty_tx IS NOT NULL,
    'fee_allocations_voided', v_voided_fee_allocations,
    'ib_allocations_voided', v_voided_ib_allocations,
    'ib_reversal_created', v_ib_reversal_created,
    'distribution_voided', v_distribution_voided,
    'withdrawal_cancelled', v_withdrawal_cancelled
  );
END;
$$;

-- ============================================================================
-- PHASE 1: Update apply_daily_yield_to_fund_v2 with superadmin + duplicate check
-- ============================================================================
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid, boolean);

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_purpose aum_purpose,
  p_admin_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_preview jsonb;
  v_fund RECORD;
  v_investor jsonb;
  v_distribution_id uuid;
  v_period_id uuid;
  v_purpose_enum aum_purpose;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_platform_fees numeric := 0;
  v_net_yield numeric;
  v_fee_amount numeric;
  v_ib_amount numeric;
  v_conservation_check numeric;
  v_existing_distribution_id uuid;
BEGIN
  -- PHASE 1: Require superadmin for yield operations
  PERFORM public.require_super_admin('apply_daily_yield');
  
  v_purpose_enum := p_purpose;
  
  -- PHASE 5: Check for existing distribution (duplicate check)
  SELECT id INTO v_existing_distribution_id
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date = p_date
    AND purpose = p_purpose
    AND status != 'voided'
  LIMIT 1;
  
  IF v_existing_distribution_id IS NOT NULL AND NOT COALESCE(p_force, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'warning', true,
      'error', 'Yield already distributed for this date/purpose. Use force=true to override.',
      'existing_distribution_id', v_existing_distribution_id,
      'duplicate_detected', true
    );
  END IF;

  v_preview := public.preview_daily_yield_to_fund_v2(p_fund_id, p_date, p_gross_amount, p_purpose);
  
  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview;
  END IF;

  v_conservation_check := ABS(
    p_gross_amount - 
    ((v_preview->>'total_net')::numeric + (v_preview->>'total_fees')::numeric)
  );
  IF v_conservation_check > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Conservation check failed: gross (%.8f) != net (%.8f) + fees (%.8f), diff: %.8f',
        p_gross_amount, (v_preview->>'total_net')::numeric, (v_preview->>'total_fees')::numeric, v_conservation_check)
    );
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;

  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE year = EXTRACT(YEAR FROM p_date)::integer
    AND month = EXTRACT(MONTH FROM p_date)::integer
  LIMIT 1;

  IF v_period_id IS NULL THEN
    INSERT INTO statement_periods (year, month, period_end_date, status, period_name)
    VALUES (
      EXTRACT(YEAR FROM p_date)::integer,
      EXTRACT(MONTH FROM p_date)::integer,
      (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
      'open',
      to_char(p_date, 'YYYY-MM')
    )
    RETURNING id INTO v_period_id;
  END IF;

  v_distribution_id := gen_random_uuid();
  
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end,
    recorded_aum, gross_yield, net_yield, total_fees, total_ib,
    distribution_type, status, created_by, summary_json
  ) VALUES (
    v_distribution_id,
    p_fund_id,
    p_date,
    v_purpose_enum,
    (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date),
    (v_preview->>'current_aum')::numeric,
    p_gross_amount,
    (v_preview->>'total_net')::numeric,
    (v_preview->>'total_fees')::numeric,
    (v_preview->>'total_ib')::numeric,
    'original',
    'applied',
    p_admin_id,
    v_preview
  );

  FOR v_investor IN SELECT * FROM jsonb_array_elements(v_preview->'investors')
  LOOP
    v_net_yield := (v_investor->>'net_yield')::numeric;
    v_fee_amount := (v_investor->>'fee_amount')::numeric;
    v_ib_amount := COALESCE((v_investor->>'ib_amount')::numeric, 0);
    
    IF v_net_yield > 0 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class,
        amount, tx_date, reference_id, notes, created_by,
        purpose, distribution_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_investor->>'investor_id')::uuid,
        p_fund_id,
        'INTEREST',
        v_fund.asset,
        v_fund.fund_class,
        v_net_yield,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':INTEREST',
        'Yield distribution',
        p_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'investor_visible',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      UPDATE investor_positions
      SET current_value = current_value + v_net_yield,
          shares = shares + v_net_yield,
          updated_at = now()
      WHERE investor_id = (v_investor->>'investor_id')::uuid
        AND fund_id = p_fund_id;
    END IF;

    IF v_fee_amount > 0 THEN
      v_total_platform_fees := v_total_platform_fees + (v_fee_amount - v_ib_amount);

      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class,
        amount, tx_date, reference_id, notes, created_by,
        purpose, distribution_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_investor->>'investor_id')::uuid,
        p_fund_id,
        'FEE',
        v_fund.asset,
        v_fund.fund_class,
        v_fee_amount,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':FEE',
        'Performance fee',
        p_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'investor_visible',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        base_net_income, fee_percentage, fee_amount,
        period_start, period_end, purpose, created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_investor->>'investor_id')::uuid,
        v_indigo_fees_id,
        (v_investor->>'gross_yield')::numeric,
        (v_investor->>'fee_pct')::numeric,
        v_fee_amount,
        date_trunc('month', p_date)::date,
        (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
        v_purpose_enum,
        p_admin_id
      );
    END IF;

    IF v_ib_amount > 0 AND (v_investor->>'ib_parent_id') IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class,
        amount, tx_date, reference_id, notes, created_by,
        purpose, distribution_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_investor->>'ib_parent_id')::uuid,
        p_fund_id,
        'IB_CREDIT',
        v_fund.asset,
        v_fund.fund_class,
        v_ib_amount,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':IB_CREDIT',
        'IB commission from ' || (v_investor->>'investor_name'),
        p_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'admin_only',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount,
          shares = shares + v_ib_amount,
          updated_at = now()
      WHERE investor_id = (v_investor->>'ib_parent_id')::uuid
        AND fund_id = p_fund_id;

      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        source_net_income, ib_percentage, ib_fee_amount, effective_date,
        purpose, created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_investor->>'investor_id')::uuid,
        (v_investor->>'ib_parent_id')::uuid,
        (v_investor->>'gross_yield')::numeric,
        (v_investor->>'ib_percentage')::numeric,
        v_ib_amount,
        p_date,
        v_purpose_enum,
        p_admin_id
      );
    END IF;
  END LOOP;

  IF v_total_platform_fees > 0 THEN
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class,
      amount, tx_date, reference_id, notes, created_by,
      purpose, distribution_id, visibility_scope, is_system_generated, source
    ) VALUES (
      gen_random_uuid(),
      v_indigo_fees_id,
      p_fund_id,
      'FEE_CREDIT',
      v_fund.asset,
      v_fund.fund_class,
      v_total_platform_fees,
      p_date,
      'yield:' || v_distribution_id || ':INDIGO_FEES:FEE_CREDIT',
      'Platform fee collection',
      p_admin_id,
      v_purpose_enum,
      v_distribution_id,
      'admin_only',
      true,
      'yield_distribution'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    UPDATE investor_positions
    SET current_value = current_value + v_total_platform_fees,
        shares = shares + v_total_platform_fees,
        updated_at = now()
    WHERE investor_id = v_indigo_fees_id
      AND fund_id = p_fund_id;
  END IF;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (
    p_fund_id,
    p_date,
    (v_preview->>'current_aum')::numeric + p_gross_amount,
    v_purpose_enum,
    'yield_distribution:' || v_distribution_id,
    p_admin_id
  )
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET 
    total_aum = EXCLUDED.total_aum,
    source = EXCLUDED.source,
    updated_at = now(),
    updated_by = p_admin_id;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION_APPLIED',
    'yield_distributions',
    v_distribution_id::text,
    p_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'effective_date', p_date,
      'gross_yield', p_gross_amount,
      'total_fees', (v_preview->>'total_fees')::numeric,
      'total_ib', (v_preview->>'total_ib')::numeric,
      'platform_fees', v_total_platform_fees,
      'investor_count', (v_preview->>'investor_count')::integer,
      'force_applied', COALESCE(p_force, false)
    ),
    jsonb_build_object('purpose', p_purpose::text)
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'effective_date', p_date,
    'gross_yield', p_gross_amount,
    'total_fees', (v_preview->>'total_fees')::numeric,
    'total_ib', (v_preview->>'total_ib')::numeric,
    'platform_fees', v_total_platform_fees,
    'total_net', (v_preview->>'total_net')::numeric,
    'investor_count', (v_preview->>'investor_count')::integer,
    'investors_updated', (v_preview->>'investor_count')::integer,
    'message', 'Yield distribution applied successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid, boolean) TO authenticated;

-- ============================================================================
-- PHASE 1: Drop and recreate admin_create_transaction
-- ============================================================================
DROP FUNCTION IF EXISTS public.admin_create_transaction(uuid, uuid, text, numeric, date, text, text, uuid);

CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_type text,
  p_amount numeric,
  p_tx_date date,
  p_notes text,
  p_reference_id text,
  p_admin_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_tx_id uuid; 
  v_fund_asset text; 
  v_fund_class text; 
  v_current_value numeric; 
  v_new_value numeric;
BEGIN
  IF NOT public.is_admin() THEN 
    RAISE EXCEPTION 'Admin access required'; 
  END IF;
  
  IF p_type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    PERFORM public.require_super_admin('admin_create_transaction:' || p_type);
  END IF;
  
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM public.funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN 
    RAISE EXCEPTION 'Fund not found'; 
  END IF;
  
  SELECT COALESCE(current_value, 0) INTO v_current_value 
  FROM public.investor_positions 
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_new_value := COALESCE(v_current_value, 0) + p_amount;
  
  IF v_new_value < 0 THEN
    RAISE EXCEPTION 'Transaction would result in negative balance (%.8f)', v_new_value;
  END IF;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  )
  VALUES (
    p_investor_id, p_fund_id, p_type::tx_type, p_amount, v_fund_asset, v_fund_class, 
    p_tx_date, p_notes, p_reference_id, COALESCE(p_admin_id, auth.uid()), false
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class, shares, updated_at
  )
  VALUES (
    p_investor_id, p_fund_id, v_new_value, 
    CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END, 
    v_fund_class, 0, now()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET 
    current_value = v_new_value, 
    cost_basis = investor_positions.cost_basis + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END, 
    updated_at = now();

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_transaction(uuid, uuid, text, numeric, date, text, text, uuid) TO authenticated;

-- ============================================================================
-- PHASE 1: Update complete_withdrawal with superadmin check
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id uuid,
  p_transaction_hash text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_asset TEXT;
  v_fund_class TEXT;
  v_withdrawal_tx_id UUID;
  v_resulting_balance numeric;
BEGIN
  PERFORM public.require_super_admin('complete_withdrawal');
  
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals that are in processing status. Current status: %', v_request.status;
  END IF;
  
  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;
  
  SELECT COALESCE(current_value, 0) - ABS(v_request.processed_amount) INTO v_resulting_balance
  FROM investor_positions
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  
  IF v_resulting_balance IS NOT NULL AND v_resulting_balance < 0 THEN
    RAISE EXCEPTION 'Withdrawal would result in negative balance (%.8f)', v_resulting_balance;
  END IF;
  
  SELECT asset, fund_class INTO v_asset, v_fund_class
  FROM funds WHERE id = v_request.fund_id;
  
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, reference_id, notes, created_by, purpose
  ) VALUES (
    v_request.investor_id,
    v_request.fund_id,
    COALESCE(v_asset, 'UNKNOWN'),
    COALESCE(v_fund_class, 'UNKNOWN'),
    -ABS(v_request.processed_amount),
    'WITHDRAWAL',
    CURRENT_DATE,
    CURRENT_DATE,
    'withdrawal_completion',
    'WD-' || p_request_id::text,
    COALESCE(p_admin_notes, 'Withdrawal completed'),
    auth.uid(),
    'transaction'
  ) RETURNING id INTO v_withdrawal_tx_id;
  
  UPDATE public.investor_positions 
  SET 
    current_value = current_value - ABS(v_request.processed_amount),
    shares = shares - ABS(v_request.processed_amount),
    cost_basis = GREATEST(0, cost_basis - ABS(v_request.processed_amount)),
    last_transaction_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE investor_id = v_request.investor_id 
    AND fund_id = v_request.fund_id;
  
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    completed_at = NOW(),
    completed_by = auth.uid(),
    transaction_hash = COALESCE(p_transaction_hash, transaction_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;
  
  PERFORM public.log_withdrawal_action(p_request_id, 'complete', jsonb_build_object(
    'processed_amount', v_request.processed_amount,
    'transaction_hash', p_transaction_hash,
    'withdrawal_tx_id', v_withdrawal_tx_id,
    'shares_deducted', true,
    'cost_basis_deducted', true
  ));
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- Add IB_DEBIT to tx_type enum if not exists
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IB_DEBIT' AND enumtypid = 'tx_type'::regtype) THEN
    ALTER TYPE tx_type ADD VALUE 'IB_DEBIT';
  END IF;
END$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_withdrawal(uuid, text, text) TO authenticated;