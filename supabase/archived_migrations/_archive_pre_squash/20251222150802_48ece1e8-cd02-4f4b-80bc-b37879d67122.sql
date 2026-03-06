
-- =============================================================================
-- TRANSACTION VOID/EDIT SUPPORT MIGRATION
-- Adds soft void capability, mutation audit trail, and position recomputation
-- =============================================================================

-- 1. Add void columns to transactions_v2
ALTER TABLE public.transactions_v2 
ADD COLUMN IF NOT EXISTS is_voided boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS voided_at timestamptz,
ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS void_reason text;

-- 2. Create transaction_mutations audit table
CREATE TABLE IF NOT EXISTS public.transaction_mutations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions_v2(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('void', 'update', 'delete')),
  before_data jsonb NOT NULL,
  after_data jsonb,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for quick lookups by transaction
CREATE INDEX IF NOT EXISTS idx_transaction_mutations_tx_id 
  ON public.transaction_mutations(transaction_id);

-- Enable RLS
ALTER TABLE public.transaction_mutations ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write mutations
CREATE POLICY "Admins can manage transaction mutations"
  ON public.transaction_mutations FOR ALL
  TO authenticated
  USING (check_is_admin(auth.uid()))
  WITH CHECK (check_is_admin(auth.uid()));

-- 3. Create RPC to void a transaction (admin only)
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_actor_id uuid := auth.uid();
  v_before jsonb;
BEGIN
  -- Admin check
  IF NOT check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Void reason is required';
  END IF;

  -- Get transaction and lock row
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  -- Block voiding system-generated transactions unless specific override
  IF v_tx.is_system_generated = true AND v_tx.source IN ('yield_distribution', 'fee_allocation', 'ib_allocation') THEN
    RAISE EXCEPTION 'Cannot void system-generated % transaction. Use correction workflow.', v_tx.source;
  END IF;

  -- Capture before state
  v_before := row_to_json(v_tx)::jsonb;

  -- Void the transaction
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = now(),
      voided_by = v_actor_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;

  -- Write mutation log
  INSERT INTO transaction_mutations (transaction_id, action, before_data, after_data, actor_id, reason)
  VALUES (
    p_transaction_id,
    'void',
    v_before,
    (SELECT row_to_json(t)::jsonb FROM transactions_v2 t WHERE t.id = p_transaction_id),
    v_actor_id,
    p_reason
  );

  -- Trigger position recomputation
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', now()
  );
END;
$$;

-- 4. Create RPC to update editable fields on a transaction (admin only)
CREATE OR REPLACE FUNCTION public.update_transaction(
  p_transaction_id uuid,
  p_updates jsonb,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_actor_id uuid := auth.uid();
  v_before jsonb;
  v_allowed_fields text[] := ARRAY['tx_date', 'value_date', 'notes', 'tx_hash', 'amount', 'type', 'fund_id', 'reference_id'];
  v_field text;
  v_new_amount numeric;
  v_new_fund_id uuid;
  v_old_fund_id uuid;
BEGIN
  -- Admin check
  IF NOT check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Edit reason is required';
  END IF;

  -- Get transaction and lock row
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;

  -- Block editing investor_id
  IF p_updates ? 'investor_id' THEN
    RAISE EXCEPTION 'Cannot change investor_id on a transaction';
  END IF;

  -- Validate only allowed fields are being updated
  FOR v_field IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT (v_field = ANY(v_allowed_fields)) THEN
      RAISE EXCEPTION 'Field % is not editable', v_field;
    END IF;
  END LOOP;

  -- Block editing system-generated transactions
  IF v_tx.is_system_generated = true THEN
    RAISE EXCEPTION 'Cannot edit system-generated transactions';
  END IF;

  -- Capture before state
  v_before := row_to_json(v_tx)::jsonb;
  v_old_fund_id := v_tx.fund_id;

  -- Extract new values for recomputation
  v_new_amount := COALESCE((p_updates->>'amount')::numeric, v_tx.amount);
  v_new_fund_id := COALESCE((p_updates->>'fund_id')::uuid, v_tx.fund_id);

  -- Update the transaction
  UPDATE transactions_v2
  SET 
    tx_date = COALESCE((p_updates->>'tx_date')::date, tx_date),
    value_date = COALESCE((p_updates->>'value_date')::date, value_date),
    notes = COALESCE(p_updates->>'notes', notes),
    tx_hash = COALESCE(p_updates->>'tx_hash', tx_hash),
    amount = v_new_amount,
    type = COALESCE((p_updates->>'type')::tx_type_v2, type),
    fund_id = v_new_fund_id,
    reference_id = COALESCE(p_updates->>'reference_id', reference_id)
  WHERE id = p_transaction_id;

  -- Write mutation log
  INSERT INTO transaction_mutations (transaction_id, action, before_data, after_data, actor_id, reason)
  VALUES (
    p_transaction_id,
    'update',
    v_before,
    (SELECT row_to_json(t)::jsonb FROM transactions_v2 t WHERE t.id = p_transaction_id),
    v_actor_id,
    p_reason
  );

  -- Recompute positions for affected funds
  PERFORM recompute_investor_position(v_tx.investor_id, v_old_fund_id);
  IF v_new_fund_id IS DISTINCT FROM v_old_fund_id THEN
    PERFORM recompute_investor_position(v_tx.investor_id, v_new_fund_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'updated_at', now()
  );
END;
$$;

-- 5. Update recompute_investor_position to exclude voided transactions
CREATE OR REPLACE FUNCTION public.recompute_investor_position(
  p_investor_id uuid,
  p_fund_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_cost_basis numeric := 0;
  v_realized_pnl numeric := 0;
  v_first_tx_date date;
  v_last_tx_date date;
BEGIN
  -- Calculate totals from non-voided transactions only
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN type IN ('DEPOSIT', 'TOP_UP', 'FIRST_INVESTMENT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN amount
        WHEN type IN ('WITHDRAWAL', 'REDEMPTION', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -amount
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'TOP_UP', 'FIRST_INVESTMENT') THEN amount ELSE 0 END), 0),
    MIN(tx_date),
    MAX(tx_date)
  INTO v_total, v_cost_basis, v_first_tx_date, v_last_tx_date
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id
    AND is_voided = false;

  -- Upsert the position
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, updated_at)
  VALUES (p_investor_id, p_fund_id, v_total, v_cost_basis, v_total, now())
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_total,
    shares = v_total,
    cost_basis = v_cost_basis,
    updated_at = now();

END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_investor_position(uuid, uuid) TO authenticated;

-- 7. Add index for voided filter (performance)
CREATE INDEX IF NOT EXISTS idx_transactions_v2_voided 
  ON public.transactions_v2(is_voided) WHERE is_voided = true;
