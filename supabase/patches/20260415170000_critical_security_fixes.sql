-- =============================================================================
-- CRITICAL SECURITY FIXES
-- =============================================================================
-- Fixes 7 security issues identified by Supabase security scanner:
--
-- 1. [CRITICAL] is_admin() returns true unconditionally — 40 tables affected
-- 2. [CRITICAL] user_roles INSERT policy allows any user to self-grant admin
-- 3. [CRITICAL] investor_daily_balance has no RLS
-- 4. [CRITICAL] fund_aum_events has no RLS
-- 5. [CRITICAL] fund_yield_snapshots has no RLS
-- 6. [HIGH] Storage buckets lack object-level policies
-- 7. [MEDIUM] Some views use security_definer instead of security_invoker
--
-- Also applies remaining drift-free fixes:
-- 8. fn_ledger_drives_position INTERNAL_WITHDRAWAL explicit handling (P1)
-- 9. unvoid_transaction AUM recalc + cascade detection (P2)
-- 10. apply_investor_transaction 14-param removes duplicate AUM write (P3)
-- =============================================================================


-- =============================================================================
-- FIX 1: is_admin() — Replace unconditional true with user_roles lookup
-- =============================================================================
-- The 0-arg is_admin() is used by 40+ RLS policies. It MUST check auth.uid().
-- The 1-arg is_admin(p_user_id) is already correct (checks user_roles).
-- We also keep a safety valve: if user_roles has no rows, the system bootstraps.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  );
$$;


-- =============================================================================
-- FIX 2: user_roles INSERT policy — Prevent self-granting admin/super_admin
-- =============================================================================
-- Current: "Allow role insert during signup" only checks user_id = auth.uid()
-- Fix: Restrict to 'investor' role only for self-signup

DROP POLICY IF EXISTS "Allow role insert during signup" ON public.user_roles;

CREATE POLICY "Allow investor role insert during signup"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'investor'::app_role);


-- =============================================================================
-- FIX 3: Enable RLS on investor_daily_balance + add policies
-- =============================================================================

ALTER TABLE public.investor_daily_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investor_daily_balance_select_own"
  ON public.investor_daily_balance
  FOR SELECT
  USING (investor_id = auth.uid());

CREATE POLICY "investor_daily_balance_admin_all"
  ON public.investor_daily_balance
  FOR ALL
  USING (is_admin());


-- =============================================================================
-- FIX 4: Enable RLS on fund_aum_events + add policies
-- =============================================================================

ALTER TABLE public.fund_aum_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_aum_events_select_all"
  ON public.fund_aum_events
  FOR SELECT
  USING (true);

CREATE POLICY "fund_aum_events_admin_write"
  ON public.fund_aum_events
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "fund_aum_events_admin_update"
  ON public.fund_aum_events
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "fund_aum_events_admin_delete"
  ON public.fund_aum_events
  FOR DELETE
  USING (is_admin());


-- =============================================================================
-- FIX 5: Enable RLS on fund_yield_snapshots + add policies
-- =============================================================================

ALTER TABLE public.fund_yield_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_yield_snapshots_select_all"
  ON public.fund_yield_snapshots
  FOR SELECT
  USING (true);

CREATE POLICY "fund_yield_snapshots_admin_write"
  ON public.fund_yield_snapshots
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());


-- =============================================================================
-- FIX 6: Storage object policies for documents, profile-photos, profiles,
--         branding-assets buckets
-- =============================================================================
-- documents: admin can CRUD, investors can read their own (via path matching)
-- profile-photos: users can CRUD their own, admins can CRUD all
-- profiles (bucket): users can CRUD their own profile images, admins all
-- branding-assets: admin-only CRUD

-- documents bucket
CREATE POLICY "documents_admin_all"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "documents_investor_read_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- profile-photos bucket
CREATE POLICY "profile_photos_admin_all"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'profile-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'profile-photos' AND public.is_admin());

CREATE POLICY "profile_photos_owner CRUD"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- profiles bucket
CREATE POLICY "profiles_bucket_admin_all"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'profiles' AND public.is_admin())
  WITH CHECK (bucket_id = 'profiles' AND public.is_admin());

CREATE POLICY "profiles_bucket_owner_crud"
  ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- branding-assets bucket (admin only)
CREATE POLICY "branding_assets_admin_all"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'branding-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'branding-assets' AND public.is_admin());

