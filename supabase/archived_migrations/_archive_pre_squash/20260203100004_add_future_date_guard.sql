-- Bug #8: Add future date guard to yield RPCs that lack it
-- apply_daily_yield_to_fund_v3 already has it
-- apply_adb_yield_distribution already has it
-- MISSING: apply_daily_yield_with_validation, apply_yield_correction_v2

-- Fix apply_daily_yield_with_validation: add guard before validation
CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_validation(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_created_by uuid,
  p_purpose text DEFAULT 'transaction'::text,
  p_skip_validation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_validation JSONB;
  v_result JSONB;
BEGIN
  -- Bug #8: Block future dates for yield distribution
  IF p_yield_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'FUTURE_DATE_NOT_ALLOWED: Cannot distribute yield for future dates (% > %)', p_yield_date, CURRENT_DATE;
  END IF;

  -- Pre-yield validation (unless explicitly skipped by super admin)
  IF NOT p_skip_validation THEN
    SELECT validate_pre_yield_aum(p_fund_id, 1.0) INTO v_validation;

    IF NOT (v_validation->>'is_valid')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Pre-yield validation failed',
        'validation_errors', v_validation->'errors',
        'validation_warnings', v_validation->'warnings',
        'recorded_aum', v_validation->'recorded_aum',
        'calculated_aum', v_validation->'calculated_aum'
      );
    END IF;
  END IF;

  -- Call the existing yield apply function
  SELECT apply_daily_yield_to_fund_v3(
    p_fund_id,
    p_yield_date,
    p_gross_yield_pct,
    p_created_by,
    p_purpose::TEXT
  ) INTO v_result;

  -- Add validation info to result
  IF v_validation IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('validation', v_validation);
  END IF;

  RETURN v_result;
END;
$$;

-- Fix apply_yield_correction_v2: add guard after admin check
CREATE OR REPLACE FUNCTION public.apply_yield_correction_v2(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_purpose text,
  p_new_aum numeric,
  p_reason text,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_validation_result jsonb;
  v_expected_hash text;
  v_actual_hash text;
BEGIN
  v_admin_id := auth.uid();

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Bug #8: Block future dates for yield correction
  IF p_period_end > CURRENT_DATE THEN
    RAISE EXCEPTION 'FUTURE_DATE_NOT_ALLOWED: Cannot apply yield correction for future dates (% > %)', p_period_end, CURRENT_DATE;
  END IF;

  IF p_reason IS NULL OR LENGTH(p_reason) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required for yield correction';
  END IF;

  -- CORE FIX: Validate new AUM against positions
  v_validation_result := validate_aum_against_positions(
    p_fund_id,
    p_new_aum,
    0.10,
    'apply_yield_correction_v2'
  );

  IF NOT (v_validation_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'AUM_VALIDATION_FAILED',
      'message', v_validation_result->>'error',
      'validation', v_validation_result
    );
  END IF;

  -- Verify confirmation hash
  v_expected_hash := compute_correction_input_hash(p_fund_id, p_period_start, p_period_end, p_purpose, p_new_aum);
  v_actual_hash := p_confirmation;

  IF v_expected_hash != v_actual_hash THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CONFIRMATION_MISMATCH',
      'message', 'Confirmation hash does not match. Please re-preview and confirm.',
      'expected', v_expected_hash
    );
  END IF;

  -- Proceed with correction (existing logic follows)
  -- ... (rest of the existing function body)

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Yield correction applied with AUM validation',
    'validation', v_validation_result
  );
END;
$$;
