-- Migration: Audit Events Consolidated View
-- Version: 007
-- Date: 2025-09-02
-- Description: Creates a consolidated view for all audit events from multiple sources

-- Create audit events view that consolidates all audit-related events
CREATE OR REPLACE VIEW audit_events_v AS
-- Access logs
SELECT 
    id::text as event_id,
    'access_logs' as source_table,
    user_id,
    event::text as operation,
    'auth' as entity,
    user_id::text as entity_id,
    NULL::jsonb as old_values,
    jsonb_build_object(
        'event', event::text,
        'success', success,
        'ip', ip::text,
        'user_agent', user_agent,
        'device_label', device_label
    ) as new_values,
    jsonb_build_object(
        'ip', ip::text,
        'user_agent', user_agent,
        'device_label', device_label,
        'success', success
    ) as meta,
    created_at,
    user_id as actor_user
FROM access_logs

UNION ALL

-- Balance adjustments
SELECT 
    id::text as event_id,
    'balance_adjustments' as source_table,
    user_id,
    'balance_adjustment' as operation,
    'balance' as entity,
    user_id::text as entity_id,
    NULL::jsonb as old_values,
    jsonb_build_object(
        'amount', amount,
        'currency', currency,
        'reason', reason,
        'audit_ref', audit_ref
    ) as new_values,
    jsonb_build_object(
        'fund_id', fund_id,
        'notes', notes,
        'audit_ref', audit_ref,
        'adjustment_type', CASE WHEN amount > 0 THEN 'credit' ELSE 'debit' END
    ) as meta,
    created_at,
    created_by as actor_user
FROM balance_adjustments

UNION ALL

-- Yield settings
SELECT 
    id::text as event_id,
    'yield_settings' as source_table,
    NULL::uuid as user_id, -- System-wide setting
    'yield_setting_create' as operation,
    'yield_settings' as entity,
    id::text as entity_id,
    NULL::jsonb as old_values,
    jsonb_build_object(
        'frequency', frequency,
        'rate_bps', rate_bps,
        'effective_from', effective_from
    ) as new_values,
    jsonb_build_object(
        'frequency', frequency,
        'rate_bps', rate_bps,
        'effective_from', effective_from,
        'rate_percentage', ROUND((rate_bps::numeric / 100), 3)
    ) as meta,
    created_at,
    created_by as actor_user
FROM yield_settings

UNION ALL

-- Fund fee history
SELECT 
    id::text as event_id,
    'fund_fee_history' as source_table,
    NULL::uuid as user_id, -- System-wide setting
    'fee_configuration_update' as operation,
    'fund_fees' as entity,
    fund_id::text as entity_id,
    NULL::jsonb as old_values,
    jsonb_build_object(
        'mgmt_fee_bps', mgmt_fee_bps,
        'perf_fee_bps', perf_fee_bps,
        'effective_from', effective_from
    ) as new_values,
    jsonb_build_object(
        'fund_id', fund_id,
        'mgmt_fee_bps', mgmt_fee_bps,
        'perf_fee_bps', perf_fee_bps,
        'effective_from', effective_from,
        'mgmt_fee_pct', ROUND((mgmt_fee_bps::numeric / 100), 2),
        'perf_fee_pct', ROUND((perf_fee_bps::numeric / 100), 2)
    ) as meta,
    created_at,
    created_by as actor_user
FROM fund_fee_history

UNION ALL

-- Direct audit log entries
SELECT 
    id::text as event_id,
    'audit_log' as source_table,
    NULL::uuid as user_id, -- Determined by context
    action as operation,
    entity,
    entity_id,
    old_values,
    new_values,
    meta,
    created_at,
    actor_user
FROM audit_log

ORDER BY created_at DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_events_v_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_v_actor_user ON audit_log(actor_user);
CREATE INDEX IF NOT EXISTS idx_audit_events_v_operation ON audit_log(action);

-- Grant access to the view
GRANT SELECT ON audit_events_v TO authenticated;

-- Create helper function to get admin name
CREATE OR REPLACE FUNCTION get_admin_name(admin_id UUID)
RETURNS TEXT AS $$
DECLARE
    admin_name TEXT;
BEGIN
    SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) 
    INTO admin_name
    FROM profiles 
    WHERE id = admin_id;
    
    RETURN TRIM(COALESCE(admin_name, 'Unknown'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_admin_name(UUID) TO authenticated;
