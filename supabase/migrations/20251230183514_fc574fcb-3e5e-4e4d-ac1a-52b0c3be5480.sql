-- =====================================================
-- DATABASE CLEANUP AND HARDENING MIGRATION (REVISED)
-- =====================================================

-- =====================================================
-- PHASE 1: Fix Profiles Missing User Roles
-- =====================================================
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'investor'::app_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- PHASE 2: Consolidate Function Overloads
-- =====================================================

-- 2A: Drop the INCONSISTENT complete_withdrawal overload (uses p_tx_hash)
-- Keep the one with p_transaction_hash and p_admin_notes
DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, text);

-- 2B: Drop older admin_create_transaction overload (uses p_transaction_type instead of p_type)
DROP FUNCTION IF EXISTS public.admin_create_transaction(uuid, uuid, text, numeric, date, text);

-- 2C: Drop the simpler get_position_reconciliation overloads
DROP FUNCTION IF EXISTS public.get_position_reconciliation(date);
DROP FUNCTION IF EXISTS public.get_position_reconciliation(uuid);

-- 2D: Drop the simpler get_reporting_eligible_investors overload  
DROP FUNCTION IF EXISTS public.get_reporting_eligible_investors(uuid, date);

-- =====================================================
-- PHASE 3: Sync Fund Configurations
-- =====================================================

-- Delete the duplicate BTC_YIELD since IND-BTC already exists
DELETE FROM fund_configurations WHERE code = 'BTC_YIELD';

-- Add missing fund configuration for IND-ADA
INSERT INTO fund_configurations (
  code, name, currency, status, inception_date, mgmt_fee_bps, perf_fee_bps, effective_from
)
SELECT 
  f.code, f.name, f.asset, COALESCE(f.status, 'active'), 
  COALESCE(f.inception_date, CURRENT_DATE), COALESCE(f.mgmt_fee_bps, 0), 
  COALESCE(f.perf_fee_bps, 2000), CURRENT_DATE
FROM funds f
WHERE f.code = 'IND-ADA'
  AND NOT EXISTS (SELECT 1 FROM fund_configurations fc WHERE fc.code = f.code)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- Audit Log
-- =====================================================
INSERT INTO audit_log (action, entity, actor_user, meta)
VALUES (
  'DATABASE_CLEANUP_HARDENING',
  'system',
  NULL,
  jsonb_build_object(
    'phases', ARRAY['fix_missing_user_roles', 'consolidate_function_overloads', 'sync_fund_configurations'],
    'executed_at', NOW(),
    'dropped_functions', ARRAY[
      'complete_withdrawal(uuid, text)',
      'admin_create_transaction(uuid, uuid, text, numeric, date, text)',
      'get_position_reconciliation(date)',
      'get_position_reconciliation(uuid)',
      'get_reporting_eligible_investors(uuid, date)'
    ],
    'deleted_configs', ARRAY['BTC_YIELD'],
    'added_configs', ARRAY['IND-ADA']
  )
);