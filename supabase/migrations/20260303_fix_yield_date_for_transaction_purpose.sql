-- Migration: Fix transaction-purpose yield dates forced to month-end
-- Date: 2026-03-03
--
-- Problem: Both apply_segmented_yield_distribution_v5 and preview_segmented_yield_distribution_v5
-- unconditionally force p_period_end to month boundaries. This breaks intra-month
-- transaction-purpose yields (e.g., Dec 8 becomes Dec 31).
--
-- Fix: Add purpose-aware IF/ELSE around date computation.
-- - Reporting purpose: force month boundaries (existing behavior, correct)
-- - Transaction purpose: use exact input date
--
-- Approach: Surgical text replacement on live function bodies via dynamic SQL.
-- Only the date computation lines change; all other logic is untouched.

DO $migration$
DECLARE
  v_apply_src text;
  v_preview_src text;
  v_old_text text;
  v_new_text text;
  v_apply_check int;
  v_preview_check int;
BEGIN
  -- Pattern to find (exact text from the live functions)
  v_old_text := $pat$  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;$pat$;

  -- Replacement: purpose-aware date computation
  v_new_text := $pat$  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    -- Transaction purpose: respect exact date passed by caller
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;$pat$;

  -------------------------------------------------------------------
  -- 1. Patch apply_segmented_yield_distribution_v5
  -------------------------------------------------------------------
  SELECT prosrc INTO v_apply_src
  FROM pg_proc
  WHERE proname = 'apply_segmented_yield_distribution_v5'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_apply_src IS NULL THEN
    RAISE EXCEPTION 'apply_segmented_yield_distribution_v5 not found';
  END IF;

  v_apply_check := position(v_old_text IN v_apply_src);
  IF v_apply_check = 0 THEN
    RAISE EXCEPTION 'Date computation pattern not found in apply function (already patched?)';
  END IF;

  v_apply_src := replace(v_apply_src, v_old_text, v_new_text);

  EXECUTE
    'CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5('
    || 'p_fund_id uuid, p_period_end date, p_recorded_aum numeric, '
    || 'p_admin_id uuid DEFAULT NULL::uuid, '
    || 'p_purpose aum_purpose DEFAULT ''reporting''::aum_purpose, '
    || 'p_distribution_date date DEFAULT NULL::date'
    || ') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER '
    || 'SET search_path TO ''public'' '
    || 'AS $__yv5_apply__$' || v_apply_src || '$__yv5_apply__$';

  RAISE NOTICE 'Patched apply_segmented_yield_distribution_v5';

  -------------------------------------------------------------------
  -- 2. Patch preview_segmented_yield_distribution_v5
  -------------------------------------------------------------------
  SELECT prosrc INTO v_preview_src
  FROM pg_proc
  WHERE proname = 'preview_segmented_yield_distribution_v5'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF v_preview_src IS NULL THEN
    RAISE EXCEPTION 'preview_segmented_yield_distribution_v5 not found';
  END IF;

  v_preview_check := position(v_old_text IN v_preview_src);
  IF v_preview_check = 0 THEN
    RAISE EXCEPTION 'Date computation pattern not found in preview function (already patched?)';
  END IF;

  v_preview_src := replace(v_preview_src, v_old_text, v_new_text);

  EXECUTE
    'CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5('
    || 'p_fund_id uuid, p_period_end date, p_recorded_aum numeric, '
    || 'p_purpose aum_purpose DEFAULT ''reporting''::aum_purpose'
    || ') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER '
    || 'SET search_path TO ''public'' '
    || 'AS $__yv5_preview__$' || v_preview_src || '$__yv5_preview__$';

  RAISE NOTICE 'Patched preview_segmented_yield_distribution_v5';
  RAISE NOTICE 'Both functions now use purpose-aware date computation';
END;
$migration$;
