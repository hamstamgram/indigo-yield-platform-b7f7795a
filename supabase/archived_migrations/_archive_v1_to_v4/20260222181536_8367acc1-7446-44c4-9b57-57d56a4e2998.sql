
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_period_end date,
    p_recorded_aum numeric,
    p_created_by uuid,
    p_purpose aum_purpose DEFAULT 'reporting',
    p_distribution_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    -- Distribution date defaults to period_end
    v_dist_date := COALESCE(p_distribution_date, p_period_end);

    -- 2. Establish context
    v_period_start := date_trunc('month', p_period_end);

    SELECT id INTO v_fees_account_id FROM profiles
    WHERE account_type = 'fees_account'::account_type
    ORDER BY created_at ASC LIMIT 1;

    -- Fetch fund asset and fund_class
    SELECT asset, fund_class INTO v_fund_asset, v_fund_class
    FROM funds WHERE id = p_fund_id;

    -- Opening AUM (sum of active positions before distribution)
    SELECT COALESCE(SUM(current_value), 0) INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

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
    FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end);

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
    FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end);

    -- ============================================================
    -- 6. Create transactions in transactions_v2
    -- ============================================================
    IF p_purpose = 'reporting' THEN

        -- 6a. YIELD transactions for each investor with net > 0
        FOR v_alloc IN
            SELECT investor_id, net, fee_credit, ib_credit, current_value
            FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)
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

            -- Back-link transaction_id on yield_allocations
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

        -- 6c. IB_CREDIT transactions for each IB parent
        FOR v_alloc IN
            SELECT ib_parent_id AS investor_id, SUM(ib) AS total_ib_amount
            FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)
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

    -- 7. Legacy Sync: fee_allocations
    INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose,
        base_net_income, fee_percentage, fee_amount, created_by
    )
    SELECT
        v_distribution_id, p_fund_id, investor_id, v_fees_account_id,
        v_period_start, p_period_end, p_purpose,
        gross, fee_pct, fee, p_created_by
    FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)
    WHERE fee > 0;

    -- 8. Legacy Sync: ib_allocations
    INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        source_net_income, ib_percentage, ib_fee_amount,
        effective_date, period_start, period_end, purpose, created_by
    )
    SELECT
        v_distribution_id, p_fund_id, ib_parent_id, investor_id,
        gross, ib_rate, ib,
        v_dist_date, v_period_start, p_period_end, p_purpose, p_created_by
    FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)
    WHERE ib > 0;

    -- 9. Update closing_aum on distribution header
    SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    UPDATE yield_distributions
    SET closing_aum = v_closing_aum
    WHERE id = v_distribution_id;

    -- 10. Upsert reporting AUM (FIXED: direct upsert instead of broken upsert_fund_aum_after_yield call)
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
$function$;
