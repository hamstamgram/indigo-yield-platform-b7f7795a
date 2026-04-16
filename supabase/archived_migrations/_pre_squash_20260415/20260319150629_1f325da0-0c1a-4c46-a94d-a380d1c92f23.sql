-- Fix: Allow zero/negative amounts for yield-family transaction types
-- The blanket "Amount must be positive" guard blocks legitimate zero/negative yield,
-- fee credit, IB credit, dust, and fee transactions.

CREATE OR REPLACE FUNCTION public.apply_investor_transaction(
    p_fund_id uuid,
    p_investor_id uuid,
    p_tx_type tx_type,
    p_amount numeric,
    p_tx_date date,
    p_reference_id text,
    p_admin_id uuid,
    p_notes text DEFAULT NULL::text,
    p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_fund record;
    v_transaction_id uuid;
BEGIN
    -- Set canonical RPC flag to bypass table mutation guards
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- 1. Validate inputs (type-aware amount guard)
    -- Allow zero/negative for yield-family types (negative yield, fee consumption, dust)
    -- Block zero/negative for capital flow types (DEPOSIT, WITHDRAWAL, etc.)
    IF p_amount <= 0 AND p_tx_type NOT IN (
      'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST', 'FEE'
    ) THEN
        RAISE EXCEPTION 'Amount must be positive for % transactions', p_tx_type
          USING ERRCODE = 'P0001';
    END IF;

    IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST', 'FEE', 'ADJUSTMENT') THEN
        RAISE EXCEPTION 'Invalid transaction type for this function: %', p_tx_type USING ERRCODE = 'P0002';
    END IF;

    -- 2. Fetch and lock fund
    SELECT * INTO v_fund
    FROM funds
    WHERE id = p_fund_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fund not found' USING ERRCODE = 'P0003';
    END IF;

    -- 3. Verify investor profile exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_investor_id) THEN
        RAISE EXCEPTION 'Investor profile not found' USING ERRCODE = 'P0004';
    END IF;

    -- 4. Check for idempotency (prevent duplicate transactions)
    IF EXISTS (
        SELECT 1 FROM transactions_v2 
        WHERE fund_id = p_fund_id 
        AND investor_id = p_investor_id 
        AND tx_date = p_tx_date 
        AND type = p_tx_type 
        AND amount = p_amount
        AND notes LIKE '%' || p_reference_id || '%'
        AND NOT is_voided
    ) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Transaction already explicitly recorded (idempotent)',
            'reference_id', p_reference_id
        );
    END IF;

    -- 5. Insert canonical transaction
    INSERT INTO public.transactions_v2 (
        fund_id,
        investor_id,
        type,
        asset,
        amount,
        tx_date,
        created_by,
        notes,
        is_voided
    ) VALUES (
        p_fund_id,
        p_investor_id,
        p_tx_type,
        v_fund.asset,
        p_amount,
        p_tx_date,
        p_admin_id,
        COALESCE(p_notes, p_tx_type || ' - ' || p_reference_id),
        false
    ) RETURNING id INTO v_transaction_id;

    -- 6. Log the administrative action
    INSERT INTO public.audit_log (
        actor_user,
        action,
        entity,
        entity_id,
        new_values
    ) VALUES (
        p_admin_id,
        'apply_investor_transaction',
        'transactions_v2',
        v_transaction_id::text,
        jsonb_build_object(
            'fund_id', p_fund_id,
            'investor_id', p_investor_id,
            'tx_type', p_tx_type,
            'amount', p_amount,
            'tx_date', p_tx_date,
            'reference_id', p_reference_id
        )
    );

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', p_tx_type || ' successfully applied'
    );
END;
$function$;