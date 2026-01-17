-- ============================================================================
-- P0: Crystallization Enforcement Migration
-- Date: 2026-01-16
-- Purpose: Enforce "crystallize before every transaction" invariant
-- ============================================================================

-- ============================================================================
-- 1. Add unique constraint on reference_id for idempotency
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_v2_reference_id_unique'
  ) THEN
    -- Create partial unique index (allows multiple NULLs)
    CREATE UNIQUE INDEX IF NOT EXISTS transactions_v2_reference_id_unique
      ON transactions_v2 (reference_id)
      WHERE reference_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. Create v_crystallization_gaps view
-- ============================================================================
CREATE OR REPLACE VIEW public.v_crystallization_gaps AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  p.email AS investor_email,
  ip.current_value,
  ip.last_yield_crystallization_date,
  ip.cumulative_yield_earned,
  tx.max_tx_date,
  tx.last_tx_type,
  CASE
    WHEN ip.last_yield_crystallization_date IS NULL THEN 'never_crystallized'
    WHEN ip.last_yield_crystallization_date < tx.max_tx_date THEN 'stale_crystallization'
    ELSE 'ok'
  END AS gap_type,
  COALESCE(tx.max_tx_date, CURRENT_DATE) - COALESCE(ip.last_yield_crystallization_date, '1900-01-01'::date) AS days_behind
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN LATERAL (
  SELECT
    MAX(t.tx_date) AS max_tx_date,
    (SELECT t2.type FROM transactions_v2 t2
     WHERE t2.investor_id = ip.investor_id
     AND t2.fund_id = ip.fund_id
     AND t2.is_voided = false
     ORDER BY t2.tx_date DESC, t2.created_at DESC
     LIMIT 1)::text AS last_tx_type
  FROM transactions_v2 t
  WHERE t.investor_id = ip.investor_id
    AND t.fund_id = ip.fund_id
    AND t.is_voided = false
) tx ON true
WHERE ip.is_active = true
  AND (
    -- Never crystallized but has transactions
    (ip.last_yield_crystallization_date IS NULL AND tx.max_tx_date IS NOT NULL)
    -- Or crystallization is behind latest transaction
    OR (ip.last_yield_crystallization_date < tx.max_tx_date)
  );

COMMENT ON VIEW v_crystallization_gaps IS
  'Shows positions where crystallization is behind the latest transaction. Empty = healthy.';

-- ============================================================================
-- 3. Create unified apply_transaction_with_crystallization RPC
-- ============================================================================
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
AS $$
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
BEGIN
  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Validate tx_type
  IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Allowed: DEPOSIT, WITHDRAWAL, FEE, ADJUSTMENT, INTEREST, FEE_CREDIT, IB_CREDIT', p_tx_type;
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
    -- Return existing transaction info
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  -- Acquire advisory lock for investor+fund combination
  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get or create position
  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    -- Create new position
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

  -- =========================================================================
  -- CRYSTALLIZATION (MANDATORY for DEPOSIT, WITHDRAWAL, ADJUSTMENT)
  -- =========================================================================
  IF p_tx_type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT') THEN
    IF v_last_crystal_date IS NULL OR v_last_crystal_date < p_tx_date THEN
      -- Check if we have AUM data for crystallization
      IF p_new_total_aum IS NULL THEN
        -- Try to get latest AUM
        SELECT total_aum INTO p_new_total_aum
        FROM fund_daily_aum
        WHERE fund_id = p_fund_id
          AND aum_date <= p_tx_date
          AND is_voided = false
        ORDER BY aum_date DESC
        LIMIT 1;
      END IF;

      IF p_new_total_aum IS NOT NULL AND p_new_total_aum > 0 THEN
        -- Call crystallize_yield_before_flow
        v_crystal_result := crystallize_yield_before_flow(
          p_fund_id := p_fund_id,
          p_closing_aum := p_new_total_aum,
          p_trigger_type := 'transaction',
          p_trigger_reference := p_reference_id,
          p_event_ts := (p_tx_date::timestamp + interval '12 hours'),
          p_admin_id := v_admin,
          p_purpose := p_purpose
        );

        -- Refresh position after crystallization
        SELECT * INTO v_position
        FROM investor_positions
        WHERE investor_id = p_investor_id AND fund_id = p_fund_id
        FOR UPDATE;

        v_balance_before := v_position.current_value;
        v_crystal_amount := COALESCE((v_crystal_result->>'total_yield_distributed')::numeric, 0);
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- APPLY MAIN TRANSACTION
  -- =========================================================================

  -- Calculate new balance
  CASE p_tx_type
    WHEN 'DEPOSIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'FEE' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'ADJUSTMENT' THEN
      v_balance_after := v_balance_before + p_amount; -- Can be positive or negative
    WHEN 'INTEREST', 'YIELD' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'FEE_CREDIT', 'IB_CREDIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    ELSE
      v_balance_after := v_balance_before + p_amount;
  END CASE;

  -- Insert transaction
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

  -- Update position
  UPDATE investor_positions
  SET
    current_value = v_balance_after,
    last_transaction_date = p_tx_date,
    last_yield_crystallization_date = GREATEST(
      COALESCE(last_yield_crystallization_date, p_tx_date),
      p_tx_date
    ),
    cost_basis = CASE
      WHEN p_tx_type = 'DEPOSIT' THEN cost_basis + ABS(p_amount)
      WHEN p_tx_type = 'WITHDRAWAL' THEN cost_basis - LEAST(ABS(p_amount), cost_basis)
      ELSE cost_basis
    END,
    updated_at = NOW()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Return result
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
    -- Handle race condition on reference_id
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
$$;

COMMENT ON FUNCTION apply_transaction_with_crystallization IS
  'Canonical RPC for all balance-changing transactions. Crystallizes yield before applying transaction. Idempotent via reference_id.';

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================
GRANT SELECT ON v_crystallization_gaps TO authenticated;
GRANT EXECUTE ON FUNCTION apply_transaction_with_crystallization TO authenticated;

-- ============================================================================
-- 5. Add tx_source enum value if not exists
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tx_source' AND e.enumlabel = 'rpc_canonical'
  ) THEN
    ALTER TYPE tx_source ADD VALUE IF NOT EXISTS 'rpc_canonical';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
