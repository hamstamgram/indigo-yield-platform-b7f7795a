-- Isolate repair/admin functions from production surface - PS-3
-- Goal: Add explicit ADMIN ONLY documentation to all Tier-2 repair functions
-- to prevent accidental production calls

-- 1. Add ADMIN ONLY comments to core repair functions

COMMENT ON FUNCTION public.recompute_investor_position(UUID, UUID) IS
  'ADMIN ONLY: Recompute single investor position from transaction ledger. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.recompute_investor_positions_for_investor(UUID) IS
  'ADMIN ONLY: Recompute all positions for an investor across all funds. Batch repair operation. Do not call from production code.';

COMMENT ON FUNCTION public.rebuild_position_from_ledger(UUID, UUID, UUID, TEXT, BOOLEAN) IS
  'ADMIN ONLY: Rebuild investor position from ledger with optional dry-run and full audit trail. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.adjust_investor_position(UUID, UUID, NUMERIC, TEXT, DATE, UUID) IS
  'ADMIN ONLY: Manual position adjustment for corrections. Creates ledger entry. For emergency repairs only. Do not call from production code. Use rebuild_position_from_ledger instead.';

COMMENT ON FUNCTION public.reconcile_investor_position_internal(UUID, UUID) IS
  'ADMIN ONLY: Reconcile single position mismatch without full rebuild. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.reconcile_all_positions(BOOLEAN) IS
  'ADMIN ONLY: Reconcile all positions with optional dry-run preview. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.acquire_position_lock(UUID, UUID) IS
  'ADMIN ONLY: Acquire lock for concurrent position updates during repairs. Prevents conflicts with production triggers. For emergency repairs only. Do not call from production code.';

-- 2. Additional repair function comments

COMMENT ON FUNCTION public.repair_all_positions() IS
  'ADMIN ONLY: Nuclear option - recompute all investor positions across entire database. For emergency/audit only. No dry-run available. Do not call from production code.';

COMMENT ON FUNCTION public.recompute_on_void() IS
  'ADMIN ONLY: Trigger function that recomputes position when transaction void status changes. Automatically fires on void/unvoid. For documentation only - do not call directly.';

-- 3. Document void/unvoid operations as admin-only

COMMENT ON FUNCTION public.void_transaction("p_transaction_id" UUID, "p_admin_id" UUID, "p_reason" TEXT) IS
  'ADMIN ONLY: Mark single transaction as voided. Cascades to related yields and positions. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.void_transactions_bulk("p_transaction_ids" UUID[], "p_admin_id" UUID, "p_reason" TEXT) IS
  'ADMIN ONLY: Mark multiple transactions as voided in batch. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.void_yield_distribution("p_distribution_id" UUID, "p_admin_id" UUID, "p_reason" TEXT, "p_void_crystals" BOOLEAN) IS
  'ADMIN ONLY: Void yield distribution. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.unvoid_transaction("p_transaction_id" UUID, "p_admin_id" UUID, "p_reason" TEXT) IS
  'ADMIN ONLY: Restore voided transaction. Reverses void cascade. For emergency repairs only. Do not call from production code.';

COMMENT ON FUNCTION public.unvoid_transactions_bulk("p_transaction_ids" UUID[], "p_admin_id" UUID, "p_reason" TEXT) IS
  'ADMIN ONLY: Restore multiple voided transactions in batch. For emergency repairs only. Do not call from production code.';
