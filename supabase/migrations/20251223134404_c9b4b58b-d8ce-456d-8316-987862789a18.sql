-- ============================================
-- Migration: Add void/edit functionality for yield records
-- ============================================

-- 1. Add voided columns to fund_daily_aum
ALTER TABLE fund_daily_aum
  ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- 2. Add voided columns to yield_distributions
ALTER TABLE yield_distributions 
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- 3. Add voided columns to fee_allocations
ALTER TABLE fee_allocations 
  ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- 4. Add voided columns to ib_allocations
ALTER TABLE ib_allocations 
  ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- 5. Create void_fund_daily_aum function
CREATE OR REPLACE FUNCTION void_fund_daily_aum(
  p_record_id UUID,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Validate admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can void yield records';
  END IF;

  -- Get record by id
  SELECT * INTO v_record
  FROM fund_daily_aum
  WHERE id = p_record_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found';
  END IF;

  -- Check if already voided
  IF v_record.is_voided THEN
    RAISE EXCEPTION 'Record is already voided';
  END IF;

  -- Check if reason is provided
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  -- Mark as voided
  UPDATE fund_daily_aum
  SET 
    is_voided = true,
    voided_at = NOW(),
    voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_record_id;

  -- Log to audit
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'void_fund_daily_aum',
    'fund_daily_aum',
    p_record_id::TEXT,
    p_admin_id,
    jsonb_build_object(
      'fund_id', v_record.fund_id,
      'aum_date', v_record.aum_date,
      'total_aum', v_record.total_aum,
      'purpose', v_record.purpose
    ),
    jsonb_build_object('is_voided', true, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', v_record.fund_id,
    'aum_date', v_record.aum_date,
    'purpose', v_record.purpose,
    'voided_at', NOW()
  );
END;
$$;

-- 6. Create update_fund_daily_aum function (edit with audit trail)
CREATE OR REPLACE FUNCTION update_fund_daily_aum(
  p_record_id UUID,
  p_new_total_aum NUMERIC,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_old_aum NUMERIC;
BEGIN
  -- Validate admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can edit yield records';
  END IF;

  -- Get record by id
  SELECT * INTO v_record
  FROM fund_daily_aum
  WHERE id = p_record_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found';
  END IF;

  -- Check if voided
  IF v_record.is_voided THEN
    RAISE EXCEPTION 'Cannot edit a voided record';
  END IF;

  -- Check if reason is provided
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  v_old_aum := v_record.total_aum;

  -- Update the record
  UPDATE fund_daily_aum
  SET 
    total_aum = p_new_total_aum,
    updated_at = NOW(),
    updated_by = p_admin_id
  WHERE id = p_record_id;

  -- Log to yield_edit_audit
  INSERT INTO yield_edit_audit (
    record_id,
    record_type,
    edited_by,
    previous_values,
    new_values,
    edit_reason
  ) VALUES (
    p_record_id,
    'fund_daily_aum',
    p_admin_id,
    jsonb_build_object('total_aum', v_old_aum),
    jsonb_build_object('total_aum', p_new_total_aum),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'record_id', p_record_id,
    'old_aum', v_old_aum,
    'new_aum', p_new_total_aum,
    'updated_at', NOW()
  );
END;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION void_fund_daily_aum TO authenticated;
GRANT EXECUTE ON FUNCTION update_fund_daily_aum TO authenticated;