-- P2-02: Yield Calculation Function Consolidation
-- Drops deprecated wrappers and unused functions, adds documentation to canonical RPCs

-- =============================================================================
-- PHASE 1: DROP DEPRECATED WRAPPER FUNCTIONS
-- These functions only forward calls to v3 with deprecation warnings
-- =============================================================================

-- Drop deprecated apply_daily_yield_to_fund (4-param wrapper)
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund(uuid, date, numeric, uuid);

-- Drop deprecated apply_daily_yield_to_fund_v2 (4-param wrapper)
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid);

-- Drop deprecated apply_adb_yield_distribution (4-param wrapper) - keep the 7-param active version
DROP FUNCTION IF EXISTS public.apply_adb_yield_distribution(uuid, date, numeric, uuid);

-- Drop deprecated apply_daily_yield_with_validation (4-param wrapper) - keep the 6-param active version
DROP FUNCTION IF EXISTS public.apply_daily_yield_with_validation(uuid, date, numeric, uuid);

-- =============================================================================
-- PHASE 2: DROP UNUSED FUNCTIONS
-- These functions are never called from frontend
-- =============================================================================

-- Drop preview_adb_yield - never called from frontend
DROP FUNCTION IF EXISTS public.preview_adb_yield(uuid, date, date, numeric, text);

-- Drop backfill_yield_summaries - never called from frontend
DROP FUNCTION IF EXISTS public.backfill_yield_summaries();

-- Drop crystallize_pending_movements - never called from frontend (superseded by crystallize_yield_before_flow)
DROP FUNCTION IF EXISTS public.crystallize_pending_movements(uuid, date);

-- =============================================================================
-- PHASE 3: DOCUMENT CANONICAL YIELD FUNCTIONS
-- Add COMMENT ON FUNCTION for all active yield RPCs with correct signatures
-- =============================================================================

-- Primary yield application RPC (correct signature: uuid, date, numeric, uuid, aum_purpose)
COMMENT ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) IS 
'CANONICAL: Primary yield application RPC. Calculates gross yield (newAUM - prevAUM), 
deducts platform/IB fees as percentages of gross, distributes net yield to investors.
Creates YIELD transactions, fee_allocations, ib_allocations, and updates positions.
Uses temporal locking to prevent intraday compounding. Handles dust via platform residual.
Called by: yieldApplyService.applyYieldDistribution';

-- Preview yield distribution (correct signature: uuid, date, numeric, text)
COMMENT ON FUNCTION public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text) IS
'CANONICAL: Preview yield distribution before applying. Returns per-investor breakdown
including gross yield, fees, IB commissions, and net amounts. No database writes.
Detects idempotency conflicts via reference_id checks.
Called by: yieldPreviewService.previewYieldDistribution';

-- Crystallize yield before deposit/withdrawal (correct signature: 7 params)
COMMENT ON FUNCTION public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) IS
'CANONICAL: Crystallizes any pending yield before processing a deposit or withdrawal.
Ensures accurate position calculation by applying accrued yield first. NO DEFAULT PURPOSE.
Reuses existing preflow AUM. Allows negative yield.
Called by: apply_deposit_with_crystallization, apply_withdrawal_with_crystallization';

-- Month-end crystallization (correct signature: uuid, date, numeric, uuid)
COMMENT ON FUNCTION public.crystallize_month_end(uuid, date, numeric, uuid) IS
'CANONICAL: Month-end yield crystallization for a fund. Locks the period and
finalizes all pending yield for the month. Required before statement generation.
Called by: yieldCrystallizationService.crystallizeMonthEnd';

-- Finalize month yield (correct signature: uuid, int, int, uuid)
COMMENT ON FUNCTION public.finalize_month_yield(uuid, integer, integer, uuid) IS
'CANONICAL: Finalizes yield for a month, making it visible to investors.
Updates yield_distributions status from pending to applied.
Called by: yieldCrystallizationService.finalizeMonthYield';

