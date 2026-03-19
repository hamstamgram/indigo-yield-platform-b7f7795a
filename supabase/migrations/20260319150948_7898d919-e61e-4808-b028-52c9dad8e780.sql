-- Fix the 10-argument apply_investor_transaction overload used by apply_segmented_yield_distribution_v5
-- This overload still had a blanket p_amount <= 0 guard, which blocked zero/negative yield-family transactions.

CREATE OR REPLACE FUNCTION public.apply_investor_transaction(
    p_fund_id uuid,
    p_investor_id uuid,
    p_tx_type tx_type,
    p_amount numeric,
    p_tx_date date,
    p_reference_id text,
    p_admin_id uuid DEFAULT NULL::uuid,
    p_notes text DEFAULT NULL::text,
    p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
    p_distribution_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_fund record;
    v_transaction_id uuid;
    v_admin uuid;
    v_investor_lock_key bigint;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    v_admin := COALESCE(p_admin_id, auth.uid());
    IF v_admin IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: admin context required';
    END IF;

    -- Allow zero/negative amounts for yield-family transactions.
    -- Keep the strict positive check for capital flow types.
    IF p_amount <= 0 AND p_tx_type NOT IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST', 'FEE') THEN
        RAISE EXCEPTION 'Amount must be positive for % transactions', p_tx_type USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('yield_dist'), hashtext(p_fund_id::text));

    IF check_historical_lock(p_fund_id, p_tx_date, false, p_distribution_id) THEN
        RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot record a new transaction on % because a Yield Distribution has already been finalized on or after this date.', p_tx_date;
    END IF;

    SELECT * INTO v_fund
    FROM funds
    WHERE id = p_fund_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fund not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = p_investor_id
    ) THEN
        RAISE EXCEPTION 'Investor profile not found';
    END IF;

    v_investor_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_investor_lock_key);

    IF EXISTS (
        SELECT 1
        FROM transactions_v2
        WHERE fund_id = p_fund_id
          AND investor_id = p_investor_id
          AND tx_date = p_tx_date
          AND type = p_tx_type
          AND amount = CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE', 'IB', 'DUST_SWEEP') THEN -p_amount ELSE p_amount END
          AND reference_id = p_reference_id
          AND NOT is_voided
    ) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Transaction already explicitly recorded (idempotent)',
            'reference_id', p_reference_id
        );
    END IF;

    INSERT INTO public.transactions_v2 (
        fund_id,
        investor_id,
        type,
        asset,
        amount,
        tx_date,
        created_by,
        notes,
        reference_id,
        purpose,
        distribution_id,
        source,
        is_voided
    ) VALUES (
        p_fund_id,
        p_investor_id,
        p_tx_type,
        v_fund.asset,
        CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE', 'IB', 'DUST_SWEEP') THEN -p_amount ELSE p_amount END,
        p_tx_date,
        v_admin,
        COALESCE(p_notes, p_tx_type || ' - ' || p_reference_id),
        p_reference_id,
        p_purpose,
        p_distribution_id,
        'rpc_canonical'::tx_source,
        false
    ) RETURNING id INTO v_transaction_id;

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', p_tx_type || ' successfully applied.'
    );
END;
$function$;