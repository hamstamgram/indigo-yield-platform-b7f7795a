-- Migration: Remove KYC/Compliance/Airtable columns
-- Date: 2025-12-07
-- Purpose: Remove all KYC, AML, compliance, and Airtable integration columns
--          as these features are no longer part of the platform

BEGIN;

-- ============================================================================
-- 1. Drop the v_investor_kpis view that references kyc_status
-- ============================================================================
DROP VIEW IF EXISTS v_investor_kpis CASCADE;

-- ============================================================================
-- 2. Remove KYC/AML columns from investors table
-- ============================================================================
ALTER TABLE investors
  DROP COLUMN IF EXISTS kyc_status,
  DROP COLUMN IF EXISTS kyc_date,
  DROP COLUMN IF EXISTS aml_status;

-- ============================================================================
-- 3. Remove airtable_record_id from onboarding_submissions table
-- ============================================================================
ALTER TABLE onboarding_submissions
  DROP COLUMN IF EXISTS airtable_record_id;

-- ============================================================================
-- 4. Recreate v_investor_kpis view without kyc_status
-- ============================================================================
CREATE OR REPLACE VIEW v_investor_kpis AS
SELECT
  i.id AS investor_id,
  i.name,
  i.email,
  i.status,
  COUNT(DISTINCT ip.fund_id) AS funds_invested,
  SUM(ip.current_value) AS total_value,
  SUM(ip.cost_basis) AS total_invested,
  SUM(ip.unrealized_pnl) AS total_unrealized_pnl,
  SUM(ip.realized_pnl) AS total_realized_pnl,
  SUM(ip.mgmt_fees_paid) AS total_mgmt_fees,
  SUM(ip.perf_fees_paid) AS total_perf_fees,
  MIN(t.tx_date) AS first_investment_date,
  MAX(t.tx_date) AS last_activity_date
FROM public.investors i
LEFT JOIN public.investor_positions ip ON i.id = ip.investor_id
LEFT JOIN public.transactions_v2 t ON i.id = t.investor_id
GROUP BY i.id, i.name, i.email, i.status;

-- Grant permissions on the recreated view
GRANT SELECT ON v_investor_kpis TO authenticated;

-- ============================================================================
-- 5. Clean up any remaining compliance-related objects
-- ============================================================================

-- Drop any compliance-related functions if they exist
DROP FUNCTION IF EXISTS check_kyc_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_kyc_status(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS run_aml_check(uuid) CASCADE;

-- Drop any compliance-related triggers
DROP TRIGGER IF EXISTS tr_update_kyc_status ON investors;
DROP TRIGGER IF EXISTS tr_sync_airtable ON onboarding_submissions;

COMMIT;

-- Add comment to document the change
COMMENT ON TABLE investors IS 'Investor master table - KYC/AML columns removed 2025-12-07';