-- Void yield distribution (correct signature: uuid, uuid, text)
COMMENT ON FUNCTION public.void_yield_distribution(uuid, uuid, text) IS
'CANONICAL: Voids a yield distribution and all related records (transactions,
fee_allocations, ib_allocations). Reverses position changes. Requires reason.
Sets canonical_rpc flag to bypass mutation triggers.
Called by: yieldManagementService.voidYieldDistribution';

-- Void investor yield events for a distribution (correct signature: uuid, uuid, text)
COMMENT ON FUNCTION public.void_investor_yield_events_for_distribution(uuid, uuid, text) IS
'INTERNAL: Voids investor_yield_events linked to a specific distribution.
Called by: void_yield_distribution (cascade). Not for direct use.';

-- Apply yield correction (correct signature: 7 params including confirmation)
COMMENT ON FUNCTION public.apply_yield_correction_v2(uuid, date, date, text, numeric, text, text) IS
'CANONICAL: Applies a yield correction for a historical period. Creates correction_runs
record and adjusts investor positions and AUM to reflect corrected yield.
Requires confirmation parameter for safety.
Called by: yieldCorrectionService.applyYieldCorrection';

-- Preview yield correction (correct signature: uuid, date, date, text, numeric)
COMMENT ON FUNCTION public.preview_yield_correction_v2(uuid, date, date, text, numeric) IS
'CANONICAL: Previews impact of a yield correction before applying. Returns
per-investor impact and total adjustment. No database writes.
Called by: yieldCorrectionService.previewYieldCorrection';

-- Get yield corrections (correct signature: uuid, date, date)
COMMENT ON FUNCTION public.get_yield_corrections(uuid, date, date) IS
'CANONICAL: Retrieves historical yield corrections for a fund within a date range.
Returns correction_runs with parameters and results.
Called by: yieldCorrectionService.getYieldCorrections';

-- Rollback yield correction (correct signature: uuid, text)
COMMENT ON FUNCTION public.rollback_yield_correction(uuid, text) IS
'CANONICAL: Rolls back a previously applied yield correction. Reverses all
position and AUM adjustments made by the correction.
Called by: yieldCorrectionService.rollbackYieldCorrection';

-- Get void yield impact (correct signature: uuid)
COMMENT ON FUNCTION public.get_void_yield_impact(uuid) IS
'CANONICAL: Previews the impact of voiding a yield distribution. Returns
affected transactions, fee allocations, and position changes.
Called by: reconciliationService.getVoidYieldImpact';

-- Get investor yield events in range (correct signature: uuid, uuid, date, date)
COMMENT ON FUNCTION public.get_investor_yield_events_in_range(uuid, uuid, date, date) IS
'CANONICAL: Retrieves investor yield events within a date range. Used for
generating statements and performance reports.
Called by: Various reporting services';

-- Refresh yield materialized views (no params)
COMMENT ON FUNCTION public.refresh_yield_materialized_views() IS
'INTERNAL: Refreshes materialized views after yield operations. Should be
called after apply/void operations to update cached aggregates.
Called by: cacheInvalidation.refreshYieldMaterializedViews';

-- Active ADB function (7-param version - not deprecated)
COMMENT ON FUNCTION public.apply_adb_yield_distribution(uuid, date, date, numeric, uuid, text, numeric) IS
'CANONICAL: Apply yield using Average Daily Balance method for a period.
Alternative to daily yield for funds with less frequent distributions.
Requires period_start, period_end, and gross_yield_amount.
Called by: yieldApplyService (when ADB method selected)';

-- Active daily yield with validation (6-param version - not deprecated)
COMMENT ON FUNCTION public.apply_daily_yield_with_validation(uuid, date, numeric, uuid, text, boolean) IS
'CANONICAL: Apply daily yield with explicit validation control. Allows skipping
validation for batch operations or corrections where preconditions are pre-verified.
Called by: Internal yield correction flows';