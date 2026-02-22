
-- ============================================================
-- Fix apply_segmented_yield_distribution_v5:
-- Add YIELD/FEE_CREDIT/IB_CREDIT transaction creation + AUM upsert
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_recorded_aum numeric,
    p_distribution_date date,
    p_period_end date,
    p_purpose aum_purpose DEFAULT 'reporting',
    p_created_by uuid DEFAULT NULL
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
BEGIN
    -- 1. Set canonical mutation guard
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    -- 2. Establish context
    v_period_start := date_trunc('month', p_period_end);
    
    SELECT id INTO v_fees_account_id FROM profiles 
    WHERE account_type = 'fees_account'::account_type 
    ORDER BY created_at ASC LIMIT 1;

    -- Fetch fund asset and class
    SELECT asset, fund_class INTO v_fund_asset, v_fund_class
    FROM funds WHERE id = p_fund_id;

    IF v_fund_asset IS NULL THEN
        RAISE EXCEPTION 'Fund % not found', p_fund_id;
    END IF;

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
        p_fund_id, p_distribution_date, p_recorded_aum,
        v_total_yield, v_total_fees, v_total_ib,
        v_total_fee_credit, v_total_ib_credit,
        p_created_by, p_purpose, p_period_end, v_period_start,
        'applied', v_opening_aum,
        (v_total_yield - v_total_fees - v_total_ib),
        v_investor_count,
        v_total_yield,
        (v_total_yield - v_total_fees - v_total_ib),
        v_total_fees, v_total_ib, v_investor_count
    ) RETURNING id INTO v_distribution_id;

    -- 5. Insert Yield Allocations
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

    -- 6. Insert YIELD transactions + back-link to yield_allocations
    -- Gate: only for reporting purpose (transaction purpose is checkpoint-only)
    IF p_purpose = 'reporting' THEN
        FOR v_alloc IN
            SELECT investor_id, net, gross, fee, ib, fee_credit, ib_credit, ib_parent_id
            FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)
        LOOP
            -- 6a. YIELD transaction for each investor with net > 0
            IF v_alloc.net > 0 THEN
                INSERT INTO transactions_v2 (
                    fund_id, investor_id, tx_date, value_date,
                    asset, fund_class, amount, type, source,
                    distribution_id, reference_id,
                    is_system_generated, purpose, visibility_scope, created_by
                ) VALUES (
                    p_fund_id, v_alloc.investor_id, p_distribution_date, p_distribution_date,
                    v_fund_asset, v_fund_class, v_alloc.net,
                    'YIELD'::tx_type, 'yield_distribution'::tx_source,
                    v_distribution_id,
                    'yield_v5_' || v_distribution_id || '_' || v_alloc.investor_id,
                    true, p_purpose, 'investor_visible'::visibility_scope, p_created_by
                ) RETURNING id INTO v_tx_id;

                -- Back-link transaction to yield_allocation
                UPDATE yield_allocations
                SET transaction_id = v_tx_id
                WHERE distribution_id = v_distribution_id
                  AND investor_id = v_alloc.investor_id;
            END IF;

            -- 6b. FEE_CREDIT transaction for fees account
            IF v_alloc.fee > 0 AND v_fees_account_id IS NOT NULL THEN
                INSERT INTO transactions_v2 (
                    fund_id, investor_id, tx_date, value_date,
                    asset, fund_class, amount, type, source,
                    distribution_id, reference_id,
                    is_system_generated, purpose, visibility_scope, created_by
                ) VALUES (
                    p_fund_id, v_fees_account_id, p_distribution_date, p_distribution_date,
                    v_fund_asset, v_fund_class, v_alloc.fee,
                    'FEE_CREDIT'::tx_type, 'fee_allocation'::tx_source,
                    v_distribution_id,
                    'fee_v5_' || v_distribution_id || '_' || v_alloc.investor_id,
                    true, p_purpose, 'admin_only'::visibility_scope, p_created_by
                ) RETURNING id INTO v_tx_id;

                -- Back-link fee transaction
                UPDATE yield_allocations
                SET fee_credit_transaction_id = v_tx_id
                WHERE distribution_id = v_distribution_id
                  AND investor_id = v_alloc.investor_id;
            END IF;

            -- 6c. IB_CREDIT transaction for IB parent
            IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
                INSERT INTO transactions_v2 (
                    fund_id, investor_id, tx_date, value_date,
                    asset, fund_class, amount, type, source,
                    distribution_id, reference_id,
                    is_system_generated, purpose, visibility_scope, created_by
                ) VALUES (
                    p_fund_id, v_alloc.ib_parent_id, p_distribution_date, p_distribution_date,
                    v_fund_asset, v_fund_class, v_alloc.ib,
                    'IB_CREDIT'::tx_type, 'ib_allocation'::tx_source,
                    v_distribution_id,
                    'ib_v5_' || v_distribution_id || '_' || v_alloc.investor_id,
                    true, p_purpose, 'admin_only'::visibility_scope, p_created_by
                ) RETURNING id INTO v_tx_id;

                -- Back-link IB transaction
                UPDATE yield_allocations
                SET ib_credit_transaction_id = v_tx_id
                WHERE distribution_id = v_distribution_id
                  AND investor_id = v_alloc.investor_id;
            END IF;
        END LOOP;

        -- 7. Fee credit transaction for fees_account (aggregate)
        IF v_total_fee_credit > 0 AND v_fees_account_id IS NOT NULL THEN
            INSERT INTO transactions_v2 (
                fund_id, investor_id, tx_date, value_date,
                asset, fund_class, amount, type, source,
                distribution_id, reference_id,
                is_system_generated, purpose, visibility_scope, created_by
            ) VALUES (
                p_fund_id, v_fees_account_id, p_distribution_date, p_distribution_date,
                v_fund_asset, v_fund_class, v_total_fee_credit,
                'FEE_CREDIT'::tx_type, 'fee_allocation'::tx_source,
                v_distribution_id,
                'fee_credit_v5_' || v_distribution_id || '_fees_account',
                true, p_purpose, 'admin_only'::visibility_scope, p_created_by
            );
        END IF;
    END IF;

    -- 8. Legacy Sync: fee_allocations
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

    -- 9. Legacy Sync: ib_allocations
    INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        source_net_income, ib_percentage, ib_fee_amount,
        effective_date, period_start, period_end, purpose, created_by
    )
    SELECT 
        v_distribution_id, p_fund_id, ib_parent_id, investor_id,
        gross, ib_rate, ib,
        p_distribution_date, v_period_start, p_period_end, p_purpose, p_created_by
    FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end)
    WHERE ib > 0;

    -- 10. Upsert reporting AUM
    IF p_purpose = 'reporting' THEN
        INSERT INTO fund_daily_aum (
            fund_id, aum_date, total_aum, purpose, source,
            created_by, is_month_end
        ) VALUES (
            p_fund_id, p_distribution_date, p_recorded_aum,
            'reporting', 'yield_distribution_v5',
            p_created_by, (p_distribution_date = (date_trunc('month', p_distribution_date) + interval '1 month - 1 day')::date)
        );
    END IF;

    -- 11. Clear canonical flags
    PERFORM set_config('indigo.canonical_rpc', 'false', true);
    PERFORM set_config('app.canonical_rpc', 'false', true);

    RETURN v_distribution_id;
END;
$function$;

-- ============================================================
-- Part 2: Void the 10 phantom yield_distributions for IND-SOL
-- These have no transactions and represent broken records
-- ============================================================
DO $$
DECLARE
    v_dist record;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    FOR v_dist IN
        SELECT id FROM yield_distributions
        WHERE fund_id = '7574bc81-dd87-4ddc-9e85-e8fb7c391330'
          AND is_voided = false
          AND status = 'applied'
    LOOP
        UPDATE yield_distributions
        SET is_voided = true,
            status = 'voided',
            voided_at = now(),
            void_reason = 'Phantom distribution - no transactions created due to V5 RPC bug'
        WHERE id = v_dist.id;

        UPDATE yield_allocations
        SET is_voided = true
        WHERE distribution_id = v_dist.id;

        UPDATE fee_allocations
        SET is_voided = true,
            voided_at = now()
        WHERE distribution_id = v_dist.id;

        UPDATE ib_allocations
        SET is_voided = true,
            voided_at = now()
        WHERE distribution_id = v_dist.id;
    END LOOP;

    PERFORM set_config('indigo.canonical_rpc', 'false', true);
    PERFORM set_config('app.canonical_rpc', 'false', true);
END;
$$;
