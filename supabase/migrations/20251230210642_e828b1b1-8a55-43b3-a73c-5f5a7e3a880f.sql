-- ============================================================================
-- Migration: Apply Yield Distribution v3 RPC
-- Calls preview_daily_yield_to_fund_v3 internally to ensure parity
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_as_of_date date,
  p_new_total_aum numeric,
  p_purpose text DEFAULT 'reporting',
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_preview jsonb;
  v_distribution_id uuid;
  v_inv jsonb;
  v_ib jsonb;
  v_tx_id uuid;
  v_fee_tx_id uuid;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_purpose_enum aum_purpose;
  v_period_start date;
  v_period_end date;
  v_created_count integer := 0;
  v_skipped_count integer := 0;
BEGIN
  -- Get and validate admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'code', 'AUTH_REQUIRED');
  END IF;
  
  -- Check admin status
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required', 'code', 'ADMIN_REQUIRED');
  END IF;

  -- Validate and cast purpose
  BEGIN
    v_purpose_enum := p_purpose::aum_purpose;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose: ' || p_purpose, 'code', 'INVALID_PURPOSE');
  END;

  -- Call preview to get exact calculations (ENSURES PREVIEW/APPLY PARITY)
  v_preview := preview_daily_yield_to_fund_v3(p_fund_id, p_as_of_date, p_new_total_aum, p_purpose, p_notes);
  
  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview; -- Pass through the error
  END IF;

  -- Calculate period dates
  v_period_start := date_trunc('month', p_as_of_date)::date;
  v_period_end := (date_trunc('month', p_as_of_date) + interval '1 month - 1 day')::date;

  -- Create yield_distributions record
  INSERT INTO yield_distributions (
    fund_id,
    effective_date,
    gross_yield,
    total_fees,
    total_ib_fees,
    net_yield,
    purpose,
    created_by,
    notes,
    period_start,
    period_end
  ) VALUES (
    p_fund_id,
    p_as_of_date,
    (v_preview->>'gross_yield')::numeric,
    (v_preview->>'total_fees')::numeric,
    (v_preview->>'total_ib')::numeric,
    (v_preview->>'total_net')::numeric,
    v_purpose_enum,
    v_admin_id,
    p_notes,
    v_period_start,
    v_period_end
  ) RETURNING id INTO v_distribution_id;

  -- Process each investor from preview
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_preview->'investors')
  LOOP
    -- Skip if would_skip is true (already exists)
    IF (v_inv->>'would_skip')::boolean THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Create INTEREST transaction (net yield to investor)
    INSERT INTO transactions_v2 (
      investor_id,
      fund_id,
      type,
      amount,
      tx_date,
      value_date,
      notes,
      source,
      is_system_generated,
      reference_id,
      visibility_scope,
      distribution_id
    ) VALUES (
      (v_inv->>'investor_id')::uuid,
      p_fund_id,
      'INTEREST',
      (v_inv->>'net_yield')::numeric,
      p_as_of_date,
      p_as_of_date,
      'Yield distribution: ' || COALESCE(p_notes, p_purpose),
      'yield_distribution_v3',
      true,
      v_inv->>'reference_id',
      CASE WHEN p_purpose = 'transaction' THEN 'admin_only' ELSE 'investor_visible' END,
      v_distribution_id
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_tx_id;

    IF v_tx_id IS NOT NULL THEN
      -- Update investor position
      UPDATE investor_positions
      SET current_value = current_value + (v_inv->>'net_yield')::numeric,
          updated_at = now()
      WHERE investor_id = (v_inv->>'investor_id')::uuid AND fund_id = p_fund_id;

      -- Create fee allocation record
      INSERT INTO fee_allocations (
        distribution_id,
        fund_id,
        investor_id,
        fee_percentage,
        fee_amount,
        base_net_income,
        purpose,
        period_start,
        period_end,
        created_by,
        debit_transaction_id
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_inv->>'investor_id')::uuid,
        (v_inv->>'fee_pct')::numeric,
        (v_inv->>'fee_amount')::numeric,
        (v_inv->>'gross_yield')::numeric,
        v_purpose_enum,
        v_period_start,
        v_period_end,
        v_admin_id,
        v_tx_id
      );

      v_created_count := v_created_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  -- Process IB credits
  FOR v_ib IN SELECT * FROM jsonb_array_elements(v_preview->'ib_credits')
  LOOP
    IF (v_ib->>'would_skip')::boolean THEN
      CONTINUE;
    END IF;

    -- Create IB credit transaction
    INSERT INTO transactions_v2 (
      investor_id,
      fund_id,
      type,
      amount,
      tx_date,
      value_date,
      notes,
      source,
      is_system_generated,
      reference_id,
      visibility_scope,
      distribution_id
    ) VALUES (
      (v_ib->>'ib_investor_id')::uuid,
      p_fund_id,
      'IB_COMMISSION',
      (v_ib->>'amount')::numeric,
      p_as_of_date,
      p_as_of_date,
      'IB commission from ' || (v_ib->>'source_investor_name'),
      'yield_distribution_v3',
      true,
      v_ib->>'reference_id',
      'investor_visible',
      v_distribution_id
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_tx_id;

    IF v_tx_id IS NOT NULL THEN
      -- Update IB position
      UPDATE investor_positions
      SET current_value = current_value + (v_ib->>'amount')::numeric,
          updated_at = now()
      WHERE investor_id = (v_ib->>'ib_investor_id')::uuid AND fund_id = p_fund_id;

      -- Create or update IB position if doesn't exist
      INSERT INTO investor_positions (investor_id, fund_id, current_value, shares)
      VALUES ((v_ib->>'ib_investor_id')::uuid, p_fund_id, (v_ib->>'amount')::numeric, 0)
      ON CONFLICT (investor_id, fund_id) DO NOTHING;

      -- Create ib_allocations record
      INSERT INTO ib_allocations (
        distribution_id,
        fund_id,
        ib_investor_id,
        source_investor_id,
        ib_percentage,
        ib_fee_amount,
        source_net_income,
        effective_date,
        purpose,
        period_start,
        period_end,
        source,
        created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_ib->>'ib_investor_id')::uuid,
        (v_ib->>'source_investor_id')::uuid,
        (v_ib->>'ib_percentage')::numeric,
        (v_ib->>'amount')::numeric,
        0, -- Will be filled in based on actual source
        p_as_of_date,
        v_purpose_enum,
        v_period_start,
        v_period_end,
        COALESCE(v_ib->>'source', 'platform_fees'),
        v_admin_id
      );
    END IF;
  END LOOP;

  -- Credit INDIGO FEES account with platform fees (total_fees - total_ib)
  DECLARE
    v_platform_fees numeric := (v_preview->>'platform_fees')::numeric;
    v_indigo_ref text := 'indigo_fees:' || p_fund_id || ':' || p_as_of_date || ':' || p_purpose;
  BEGIN
    IF v_platform_fees > 0 THEN
      INSERT INTO transactions_v2 (
        investor_id,
        fund_id,
        type,
        amount,
        tx_date,
        value_date,
        notes,
        source,
        is_system_generated,
        reference_id,
        visibility_scope,
        distribution_id
      ) VALUES (
        v_indigo_fees_id,
        p_fund_id,
        'FEE_CREDIT',
        v_platform_fees,
        p_as_of_date,
        p_as_of_date,
        'Platform fee credit from yield distribution',
        'yield_distribution_v3',
        true,
        v_indigo_ref,
        'admin_only',
        v_distribution_id
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update INDIGO FEES position
      INSERT INTO investor_positions (investor_id, fund_id, current_value, shares)
      VALUES (v_indigo_fees_id, p_fund_id, v_platform_fees, 0)
      ON CONFLICT (investor_id, fund_id) 
      DO UPDATE SET current_value = investor_positions.current_value + v_platform_fees;
    END IF;
  END;

  -- Record AUM
  INSERT INTO fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    purpose,
    source,
    created_by,
    is_month_end
  ) VALUES (
    p_fund_id,
    p_as_of_date,
    p_new_total_aum,
    v_purpose_enum,
    'yield_distribution_v3',
    v_admin_id,
    (p_as_of_date = v_period_end)
  ) ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET total_aum = p_new_total_aum, updated_at = now();

  -- Return the preview data with apply status
  RETURN v_preview || jsonb_build_object(
    'preview', false,
    'status', 'applied',
    'distribution_id', v_distribution_id,
    'created_count', v_created_count,
    'skipped_count', v_skipped_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_daily_yield_to_fund_v3 TO authenticated;