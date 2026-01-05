-- =============================================================================
-- LEDGER INTEGRITY + CRYSTALLIZE BEFORE FLOWS (CANONICAL: transactions_v2)
-- =============================================================================
-- Enforces:
-- - Single investor_positions recompute trigger path (from SUM(transactions_v2))
-- - Ledger immutability (only void fields mutable)
-- - Sign convention + yield constraints
-- - Canonical intra-day AUM checkpoints: fund_aum_events
-- - Crystallize-before-flows model + atomic flow functions
-- - Remove all lock logic from withdrawal eligibility (reserved balance only)
--
-- NOTE: This migration intentionally does NOT introduce any second ledger table.

-- -----------------------------------------------------------------------------
-- 1) Canonical intra-day AUM checkpoints
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fund_aum_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL,
  event_ts timestamptz NOT NULL,
  event_date date NOT NULL,
  purpose public.aum_purpose NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('deposit','withdrawal','yield','month_end','manual')),
  trigger_reference text NULL,
  opening_aum numeric(28,10) NOT NULL,
  closing_aum numeric(28,10) NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_voided boolean NOT NULL DEFAULT false,
  voided_at timestamptz NULL,
  voided_by uuid NULL,
  void_reason text NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fund_aum_events_trigger
  ON public.fund_aum_events (fund_id, trigger_type, trigger_reference)
  WHERE is_voided = false;

CREATE INDEX IF NOT EXISTS ix_fund_aum_events_fund_ts_desc
  ON public.fund_aum_events (fund_id, event_ts DESC);

CREATE INDEX IF NOT EXISTS ix_fund_aum_events_fund_date_desc
  ON public.fund_aum_events (fund_id, event_date DESC);

-- -----------------------------------------------------------------------------
-- 2) Trigger supremacy: consolidate position recompute triggers
-- -----------------------------------------------------------------------------
-- Drop redundant recompute trigger (legacy/manual path)
DROP TRIGGER IF EXISTS trg_update_position_on_transaction ON public.transactions_v2;
DROP FUNCTION IF EXISTS public.update_position_on_transaction_v2();

