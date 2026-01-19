-- ============================================================
-- Proactive Data Integrity Guardrails
-- Triggers and functions to prevent data integrity issues
-- ============================================================

-- 1. Trigger to ensure crystallization date is set on new positions
CREATE OR REPLACE FUNCTION ensure_crystallization_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_yield_crystallization_date IS NULL THEN
    NEW.last_yield_crystallization_date := COALESCE(NEW.created_at::date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_crystallization_date ON investor_positions;
CREATE TRIGGER trg_ensure_crystallization_date
  BEFORE INSERT ON investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_crystallization_date();

-- 2. Trigger to check for duplicate profiles
CREATE OR REPLACE FUNCTION check_duplicate_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_potential_duplicate uuid;
  v_duplicate_email text;
BEGIN
  -- Check for exact email match (case-insensitive) - excluding self on update
  SELECT id, email INTO v_potential_duplicate, v_duplicate_email
  FROM profiles
  WHERE LOWER(email) = LOWER(NEW.email)
    AND id != NEW.id
  LIMIT 1;
  
  IF v_potential_duplicate IS NOT NULL THEN
    RAISE EXCEPTION 'Profile with email % already exists (id: %)', 
      v_duplicate_email, v_potential_duplicate;
  END IF;
  
  -- Check for similar name (log warning but allow insert)
  SELECT id, email INTO v_potential_duplicate, v_duplicate_email
  FROM profiles
  WHERE LOWER(first_name) = LOWER(NEW.first_name)
    AND LOWER(last_name) = LOWER(NEW.last_name)
    AND first_name IS NOT NULL 
    AND first_name != ''
    AND last_name IS NOT NULL
    AND last_name != ''
    AND id != NEW.id
  LIMIT 1;
  
  IF v_potential_duplicate IS NOT NULL THEN
    -- Log warning to audit_log but allow insert
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'potential_duplicate_detected',
      'profile',
      NEW.id::text,
      jsonb_build_object(
        'new_email', NEW.email,
        'existing_id', v_potential_duplicate,
        'existing_email', v_duplicate_email,
        'match_type', 'name_match'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_duplicate_profile ON profiles;
CREATE TRIGGER trg_check_duplicate_profile
  BEFORE INSERT OR UPDATE OF email, first_name, last_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_profile();

-- 3. Trigger to block test account patterns in production
CREATE OR REPLACE FUNCTION block_test_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for test patterns in email
  IF NEW.email ~* '^(verify-inv-|test-investor-|test-user-|demo-user-)' THEN
    -- Check for override setting (for testing environments)
    IF current_setting('app.allow_test_profiles', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Test account patterns are blocked: %', NEW.email
        USING HINT = 'Set app.allow_test_profiles = true for testing';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_test_profiles ON profiles;
CREATE TRIGGER trg_block_test_profiles
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION block_test_profiles();

-- 4. Function for nightly AUM reconciliation (can be called by cron)
CREATE OR REPLACE FUNCTION nightly_aum_reconciliation()
RETURNS jsonb AS $$
DECLARE
  v_mismatches integer;
  v_result jsonb;
BEGIN
  -- Count current mismatches
  SELECT COUNT(*) INTO v_mismatches FROM fund_aum_mismatch;
  
  -- If mismatches exist, fix them
  IF v_mismatches > 0 THEN
    -- Call the reconciliation RPC
    SELECT reconcile_fund_aum_with_positions() INTO v_result;
  ELSE
    v_result := jsonb_build_object('reconciled_count', 0, 'message', 'No mismatches found');
  END IF;
  
  -- Log the reconciliation run
  INSERT INTO audit_log (action, entity, meta)
  VALUES (
    'nightly_aum_reconciliation',
    'fund_daily_aum',
    jsonb_build_object(
      'mismatches_found', v_mismatches,
      'result', v_result,
      'run_at', NOW()
    )
  );
  
  RETURN jsonb_build_object(
    'mismatches_found', v_mismatches,
    'result', v_result,
    'run_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to service role for edge function calls
GRANT EXECUTE ON FUNCTION nightly_aum_reconciliation() TO service_role;

-- 5. Add comment documentation
COMMENT ON FUNCTION ensure_crystallization_date() IS 'Ensures new investor positions have a crystallization date set';
COMMENT ON FUNCTION check_duplicate_profile() IS 'Blocks exact email duplicates and logs name-based potential duplicates';
COMMENT ON FUNCTION block_test_profiles() IS 'Blocks test account patterns in production (can be overridden with app.allow_test_profiles)';
COMMENT ON FUNCTION nightly_aum_reconciliation() IS 'Nightly job to reconcile fund AUM with position totals';