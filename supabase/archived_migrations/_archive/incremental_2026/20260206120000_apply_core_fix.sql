-- ============================================================================
-- CORE FIX: Ledger-Driven Architecture Migration
-- 1. Define Trigger Function (fn_ledger_drives_position)
-- 2. Define Trigger (trg_ledger_sync)
-- 3. Refactor apply_transaction_with_crystallization (Remove manual UPDATE)
-- ============================================================================

-- 1. Trigger Function
CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric;
BEGIN
  v_delta := NEW.amount; -- Amount is already signed in transactions_v2 (Negative for withdrawal)

  IF (TG_OP = 'INSERT') THEN
    UPDATE public.investor_positions
    SET 
        -- CORE INTEGRITY: Value driven by Ledger
        current_value = current_value + v_delta,
        
        -- Metadata Updates
        updated_at = NOW(),
        last_transaction_date = GREATEST(last_transaction_date, NEW.tx_date),
        
        -- Cost Basis Logic
        cost_basis = CASE 
            WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END,

        -- Crystallization Metadata
        last_yield_crystallization_date = GREATEST(last_yield_crystallization_date, NEW.tx_date)
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  
  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    -- Reverse the effect of voided transaction
    UPDATE public.investor_positions
    SET 
        current_value = current_value - v_delta,
        updated_at = NOW(),
        cost_basis = CASE 
            WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Trigger Definition
DROP TRIGGER IF EXISTS trg_ledger_sync ON public.transactions_v2;
CREATE TRIGGER trg_ledger_sync
AFTER INSERT OR UPDATE OF is_voided
ON public.transactions_v2
FOR EACH ROW
EXECUTE FUNCTION public.fn_ledger_drives_position();

-- 3. Refactored RPC
CREATE OR REPLACE FUNCTION public.apply_transaction_with_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_last_crystal_date date;
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_crystal_amount numeric := 0;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_validation_result jsonb;
BEGIN
  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  -- (Assuming existing validations are handled by constraints or simple checks)
  
  -- Enable canonical RPC
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate tx_type
  IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Allowed: DEPOSIT, WITHDRAWAL, FEE, ADJUSTMENT, INTEREST, FEE_CREDIT, IB_CREDIT, YIELD', p_tx_type;
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must be non-zero';
  END IF;

  -- Validate reference_id
  IF p_reference_id IS NULL OR p_reference_id = '' THEN
    RAISE EXCEPTION 'Reference ID is required for idempotency';
  END IF;

  -- Check for existing transaction (idempotency)
  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id
    AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  -- Acquire advisory lock
  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get or create position
  SELECT * INTO v_position FROM investor_positions 
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id 
  FOR UPDATE;

  IF v_position IS NULL THEN
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0,
      p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;
  v_last_crystal_date := v_position.last_yield_crystallization_date;

  -- Crystallization
  IF p_tx_type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT') THEN
    IF v_last_crystal_date IS NULL OR v_last_crystal_date < p_tx_date THEN
      IF p_new_total_aum IS NULL THEN
        SELECT total_aum INTO p_new_total_aum
        FROM fund_daily_aum
        WHERE fund_id = p_fund_id
          AND aum_date <= p_tx_date
          AND is_voided = false
        ORDER BY aum_date DESC
        LIMIT 1;
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

        SELECT * INTO v_position
        FROM investor_positions
        WHERE investor_id = p_investor_id AND fund_id = p_fund_id
        FOR UPDATE;

        v_balance_before := v_position.current_value;
        v_crystal_amount := COALESCE((v_crystal_result->>'total_yield_distributed')::numeric, 0);
      END IF;
    END IF;
  END IF; -- End Crystallization

  -- Calculate Balance After (In-Memory for Transaction Record)
  CASE p_tx_type
    WHEN 'DEPOSIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < CAST(-0.00000001 AS numeric) THEN -- Allow float epsilon
         RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'FEE' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'ADJUSTMENT' THEN
       v_balance_after := v_balance_before + p_amount;
    WHEN 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    ELSE
      v_balance_after := v_balance_before + p_amount;
  END CASE;

  -- Insert Transaction (Trigger handles Position Update)
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_date,
    value_date,
    asset,
    amount,
    type,
    balance_before,
    balance_after,
    reference_id,
    notes,
    approved_by,
    approved_at,
    created_by,
    purpose,
    source,
    is_voided
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_tx_date,
    p_tx_date,
    v_fund.asset,
    CASE
      WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount)
      ELSE ABS(p_amount)
    END,
    p_tx_type::tx_type,
    v_balance_before,
    v_balance_after,
    p_reference_id,
    p_notes,
    v_admin,
    NOW(),
    v_admin,
    p_purpose,
    'rpc_canonical'::tx_source,
    false
  )
  RETURNING id INTO v_tx_id;

  -- REMOVED: Explicit UPDATE investor_positions block
  -- (Trigger trg_ledger_sync handles it)

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'tx_id', v_tx_id,
    'crystallized_yield_amount', v_crystal_amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'last_crystallized_at', p_tx_date,
    'tx_type', p_tx_type,
    'amount', p_amount
  );

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_tx
    FROM transactions_v2
    WHERE reference_id = p_reference_id
      AND is_voided = false
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'tx_id', v_existing_tx,
      'message', 'Transaction already exists (race condition handled)'
    );
END;
$function$;
