-- =============================================================================
-- BUG 1: Fix void_fund_daily_aum - add missing p_void_crystals := false
-- =============================================================================
CREATE OR REPLACE FUNCTION public.void_fund_daily_aum(
  p_record_id uuid,
  p_reason text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_dist_id uuid;
  v_distribution_ids uuid[];
  v_voided_dist_count integer := 0;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT is_admin() THEN 
    IF NOT check_is_admin(p_admin_id) THEN
       RAISE EXCEPTION 'Access denied: admin only';
    END IF;
  END IF;

  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF v_record.is_voided THEN RAISE EXCEPTION 'Record is already voided'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  v_distribution_ids := ARRAY(
    SELECT id FROM yield_distributions
    WHERE fund_id = v_record.fund_id
      AND effective_date = v_record.aum_date
      AND purpose::text = v_record.purpose::text
      AND is_voided = false
  );

  IF v_distribution_ids IS NOT NULL THEN
    FOREACH v_dist_id IN ARRAY v_distribution_ids LOOP
      -- FIX: Added missing 4th argument p_void_crystals := false
      PERFORM void_yield_distribution(v_dist_id, p_admin_id, 'Cascade from fund_daily_aum void: ' || p_reason, false);
      v_voided_dist_count := v_voided_dist_count + 1;
    END LOOP;
  END IF;

  UPDATE fund_daily_aum
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_record_id;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'void_fund_daily_aum', 'fund_daily_aum', p_record_id::TEXT, p_admin_id,
    jsonb_build_object('fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
                       'total_aum', v_record.total_aum, 'purpose', v_record.purpose),
    jsonb_build_object('is_voided', true, 'reason', p_reason),
    jsonb_build_object('note', 'V6 Cascade Void', 'voided_distributions', v_voided_dist_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', v_record.fund_id,
    'aum_date', v_record.aum_date,
    'purpose', v_record.purpose,
    'voided_at', NOW(),
    'cascade_voided_distributions', v_voided_dist_count,
    'message', 'AUM record voided with V6 distribution cascade.'
  );
END;
$$;

-- =============================================================================
-- BUG 2: Drop broken 4-param void_and_reissue_transaction overload
-- =============================================================================
DROP FUNCTION IF EXISTS public.void_and_reissue_transaction(uuid, jsonb, uuid, text);

-- =============================================================================
-- BUG 4: Fix upsert_fund_aum_after_yield - remove fees_account exclusion
-- =============================================================================
CREATE OR REPLACE FUNCTION public.upsert_fund_aum_after_yield(
  p_fund_id uuid,
  p_aum_date date,
  p_yield_amount numeric,
  p_purpose aum_purpose,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_id uuid;
  v_old_aum numeric(28,10);
  v_new_aum numeric(28,10);
  v_result jsonb;
BEGIN
  SELECT id, total_aum INTO v_existing_id, v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = p_purpose
    AND is_voided = false
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    v_new_aum := v_old_aum + p_yield_amount;
    UPDATE fund_daily_aum
    SET total_aum = v_new_aum, updated_at = now(), updated_by = p_actor_id, source = 'YIELD_DISTRIBUTION'
    WHERE id = v_existing_id;
    v_result := jsonb_build_object('action', 'updated', 'id', v_existing_id, 'old_aum', v_old_aum, 'new_aum', v_new_aum);
  ELSE
    -- FIX: Removed fees_account exclusion to match recalculate_fund_aum_for_date
    SELECT COALESCE(SUM(ip.current_value), 0) INTO v_new_aum
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true;
    v_new_aum := v_new_aum + p_yield_amount;
    INSERT INTO fund_daily_aum (id, fund_id, aum_date, total_aum, purpose, source, created_at, created_by, is_voided)
    VALUES (gen_random_uuid(), p_fund_id, p_aum_date, v_new_aum, p_purpose, 'YIELD_DISTRIBUTION', now(), p_actor_id, false)
    RETURNING id INTO v_existing_id;
    v_result := jsonb_build_object('action', 'inserted', 'id', v_existing_id, 'new_aum', v_new_aum);
  END IF;
  RETURN v_result;
END;
$$;

-- =============================================================================
-- BUG 3: Optimize apply_segmented_yield_distribution_v5 
-- Materialize calculate_yield_allocations into temp table, reference it everywhere
-- =============================================================================
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_period_end date,
    p_recorded_aum numeric,
    p_created_by uuid DEFAULT NULL,
    p_purpose aum_purpose DEFAULT 'reporting',
    p_distribution_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
BEGIN
    -- 1. Set canonical mutation guard
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    v_dist_date := COALESCE(p_distribution_date, p_period_end);

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

    -- 2b. OPTIMIZATION: Materialize calculate_yield_allocations once into temp table
    CREATE TEMP TABLE _yield_alloc ON COMMIT DROP AS
      SELECT * FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end);

    -- 3. Calculate Totals (from materialized temp table)
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

    -- 5. Insert yield_allocations (from temp table)
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

    -- 6. Create transactions in transactions_v2
    IF p_purpose = 'reporting' THEN

        -- 6a. YIELD transactions (from temp table)
        FOR v_alloc IN
            SELECT investor_id, net, fee_credit, ib_credit, current_value
            FROM _yield_alloc
            WHERE net > 0
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
                true, p_purpose, 'investor_visible'::visibility_scope, p_created_by
            ) RETURNING id INTO v_tx_id;

            UPDATE yield_allocations
            SET transaction_id = v_tx_id
            WHERE distribution_id = v_distribution_id
              AND investor_id = v_alloc.investor_id;
        END LOOP;

        -- 6b. FEE_CREDIT transaction for fees account
        IF v_total_fee_credit > 0 AND v_fees_account_id IS NOT NULL THEN
            INSERT INTO transactions_v2 (
                fund_id, investor_id, tx_date, value_date,
                asset, fund_class, amount, type, source,
                distribution_id, reference_id,
                is_system_generated, purpose, visibility_scope, created_by
            ) VALUES (
                p_fund_id, v_fees_account_id, v_dist_date, v_dist_date,
                v_fund_asset, v_fund_class, v_total_fee_credit, 'FEE_CREDIT'::tx_type, 'yield_distribution'::tx_source,
                v_distribution_id, 'fee_credit_v5_' || v_distribution_id,
                true, p_purpose, 'admin_only'::visibility_scope, p_created_by
            ) RETURNING id INTO v_tx_id;

            UPDATE yield_allocations
            SET fee_credit_transaction_id = v_tx_id
            WHERE distribution_id = v_distribution_id
              AND fee_credit > 0;
        END IF;

        -- 6c. IB_CREDIT transactions (from temp table)
        FOR v_alloc IN
            SELECT ib_parent_id AS investor_id, SUM(ib) AS total_ib_amount
            FROM _yield_alloc
            WHERE ib > 0 AND ib_parent_id IS NOT NULL
            GROUP BY ib_parent_id
        LOOP
            INSERT INTO transactions_v2 (
                fund_id, investor_id, tx_date, value_date,
                asset, fund_class, amount, type, source,
                distribution_id, reference_id,
                is_system_generated, purpose, visibility_scope, created_by
            ) VALUES (
                p_fund_id, v_alloc.investor_id, v_dist_date, v_dist_date,
                v_fund_asset, v_fund_class, v_alloc.total_ib_amount, 'IB_CREDIT'::tx_type, 'yield_distribution'::tx_source,
                v_distribution_id, 'ib_credit_v5_' || v_distribution_id || '_' || v_alloc.investor_id,
                true, p_purpose, 'admin_only'::visibility_scope, p_created_by
            ) RETURNING id INTO v_tx_id;

            UPDATE yield_allocations
            SET ib_credit_transaction_id = v_tx_id
            WHERE distribution_id = v_distribution_id
              AND investor_id IN (
                  SELECT ya_inner.investor_id FROM yield_allocations ya_inner
                  JOIN profiles p_inner ON p_inner.id = ya_inner.investor_id
                  WHERE ya_inner.distribution_id = v_distribution_id
                    AND p_inner.ib_parent_id = v_alloc.investor_id
              );
        END LOOP;

    END IF;

    -- 7. Legacy Sync: fee_allocations (from temp table)
    INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose,
        base_net_income, fee_percentage, fee_amount, created_by
    )
    SELECT
        v_distribution_id, p_fund_id, investor_id, v_fees_account_id,
        v_period_start, p_period_end, p_purpose,
        gross, fee_pct, fee, p_created_by
    FROM _yield_alloc
    WHERE fee > 0;

    -- 8. Legacy Sync: ib_allocations (from temp table)
    INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        source_net_income, ib_percentage, ib_fee_amount,
        effective_date, period_start, period_end, purpose, created_by
    )
    SELECT
        v_distribution_id, p_fund_id, ib_parent_id, investor_id,
        gross, ib_rate, ib,
        v_dist_date, v_period_start, p_period_end, p_purpose, p_created_by
    FROM _yield_alloc
    WHERE ib > 0;

    -- 9. Update closing_aum on distribution header
    SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    UPDATE yield_distributions
    SET closing_aum = v_closing_aum
    WHERE id = v_distribution_id;

    -- 10. Upsert reporting AUM (direct upsert)
    IF p_purpose = 'reporting' THEN
        UPDATE fund_daily_aum
        SET total_aum = v_closing_aum, updated_at = now(),
            updated_by = p_created_by, source = 'yield_distribution_v5'
        WHERE fund_id = p_fund_id AND aum_date = p_period_end
          AND purpose = 'reporting' AND is_voided = false;

        IF NOT FOUND THEN
            INSERT INTO fund_daily_aum (
                fund_id, aum_date, total_aum, purpose, source,
                created_by, is_voided, is_month_end
            ) VALUES (
                p_fund_id, p_period_end, v_closing_aum, 'reporting',
                'yield_distribution_v5', p_created_by, false, true
            );
        END IF;
    END IF;

    -- Clear canonical flag
    PERFORM set_config('indigo.canonical_rpc', 'false', true);

    RETURN v_distribution_id;
END;
$$;