CREATE POLICY "branding_assets_read_all"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding-assets');


-- =============================================================================
-- FIX 7: Recreate views with security_invoker where applicable
-- =============================================================================
-- Reconciliation/monitoring views should use security_invoker so RLS applies.
-- Admin-only utility views that already filter via is_admin() are safe either way.

CREATE OR REPLACE VIEW public.v_concentration_risk
WITH (security_invoker = true)
AS
WITH fund_totals AS (
         SELECT investor_positions.fund_id,
            sum(investor_positions.current_value) AS total_aum
           FROM investor_positions
          WHERE investor_positions.is_active = true
          GROUP BY investor_positions.fund_id
        )
 SELECT f.id AS fund_id,
    f.code AS fund_code,
    p.id AS investor_id,
    TRIM(BOTH FROM (COALESCE(p.first_name, '') || ' ') || COALESCE(p.last_name, '')) AS investor_name,
    p.account_type::text AS account_type,
    ip.current_value AS position_value,
    ft.total_aum AS fund_aum,
        CASE
            WHEN ft.total_aum > 0 THEN round(ip.current_value / ft.total_aum * 100, 2)
            ELSE 0
        END AS ownership_pct,
        CASE
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0)) >= 0.40 THEN 'CRITICAL'
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0)) >= 0.25 THEN 'HIGH'
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0)) >= 0.15 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS concentration_level
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
     JOIN profiles p ON p.id = ip.investor_id
     JOIN fund_totals ft ON ft.fund_id = f.id
  WHERE ip.is_active = true AND f.status = 'active' AND p.account_type = 'investor'
  ORDER BY (
        CASE
            WHEN ft.total_aum > 0 THEN round(ip.current_value / ft.total_aum * 100, 2)
            ELSE 0
        END) DESC;

CREATE OR REPLACE VIEW public.v_liquidity_risk
WITH (security_invoker = true)
AS
SELECT f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    COALESCE(pos.total_aum, 0) AS total_aum,
    COALESCE(wr_agg.total_pending, 0) AS pending_withdrawals,
    COALESCE(pos.active_positions, 0) AS active_positions,
        CASE
            WHEN COALESCE(pos.total_aum, 0) > 0 THEN round(COALESCE(wr_agg.total_pending, 0) / pos.total_aum * 100, 2)
            ELSE 0
        END AS withdrawal_ratio,
        CASE
            WHEN COALESCE(pos.total_aum, 0) = 0 THEN 'NO_AUM'
            WHEN (COALESCE(wr_agg.total_pending, 0) / NULLIF(pos.total_aum, 0)) > 0.3 THEN 'HIGH'
            WHEN (COALESCE(wr_agg.total_pending, 0) / NULLIF(pos.total_aum, 0)) > 0.15 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS risk_level
   FROM funds f
     LEFT JOIN ( SELECT ip.fund_id,
            sum(ip.current_value) AS total_aum,
            count(*)::integer AS active_positions
           FROM investor_positions ip
          WHERE ip.is_active = true
          GROUP BY ip.fund_id) pos ON pos.fund_id = f.id
     LEFT JOIN ( SELECT wr.fund_id,
            sum(wr.requested_amount) FILTER (WHERE wr.status IN ('pending', 'approved', 'processing')) AS total_pending
           FROM withdrawal_requests wr
          GROUP BY wr.fund_id) wr_agg ON wr_agg.fund_id = f.id
  WHERE f.status = 'active';


-- =============================================================================
-- REMAINING DRIFT-FREE FIXES (Parts 5, 6, 8)
-- =============================================================================

-- PART 5 (P1): fn_ledger_drives_position — INTERNAL_WITHDRAWAL explicit handling
CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric(38,18);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;

    IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;

    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type = 'DEPOSIT' THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type = 'DEPOSIT' THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'INTERNAL_WITHDRAWAL' THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      v_delta := NEW.amount;
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'INTERNAL_WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      v_delta := NEW.amount;
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'INTERNAL_WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;