-- Ensure recompute trigger handles UPDATE fund/investor changes
CREATE OR REPLACE FUNCTION public.trigger_recompute_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.investor_id IS NOT NULL THEN
      PERFORM public.recompute_investor_position(OLD.investor_id, OLD.fund_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.investor_id IS NOT NULL THEN
      PERFORM public.recompute_investor_position(NEW.investor_id, NEW.fund_id);
    END IF;

    IF (OLD.investor_id IS DISTINCT FROM NEW.investor_id) OR (OLD.fund_id IS DISTINCT FROM NEW.fund_id) THEN
      IF OLD.investor_id IS NOT NULL THEN
        PERFORM public.recompute_investor_position(OLD.investor_id, OLD.fund_id);
      END IF;
    END IF;

    RETURN NEW;
  ELSE
    -- INSERT
    IF NEW.investor_id IS NOT NULL THEN
      PERFORM public.recompute_investor_position(NEW.investor_id, NEW.fund_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) Enforce ledger immutability (DB-level, not UI)
-- -----------------------------------------------------------------------------
-- Remove triggers that mutate non-void columns during UPDATE (immutability would block)
DROP TRIGGER IF EXISTS tr_set_voided_tx_visibility ON public.transactions_v2;
DROP FUNCTION IF EXISTS public.set_voided_tx_visibility();

-- Ensure internal visibility enforcement only mutates on INSERT (never on UPDATE)
DROP TRIGGER IF EXISTS trg_enforce_internal_visibility ON public.transactions_v2;

CREATE OR REPLACE FUNCTION public.enforce_internal_tx_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Force admin_only for internal routing AND fee credit transactions.
    IF NEW.type IN ('INTERNAL_WITHDRAWAL', 'INTERNAL_CREDIT', 'FEE_CREDIT') THEN
      NEW.visibility_scope := 'admin_only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_internal_visibility
BEFORE INSERT ON public.transactions_v2
FOR EACH ROW EXECUTE FUNCTION public.enforce_internal_tx_visibility();

CREATE OR REPLACE FUNCTION public.enforce_transactions_v2_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  -- Only allow updates to voiding metadata.
  v_old := to_jsonb(OLD) - 'is_voided' - 'voided_at' - 'voided_by' - 'void_reason';
  v_new := to_jsonb(NEW) - 'is_voided' - 'voided_at' - 'voided_by' - 'void_reason';

  IF v_old IS DISTINCT FROM v_new THEN
    RAISE EXCEPTION 'Ledger rows are immutable. Void and re issue.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_trg_transactions_v2_immutability ON public.transactions_v2;
CREATE TRIGGER zz_trg_transactions_v2_immutability
BEFORE UPDATE ON public.transactions_v2
FOR EACH ROW EXECUTE FUNCTION public.enforce_transactions_v2_immutability();

-- -----------------------------------------------------------------------------
-- 4) Enforce sign rules + yield constraints (CHECK constraints)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_withdrawal_amount_sign'
  ) THEN
    ALTER TABLE public.transactions_v2
      ADD CONSTRAINT chk_transactions_v2_withdrawal_amount_sign
      CHECK (
        (type <> 'WITHDRAWAL'::public.tx_type) OR (amount <= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_internal_withdrawal_amount_sign'
  ) THEN
    ALTER TABLE public.transactions_v2
      ADD CONSTRAINT chk_transactions_v2_internal_withdrawal_amount_sign
      CHECK (
        (type <> 'INTERNAL_WITHDRAWAL'::public.tx_type) OR (amount <= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_deposit_amount_sign'
  ) THEN
    ALTER TABLE public.transactions_v2
      ADD CONSTRAINT chk_transactions_v2_deposit_amount_sign
      CHECK (
        (type <> 'DEPOSIT'::public.tx_type) OR (amount >= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_internal_credit_amount_sign'
  ) THEN
    ALTER TABLE public.transactions_v2
      ADD CONSTRAINT chk_transactions_v2_internal_credit_amount_sign
      CHECK (
        (type <> 'INTERNAL_CREDIT'::public.tx_type) OR (amount >= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_yield_amount_nonnegative'
  ) THEN
    ALTER TABLE public.transactions_v2
      ADD CONSTRAINT chk_transactions_v2_yield_amount_nonnegative
      CHECK (
        (type <> 'YIELD'::public.tx_type) OR (amount >= 0)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_yield_reference_required'
  ) THEN
    ALTER TABLE public.transactions_v2
      ADD CONSTRAINT chk_transactions_v2_yield_reference_required
      CHECK (
        (type <> 'YIELD'::public.tx_type) OR (reference_id IS NOT NULL)
      ) NOT VALID;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 5) Reserved-balance withdrawal eligibility (no locks, full liquidity)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_withdraw(p_investor_id uuid, p_fund_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_position record;
  v_reserved numeric(28,10) := 0;
  v_available numeric(28,10) := 0;
BEGIN
  SELECT * INTO v_position
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object('can_withdraw', false, 'reason', 'No position found in this fund');
  END IF;

  SELECT COALESCE(SUM(requested_amount), 0)::numeric(28,10)
  INTO v_reserved
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  v_available := COALESCE(v_position.current_value, 0)::numeric(28,10) - COALESCE(v_reserved, 0)::numeric(28,10);

  IF p_amount::numeric(28,10) > v_available THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Insufficient available balance (reserved withdrawals pending)',
      'current_value', COALESCE(v_position.current_value, 0),
      'reserved', COALESCE(v_reserved, 0),
      'available', v_available,
      'requested_amount', p_amount
    );
  END IF;

  RETURN jsonb_build_object(
    'can_withdraw', true,
    'current_value', COALESCE(v_position.current_value, 0),
    'reserved', COALESCE(v_reserved, 0),
    'available', v_available
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) AUM isolation for reporting: exclude fees_account
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_fund_aum_for_date(
  p_fund_id uuid,
  p_date date,
  p_purpose public.aum_purpose DEFAULT 'transaction'::public.aum_purpose,
  p_actor_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calculated_aum numeric(28,10);
  v_existing_record RECORD;
  v_actor uuid;
  v_changes jsonb := '[]'::jsonb;
  v_new_record_id uuid;
  v_action text := 'none';
BEGIN
  v_actor := COALESCE(p_actor_id, auth.uid());

  -- Calculate AUM from positions excluding house accounts
  SELECT COALESCE(SUM(ip.current_value), 0)::numeric(28,10)
  INTO v_calculated_aum
  FROM public.investor_positions ip
  JOIN public.profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND p.account_type <> 'fees_account'::public.account_type;

  SELECT * INTO v_existing_record
  FROM public.fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF ABS(v_existing_record.total_aum - v_calculated_aum) > 0.00001 THEN
      UPDATE public.fund_daily_aum
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = v_actor,
          void_reason = 'Auto-corrected by recalculate_fund_aum_for_date (exclude fees_account): old=' || v_existing_record.total_aum || ', new=' || v_calculated_aum
      WHERE id = v_existing_record.id;

      INSERT INTO public.fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
      VALUES (
        p_fund_id,
        p_date,
        v_calculated_aum,
        p_purpose,
        'recalculated',
        v_actor,
        (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
      )
      RETURNING id INTO v_new_record_id;

      v_action := 'corrected';
      v_changes := v_changes || jsonb_build_object(
        'action', 'corrected',
        'old_record_id', v_existing_record.id,
        'new_record_id', v_new_record_id,
        'old_aum', v_existing_record.total_aum,
        'new_aum', v_calculated_aum,
        'difference', v_calculated_aum - v_existing_record.total_aum
      );

      -- Audit log (preserve existing behavior; note fees_account exclusion)
      INSERT INTO public.audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
      VALUES (
        'fund_daily_aum',
        v_new_record_id::text,
        'AUM_RECALCULATED',
        v_actor,
        jsonb_build_object('total_aum', v_existing_record.total_aum, 'old_record_id', v_existing_record.id),
        jsonb_build_object('total_aum', v_calculated_aum, 'new_record_id', v_new_record_id),
        jsonb_build_object('fund_id', p_fund_id, 'date', p_date, 'purpose', p_purpose, 'excludes_fees_account', true)
      );
    ELSE
      v_action := 'unchanged';
    END IF;
  ELSE
    INSERT INTO public.fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (
      p_fund_id,
      p_date,
      v_calculated_aum,
      p_purpose,
      'transaction_op',
      v_actor,
      (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date)
    )
    RETURNING id INTO v_new_record_id;

    v_action := 'created';
    v_changes := v_changes || jsonb_build_object('action', 'created', 'record_id', v_new_record_id, 'aum', v_calculated_aum);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'date', p_date,
    'purpose', p_purpose,
    'calculated_aum', v_calculated_aum,
    'action', v_action,
    'changes', v_changes
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Canonical crystallization: fund_aum_events + YIELD tx in transactions_v2
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_event_ts timestamptz,
  p_closing_aum numeric(28,10),
  p_trigger_type text,
  p_trigger_reference text,
  p_purpose public.aum_purpose,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_opening_aum numeric(28,10);
  v_gross_yield numeric(28,10);
  v_total_opening numeric(28,10);
  v_event_id uuid;
  v_existing_event_id uuid;
  v_existing_opening numeric(28,10);
  v_existing_closing numeric(28,10);
  v_fund record;
  v_alloc_sum numeric(28,10);
  v_remainder numeric(28,10);
  v_dust_receiver uuid;
BEGIN
  IF p_closing_aum IS NULL THEN
    RAISE EXCEPTION 'p_closing_aum is required (authoritative snapshot)';
  END IF;

  IF p_trigger_type NOT IN ('deposit','withdrawal','yield','month_end','manual') THEN
    RAISE EXCEPTION 'Invalid trigger_type: %', p_trigger_type;
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Idempotency: if this exact event already exists, return it without reissuing YIELD rows.
  SELECT id, opening_aum, closing_aum
  INTO v_existing_event_id, v_existing_opening, v_existing_closing
  FROM public.fund_aum_events
  WHERE fund_id = p_fund_id
    AND trigger_type = p_trigger_type
    AND trigger_reference IS NOT DISTINCT FROM p_trigger_reference
    AND is_voided = false
  ORDER BY event_ts DESC
  LIMIT 1;

  IF v_existing_event_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'fund_id', p_fund_id,
      'event_id', v_existing_event_id,
      'opening_aum', v_existing_opening,
      'closing_aum', v_existing_closing
    );
  END IF;

  -- opening_aum from the last checkpoint; if none, start baseline at closing (gross_yield = 0)
  SELECT fae.closing_aum
  INTO v_opening_aum
  FROM public.fund_aum_events fae
  WHERE fae.fund_id = p_fund_id AND fae.is_voided = false
  ORDER BY fae.event_ts DESC
  LIMIT 1;

  IF v_opening_aum IS NULL THEN
    v_opening_aum := p_closing_aum;
  END IF;

  v_gross_yield := (p_closing_aum - v_opening_aum)::numeric(28,10);

  IF v_gross_yield < 0 THEN
    RAISE EXCEPTION 'Yield cannot be negative. Admin must correct AUM snapshot. opening=% closing=% delta=%',
      v_opening_aum, p_closing_aum, v_gross_yield;
  END IF;

  -- Insert AUM checkpoint (immutable audit trail)
  INSERT INTO public.fund_aum_events (
    fund_id, event_ts, event_date, purpose, trigger_type, trigger_reference,
    opening_aum, closing_aum, created_by
  )
  VALUES (
    p_fund_id,
    p_event_ts,
    (p_event_ts AT TIME ZONE 'UTC')::date,
    p_purpose,
    p_trigger_type,
    p_trigger_reference,
    v_opening_aum,
    p_closing_aum,
    p_admin_id
  )
  RETURNING id INTO v_event_id;

  IF v_gross_yield = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'fund_id', p_fund_id,
      'event_id', v_event_id,
      'opening_aum', v_opening_aum,
      'closing_aum', p_closing_aum,
      'gross_yield', v_gross_yield,
      'yield_tx_count', 0
    );
  END IF;

  -- Total opening balance excluding fees_account (yield recipients)
  SELECT COALESCE(SUM(ip.current_value), 0)::numeric(28,10)
  INTO v_total_opening
  FROM public.investor_positions ip
  JOIN public.profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND p.account_type <> 'fees_account'::public.account_type;

  IF v_total_opening <= 0 THEN
    RAISE EXCEPTION 'Cannot allocate yield: total opening AUM is zero (fund_id=% event_id=%)', p_fund_id, v_event_id;
  END IF;

  -- Dust receiver = largest opening balance investor (deterministic tie-break)
  SELECT ip.investor_id
  INTO v_dust_receiver
  FROM public.investor_positions ip
  JOIN public.profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0
    AND p.account_type <> 'fees_account'::public.account_type
  ORDER BY ip.current_value DESC, ip.investor_id ASC
  LIMIT 1;

  WITH eligible AS (
    SELECT
      ip.investor_id,
      ip.current_value::numeric(28,10) AS opening_balance,
      round((v_gross_yield * (ip.current_value / v_total_opening))::numeric, 10)::numeric(28,10) AS alloc_rounded
    FROM public.investor_positions ip
    JOIN public.profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND p.account_type <> 'fees_account'::public.account_type
  ),
  sums AS (
    SELECT COALESCE(SUM(alloc_rounded), 0)::numeric(28,10) AS alloc_sum FROM eligible
  )
  SELECT alloc_sum, (v_gross_yield - alloc_sum)::numeric(28,10)
  INTO v_alloc_sum, v_remainder
  FROM sums;

  -- Insert YIELD transactions (rounded allocations + deterministic dust)
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    reference_id, notes, created_by, is_system_generated
  )
  SELECT
    e.investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    (e.alloc_rounded + CASE WHEN e.investor_id = v_dust_receiver THEN v_remainder ELSE 0 END)::numeric(28,10),
    'YIELD'::public.tx_type,
    (p_event_ts AT TIME ZONE 'UTC')::date,
    (p_event_ts AT TIME ZONE 'UTC')::date,
    'yield_distribution'::public.tx_source,
    p_purpose,
    'investor_visible'::public.visibility_scope,
    (
      'YLD:' || p_fund_id::text || ':' || p_trigger_type || ':' ||
      COALESCE(p_trigger_reference, to_char(p_event_ts AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS')) || ':' ||
      left(e.investor_id::text, 8)
    ) AS reference_id,
    'Crystallized yield before flow',
    p_admin_id,
    true
  FROM eligible e;

  -- Conservation check (tolerance 1e-10)
  IF ABS((v_alloc_sum + v_remainder) - v_gross_yield) > 0.0000000001 THEN
    RAISE EXCEPTION 'Yield allocation failed conservation check. gross=% allocated=% remainder=%',
      v_gross_yield, v_alloc_sum, v_remainder;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'event_id', v_event_id,
    'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum,
    'gross_yield', v_gross_yield,
    'allocated_sum', v_alloc_sum,
    'remainder', v_remainder
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 8) Atomic flow application (crystallize first, then insert flow tx)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric(28,10),
  p_event_ts timestamptz,
  p_closing_aum numeric(28,10),
  p_trigger_reference text,
  p_purpose public.aum_purpose DEFAULT 'transaction'::public.aum_purpose,
  p_admin_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund record;
  v_admin uuid := COALESCE(p_admin_id, auth.uid());
  v_crystal jsonb;
  v_tx_id uuid;
  v_ref text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount must be > 0';
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_crystal := public.crystallize_yield_before_flow(
    p_fund_id,
    p_event_ts,
    p_closing_aum,
    'deposit',
    p_trigger_reference,
    p_purpose,
    v_admin
  );

  v_ref := 'DEP:' || p_trigger_reference;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    reference_id, notes, created_by, is_system_generated
  )
  VALUES (
    p_investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    ABS(p_amount)::numeric(28,10),
    'DEPOSIT'::public.tx_type,
    (p_event_ts AT TIME ZONE 'UTC')::date,
    (p_event_ts AT TIME ZONE 'UTC')::date,
    'manual_admin'::public.tx_source,
    p_purpose,
    'investor_visible'::public.visibility_scope,
    v_ref,
    'Deposit (crystallize-before-flow)',
    v_admin,
    false
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'deposit_tx_id', v_tx_id,
    'crystallization', v_crystal
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric(28,10),
  p_event_ts timestamptz,
  p_closing_aum numeric(28,10),
  p_trigger_reference text,
  p_purpose public.aum_purpose DEFAULT 'transaction'::public.aum_purpose,
  p_admin_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund record;
  v_admin uuid := COALESCE(p_admin_id, auth.uid());
  v_crystal jsonb;
  v_tx_id uuid;
  v_ref text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be > 0';
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_crystal := public.crystallize_yield_before_flow(
    p_fund_id,
    p_event_ts,
    p_closing_aum,
    'withdrawal',
    p_trigger_reference,
    p_purpose,
    v_admin
  );

  v_ref := 'WDR:' || p_trigger_reference;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    reference_id, notes, created_by, is_system_generated
  )
  VALUES (
    p_investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    (-ABS(p_amount))::numeric(28,10),
    'WITHDRAWAL'::public.tx_type,
    (p_event_ts AT TIME ZONE 'UTC')::date,
    (p_event_ts AT TIME ZONE 'UTC')::date,
    'withdrawal_completion'::public.tx_source,
    p_purpose,
    'investor_visible'::public.visibility_scope,
    v_ref,
    'Withdrawal (crystallize-before-flow)',
    v_admin,
    false
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_tx_id', v_tx_id,
    'crystallization', v_crystal
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 8.5) Disable manual position writes via adjust_investor_position
-- -----------------------------------------------------------------------------
-- Legacy RPC is widely used by the client, but it previously performed direct
-- INSERT/UPDATE on investor_positions (forbidden). This replacement:
-- - forbids using DEPOSIT/WITHDRAWAL through this RPC (must use crystallize flows)
-- - inserts only into transactions_v2 and relies on recompute triggers for balances
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric(28,10),
  p_note text DEFAULT NULL::text,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_tx_type text DEFAULT 'ADJUSTMENT'::text,
  p_tx_date date DEFAULT CURRENT_DATE,
  p_reference_id text DEFAULT NULL::text
)
RETURNS TABLE(transaction_id uuid, old_balance numeric(28,10), new_balance numeric(28,10))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund record;
  v_tx_type public.tx_type;
  v_amount numeric(28,10);
  v_ref text;
  v_tx_id uuid;
  v_old numeric(28,10);
  v_new numeric(28,10);
BEGIN
  IF p_investor_id IS NULL OR p_fund_id IS NULL THEN
    RAISE EXCEPTION 'investor_id and fund_id are required';
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_tx_type := p_tx_type::public.tx_type;

  IF v_tx_type IN ('DEPOSIT'::public.tx_type, 'WITHDRAWAL'::public.tx_type) THEN
    RAISE EXCEPTION 'Use apply_deposit_with_crystallization / apply_withdrawal_with_crystallization for flows (crystallize-before-flow)';
  END IF;

  v_amount := round(COALESCE(p_delta, 0)::numeric, 10)::numeric(28,10);

  -- Enforce sign conventions for internal routing (other types rely on table constraints)
  IF v_tx_type = 'INTERNAL_WITHDRAWAL'::public.tx_type THEN
    v_amount := (-abs(v_amount))::numeric(28,10);
  ELSIF v_tx_type IN ('INTERNAL_CREDIT'::public.tx_type, 'YIELD'::public.tx_type) THEN
    v_amount := abs(v_amount)::numeric(28,10);
  END IF;

  v_ref := COALESCE(p_reference_id, 'ADJ:' || left(gen_random_uuid()::text, 16));

  SELECT COALESCE(SUM(
    CASE
      WHEN t.type = ANY (ARRAY[
        'DEPOSIT'::public.tx_type,
        'INTEREST'::public.tx_type,
        'IB_CREDIT'::public.tx_type,
        'YIELD'::public.tx_type,
        'INTERNAL_CREDIT'::public.tx_type,
        'FEE_CREDIT'::public.tx_type,
        'ADJUSTMENT'::public.tx_type
      ]) THEN t.amount
      WHEN t.type = ANY (ARRAY[
        'WITHDRAWAL'::public.tx_type,
        'FEE'::public.tx_type,
        'INTERNAL_WITHDRAWAL'::public.tx_type
      ]) THEN (-abs(t.amount))
      ELSE 0::numeric
    END
  ), 0)::numeric(28,10)
  INTO v_old
  FROM public.transactions_v2 t
  WHERE t.investor_id = p_investor_id
    AND t.fund_id = p_fund_id
    AND t.is_voided = false;

  v_new := (v_old + v_amount)::numeric(28,10);
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested delta: %', v_old, v_amount;
  END IF;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    reference_id, notes, created_by, is_system_generated
  )
  VALUES (
    p_investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    v_amount,
    v_tx_type,
    p_tx_date,
    p_tx_date,
    'manual_admin'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_ref,
    p_note,
    COALESCE(p_admin_id, auth.uid()),
    false
  )
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_tx_id, v_old, v_new;
END;
$$;

