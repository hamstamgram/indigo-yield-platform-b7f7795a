-- apply_backfill_yield: Per-event yield distribution for historical backfill seeding.
--
-- KEY DESIGN CHOICES:
--   1. distribution_type = 'transaction'  → excluded from check_historical_lock, so
--      subsequent flow events on the same date are NOT blocked.
--   2. No check_historical_lock call      → backfill events are deliberately historical.
--   3. Allocates by CURRENT live positions → each event gets exact per-event allocation,
--      matching the Excel per-event yield rows precisely.
--   4. Delegates fee/IB lookup to calculate_yield_allocations (same as V5).
--
-- Called by: scripts/seed-excel-v2.ts for every YIELD event in excel-events-v2.json
-- Parameters:
--   p_fund_id      uuid     fund to distribute yield for
--   p_event_date   date     exact Excel event date (already last-day-of-month for most events)
--   p_gross_pct    numeric  gross yield rate as a decimal fraction (e.g. 0.006343)
--   p_admin_id     uuid     admin profile id (created_by)
-- Returns: yield_distributions.id

CREATE OR REPLACE FUNCTION public.apply_backfill_yield(
    p_fund_id    uuid,
    p_event_date date,
    p_gross_pct  numeric,
    p_admin_id   uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_distribution_id   uuid;
    v_opening_aum       numeric;
    v_recorded_aum      numeric;
    v_fees_account_id   uuid;
    v_fund_asset        text;
    v_fund_class        text;
    v_total_yield       numeric;
    v_total_fees        numeric;
    v_total_ib          numeric;
    v_total_fee_credit  numeric := 0;
    v_total_ib_credit   numeric := 0;
    v_investor_count    integer;
    v_period_start      date;
    v_closing_aum       numeric;
    v_alloc             record;
    v_tx_id             uuid;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    -- Fund metadata
    SELECT asset, fund_class
    INTO v_fund_asset, v_fund_class
    FROM funds
    WHERE id = p_fund_id;

    IF v_fund_asset IS NULL THEN
        RAISE EXCEPTION 'apply_backfill_yield: fund not found: %', p_fund_id;
    END IF;

    -- Fees account (system singleton)
    SELECT id INTO v_fees_account_id
    FROM profiles
    WHERE account_type = 'fees_account'::account_type
    ORDER BY created_at ASC
    LIMIT 1;

    -- Opening AUM = live positions (source of truth)
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    -- Recorded AUM = opening * (1 + gross_pct)
    -- This feeds into calculate_yield_allocations which derives:
    --   total_yield = recorded_aum - opening_aum = opening_aum * gross_pct
    v_recorded_aum := v_opening_aum * (1 + p_gross_pct);

    v_period_start := date_trunc('month', p_event_date)::date;

    -- Allocation engine (same as V5 — handles fee & IB lookups)
    CREATE TEMP TABLE _bf_alloc ON COMMIT DROP AS
        SELECT * FROM calculate_yield_allocations(p_fund_id, v_recorded_aum, p_event_date);

    SELECT
        COALESCE(SUM(gross), 0),
        COALESCE(SUM(fee),   0),
        COALESCE(SUM(ib),    0),
        COALESCE(SUM(fee_credit), 0),
        COALESCE(SUM(ib_credit),  0),
        COUNT(DISTINCT investor_id)
    INTO
        v_total_yield,  v_total_fees,  v_total_ib,
        v_total_fee_credit, v_total_ib_credit,
        v_investor_count
    FROM _bf_alloc;

    -- Distribution header
    -- distribution_type = 'transaction' is the critical flag:
    --   check_historical_lock EXCLUDES ('deposit','withdrawal','transaction')
    --   so flows on the same date will not be blocked.
    INSERT INTO yield_distributions (
        fund_id, effective_date, recorded_aum, gross_yield,
        total_fees, total_ib, total_fee_credit, total_ib_credit,
        created_by, purpose,
        period_end, period_start, status,
        opening_aum, net_yield, investor_count,
        gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount,
        allocation_count, distribution_type
    ) VALUES (
        p_fund_id, p_event_date, v_recorded_aum, v_total_yield,
        v_total_fees, v_total_ib, v_total_fee_credit, v_total_ib_credit,
        p_admin_id, 'transaction'::aum_purpose,
        p_event_date, v_period_start, 'applied',
        v_opening_aum, (v_total_yield - v_total_fees - v_total_ib), v_investor_count,
        v_total_yield, (v_total_yield - v_total_fees - v_total_ib),
        v_total_fees, v_total_ib, v_investor_count,
        'transaction'
    ) RETURNING id INTO v_distribution_id;

    -- Allocation rows
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
    FROM _bf_alloc;

    -- YIELD transactions (one per investor with non-zero net)
    FOR v_alloc IN
        SELECT investor_id, net FROM _bf_alloc WHERE net != 0
    LOOP
        INSERT INTO transactions_v2 (
            fund_id, investor_id, tx_date, value_date,
            asset, fund_class, amount, type, source,
            distribution_id, reference_id,
            is_system_generated, purpose, visibility_scope, created_by
        ) VALUES (
            p_fund_id, v_alloc.investor_id, p_event_date, p_event_date,
            v_fund_asset, v_fund_class,
            v_alloc.net, 'YIELD'::tx_type, 'yield_distribution'::tx_source,
            v_distribution_id,
            'bf_yield_' || v_distribution_id || '_' || v_alloc.investor_id,
            true, 'transaction'::aum_purpose, 'admin_only'::visibility_scope, p_admin_id
        ) RETURNING id INTO v_tx_id;

        UPDATE yield_allocations SET transaction_id = v_tx_id
        WHERE distribution_id = v_distribution_id AND investor_id = v_alloc.investor_id;
    END LOOP;

    -- FEE_CREDIT transaction (to Indigo Fees account)
    IF v_total_fee_credit != 0 AND v_fees_account_id IS NOT NULL THEN
        INSERT INTO transactions_v2 (
            fund_id, investor_id, tx_date, value_date,
            asset, fund_class, amount, type, source,
            distribution_id, reference_id,
            is_system_generated, purpose, visibility_scope, created_by
        ) VALUES (
            p_fund_id, v_fees_account_id, p_event_date, p_event_date,
            v_fund_asset, v_fund_class,
            v_total_fee_credit, 'FEE_CREDIT'::tx_type, 'yield_distribution'::tx_source,
            v_distribution_id,
            'bf_fee_credit_' || v_distribution_id,
            true, 'transaction'::aum_purpose, 'admin_only'::visibility_scope, p_admin_id
        ) RETURNING id INTO v_tx_id;

        UPDATE yield_allocations SET fee_credit_transaction_id = v_tx_id
        WHERE distribution_id = v_distribution_id AND fee_credit != 0;
    END IF;

    -- IB_CREDIT transactions (one per IB parent who earned commission)
    FOR v_alloc IN
        SELECT ib_parent_id AS investor_id, SUM(ib) AS total_ib_amount
        FROM _bf_alloc
        WHERE ib != 0 AND ib_parent_id IS NOT NULL
        GROUP BY ib_parent_id
    LOOP
        INSERT INTO transactions_v2 (
            fund_id, investor_id, tx_date, value_date,
            asset, fund_class, amount, type, source,
            distribution_id, reference_id,
            is_system_generated, purpose, visibility_scope, created_by
        ) VALUES (
            p_fund_id, v_alloc.investor_id, p_event_date, p_event_date,
            v_fund_asset, v_fund_class,
            v_alloc.total_ib_amount, 'IB_CREDIT'::tx_type, 'yield_distribution'::tx_source,
            v_distribution_id,
            'bf_ib_credit_' || v_distribution_id || '_' || v_alloc.investor_id,
            true, 'transaction'::aum_purpose, 'admin_only'::visibility_scope, p_admin_id
        ) RETURNING id INTO v_tx_id;

        UPDATE yield_allocations SET ib_credit_transaction_id = v_tx_id
        WHERE distribution_id = v_distribution_id
          AND investor_id IN (
              SELECT ya2.investor_id
              FROM yield_allocations ya2
              JOIN profiles p2 ON p2.id = ya2.investor_id
              WHERE ya2.distribution_id = v_distribution_id
                AND p2.ib_parent_id = v_alloc.investor_id
          );
    END LOOP;

    -- fee_allocations (detail records for reporting)
    INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose,
        base_net_income, fee_percentage, fee_amount, created_by
    )
    SELECT
        v_distribution_id, p_fund_id, investor_id, v_fees_account_id,
        v_period_start, p_event_date, 'transaction'::aum_purpose,
        gross, fee_pct, fee, p_admin_id
    FROM _bf_alloc
    WHERE fee > 0;

    -- ib_allocations (detail records for IB reporting)
    INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        source_net_income, ib_percentage, ib_fee_amount, effective_date,
        period_start, period_end, purpose, created_by
    )
    SELECT
        v_distribution_id, p_fund_id, ib_parent_id, investor_id,
        gross, ib_rate, ib, p_event_date,
        v_period_start, p_event_date, 'transaction'::aum_purpose, p_admin_id
    FROM _bf_alloc
    WHERE ib > 0;

    -- Record closing AUM post-yield (positions now updated by trigger)
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_closing_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    UPDATE yield_distributions SET closing_aum = v_closing_aum
    WHERE id = v_distribution_id;

    PERFORM set_config('indigo.canonical_rpc', 'false', true);
    RETURN v_distribution_id;
END;
$function$;

COMMENT ON FUNCTION public.apply_backfill_yield(uuid, date, numeric, uuid) IS
    'Per-event yield distribution for historical seeding. Uses distribution_type=transaction '
    'so subsequent same-date flows are not blocked by check_historical_lock. '
    'Allocates by current live positions (not opening balance), matching Excel per-event yield rows.';
