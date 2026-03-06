-- Phase 1: Stop Phantom AUM Generation
SELECT cron.unschedule('daily-aum-carryforward');
DROP TRIGGER IF EXISTS trg_sync_fund_aum_on_position_change ON investor_positions;
DROP FUNCTION IF EXISTS sync_fund_aum_on_position_change() CASCADE;

-- Phase 2: Create Global Fee Settings Table
CREATE TABLE IF NOT EXISTS global_fee_settings (
  setting_key TEXT PRIMARY KEY,
  value NUMERIC(10,6) NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO global_fee_settings (setting_key, value, description)
VALUES 
  ('platform_fee_pct', 0.20, 'Default platform fee percentage (20%)'),
  ('default_ib_pct', 0.02, 'Default IB commission percentage (2%)')
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE global_fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee settings" ON global_fee_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Phase 3: Create Yield Edit Audit Table
CREATE TABLE IF NOT EXISTS yield_edit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  edited_by UUID REFERENCES profiles(id),
  previous_values JSONB,
  new_values JSONB,
  edit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE yield_edit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage yield edit audit" ON yield_edit_audit
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Phase 4: Create update_fund_daily_aum_with_recalc Function
CREATE OR REPLACE FUNCTION update_fund_daily_aum_with_recalc(
  p_record_id UUID,
  p_new_total_aum NUMERIC,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_record RECORD;
  v_old_aum NUMERIC;
  v_void_result JSONB;
  v_apply_result JSONB;
BEGIN
  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Record not found'); END IF;
  IF v_record.is_voided THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot edit voided record'); END IF;
  
  v_old_aum := v_record.total_aum;
  
  INSERT INTO yield_edit_audit (record_id, record_type, edited_by, previous_values, new_values, edit_reason)
  VALUES (p_record_id, 'fund_daily_aum', p_admin_id, jsonb_build_object('total_aum', v_old_aum),
    jsonb_build_object('total_aum', p_new_total_aum, 'action', 'recalculate'), p_reason);
  
  SELECT void_fund_daily_aum(p_record_id, 'Edit recalculation: ' || p_reason, p_admin_id) INTO v_void_result;
  IF NOT (v_void_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to void: ' || (v_void_result->>'error'));
  END IF;
  
  SELECT apply_daily_yield_to_fund_v3(v_record.fund_id, v_record.aum_date, p_new_total_aum, p_admin_id, v_record.purpose::text) INTO v_apply_result;
  IF NOT (v_apply_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to apply: ' || (v_apply_result->>'error'));
  END IF;
  
  RETURN jsonb_build_object('success', true, 'record_id', p_record_id, 'old_aum', v_old_aum, 'new_aum', p_new_total_aum, 'updated_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;