-- -----------------------------------------------------------------------------
-- 9) Fix apply_daily_yield_to_fund_v3 to match schema + rules
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_purpose public.aum_purpose DEFAULT 'reporting'::public.aum_purpose,
  p_admin_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := COALESCE(p_admin_id, auth.uid());
  v_event_ts timestamptz := (p_yield_date::timestamptz);
BEGIN
  -- Crystallize as a "yield" trigger (no position mutations here; trigger recompute handles balances from ledger)
  RETURN public.crystallize_yield_before_flow(
    p_fund_id,
    v_event_ts,
    round(p_new_aum::numeric, 10)::numeric(28,10),
    'yield',
    to_char(p_yield_date, 'YYYY-MM-DD') || ':' || p_purpose::text,
    p_purpose,
    v_admin
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 10) Fix internal_route_to_fees (idempotent, signed, no manual position writes)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.internal_route_to_fees(
  p_from_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric,
  p_effective_date date,
  p_reason text,
  p_admin_id uuid,
  p_transfer_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(transfer_id uuid, debit_tx_id uuid, credit_tx_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transfer_id uuid := COALESCE(p_transfer_id, gen_random_uuid());
  v_debit_tx_id uuid;
  v_credit_tx_id uuid;
  v_fund record;
  v_fees_account_id uuid;
BEGIN
  IF NOT public.is_admin_for_jwt() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Admin access required';
    RETURN;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Amount must be positive';
    RETURN;
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fund not found';
    RETURN;
  END IF;

  SELECT id INTO v_fees_account_id
  FROM public.profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fees account not configured (profiles.account_type=fees_account)';
    RETURN;
  END IF;

  -- Idempotency: if already present (and not voided), return existing ids
  SELECT
    MAX(CASE WHEN type = 'INTERNAL_WITHDRAWAL'::public.tx_type THEN id END),
    MAX(CASE WHEN type = 'INTERNAL_CREDIT'::public.tx_type THEN id END)
  INTO v_debit_tx_id, v_credit_tx_id
  FROM public.transactions_v2
  WHERE transfer_id = v_transfer_id
    AND is_voided = false;

  IF v_debit_tx_id IS NOT NULL OR v_credit_tx_id IS NOT NULL THEN
    RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Transfer already processed';
    RETURN;
  END IF;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    p_from_investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    (-ABS(p_amount))::numeric(28,10),
    'INTERNAL_WITHDRAWAL'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_debit_tx_id;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    v_fees_account_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    ABS(p_amount)::numeric(28,10),
    'INTERNAL_CREDIT'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_credit_tx_id;

  RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Internal transfer completed successfully';
END;
$$;

-- -----------------------------------------------------------------------------
-- 11) Withdrawal completion path: crystallize first, then post ledger tx
-- -----------------------------------------------------------------------------
-- Preserve old signature for safety, but remove it from the canonical name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'complete_withdrawal'
      AND pg_get_function_identity_arguments(p.oid) = 'p_request_id uuid, p_transaction_hash text, p_admin_notes text'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.complete_withdrawal(uuid, text, text) RENAME TO complete_withdrawal_legacy';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id uuid,
  p_closing_aum numeric(28,10),
  p_event_ts timestamptz DEFAULT now(),
  p_transaction_hash text DEFAULT NULL::text,
  p_admin_notes text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request record;
  v_admin uuid := auth.uid();
  v_result jsonb;
  v_withdrawal_tx_id uuid;
BEGIN
  PERFORM public.require_super_admin('complete_withdrawal');

  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status <> 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals that are in processing status. Current status: %', v_request.status;
  END IF;

  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;

  -- Crystallize BEFORE posting the withdrawal ledger row, then post withdrawal to the ledger (negative amount)
  v_result := public.apply_withdrawal_with_crystallization(
    v_request.investor_id,
    v_request.fund_id,
    ABS(v_request.processed_amount)::numeric(28,10),
    p_event_ts,
    p_closing_aum,
    p_request_id::text,
    'transaction'::public.aum_purpose,
    v_admin
  );

  v_withdrawal_tx_id := (v_result->>'withdrawal_tx_id')::uuid;

  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_request.processed_amount,
      'tx_hash', p_transaction_hash,
      'withdrawal_tx_id', v_withdrawal_tx_id,
      'crystallization', v_result->'crystallization',
      'completed_by', v_admin
    )
  );

  RETURN TRUE;
END;
$$;