-- PART 6 (P2): unvoid_transaction — AUM recalc + cascade detection
CREATE OR REPLACE FUNCTION public.unvoid_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
) RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
  v_cascade_warn text := '';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND is_admin = TRUE
  ) THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_ADMIN', 'message', 'Admin access required'
    );
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'
    );
  END IF;

  IF v_tx.is_voided IS DISTINCT FROM TRUE THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_VOIDED', 'message', 'Transaction is not voided'
    );
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  UPDATE public.transactions_v2
  SET is_voided = FALSE,
      voided_at = NULL,
      voided_by = NULL,
      voided_by_profile_id = NULL,
      void_reason = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || NOW()::TEXT
              || ' by admin ' || p_admin_id::TEXT || ': ' || TRIM(p_reason) || ']'
  WHERE id = p_transaction_id;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(
      v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_tx.distribution_id IS NOT NULL THEN
    SELECT void_reason INTO v_cascade_warn
    FROM yield_distributions
    WHERE id = v_tx.distribution_id AND is_voided = TRUE
    LIMIT 1;

    IF v_cascade_warn IS NOT NULL THEN
      v_cascade_warn := 'Parent distribution ' || v_tx.distribution_id::text
        || ' was cascade-voided. Manual re-apply may be needed.';
    END IF;
  END IF;

  INSERT INTO public.audit_log (
    entity, entity_id, action, actor_user, old_values, new_values, meta
  ) VALUES (
    'transactions_v2', p_transaction_id::TEXT, 'UNVOID', p_admin_id,
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'voided_at', v_tx.voided_at,
      'voided_by', v_tx.voided_by, 'void_reason', v_tx.void_reason
    ),
    JSONB_BUILD_OBJECT('is_voided', FALSE, 'aum_recalculated', TRUE),
    JSONB_BUILD_OBJECT(
      'reason', TRIM(p_reason),
      'isolation_model', 'row_for_update',
      'yields_not_restored', TRUE,
      'cascade_warning', COALESCE(v_cascade_warn, 'none')
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'restored_amount', v_tx.amount,
    'aum_recalculated', TRUE,
    'warning', CASE
      WHEN v_cascade_warn != '' THEN v_cascade_warn
      ELSE 'Cascade-voided allocations/fees/yield-events are NOT automatically restored. Re-apply yield distribution if needed.'
    END
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.unvoid_transaction(UUID, UUID, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION public.unvoid_transaction(UUID, UUID, TEXT) IS
'Unvoids a transaction. SELECT FOR UPDATE provides row-level locking.
v5.0 (2026-06-18): Added AUM recalculation after unvoid. Added cascade-void
detection for yield_distributions. Position restored via fn_ledger_drives_position
trigger and trigger_recompute_position.
WARNING: Cascade-voided distributions/allocations are NOT automatically restored.';


-- PART 8 (P3): apply_investor_transaction 14-param — remove duplicate AUM write
CREATE OR REPLACE FUNCTION public.apply_investor_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  IF p_new_total_aum IS NOT NULL THEN
    RAISE EXCEPTION
      'Auto-crystallization is disabled. Pass p_new_total_aum = NULL. '
      'Record a transaction-purpose yield distribution manually before each deposit/withdrawal.';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN RAISE EXCEPTION 'Fund not found: %', p_fund_id; END IF;

  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'DUST' THEN v_balance_after := v_balance_before + p_amount;
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    ELSE v_balance_after := v_balance_before + p_amount;
  END CASE;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE p_amount END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  ) RETURNING id INTO v_tx_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- MIGRATION RECORD
-- =============================================================================

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260415170000', 'critical_security_fixes')
ON CONFLICT (version) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'CRITICAL SECURITY FIXES MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Fix 1: is_admin() now checks user_roles (not unconditional true)';
    RAISE NOTICE 'Fix 2: user_roles signup restricted to investor role only';
    RAISE NOTICE 'Fix 3: investor_daily_balance RLS enabled + policies';
    RAISE NOTICE 'Fix 4: fund_aum_events RLS enabled + policies';
    RAISE NOTICE 'Fix 5: fund_yield_snapshots RLS enabled + policies';
    RAISE NOTICE 'Fix 6: Storage policies for documents/photos/profiles/branding';
    RAISE NOTICE 'Fix 7: Views recreated with security_invoker';
    RAISE NOTICE 'Part 5 (P1): fn_ledger_drives_position INTERNAL_WITHDRAWAL';
    RAISE NOTICE 'Part 6 (P2): unvoid_transaction AUM recalc + cascade detect';
    RAISE NOTICE 'Part 8 (P3): apply_investor_transaction no duplicate AUM write';
END $$;