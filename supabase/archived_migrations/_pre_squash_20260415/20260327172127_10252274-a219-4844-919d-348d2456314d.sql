
-- Revoke anon EXECUTE from all admin-mutation RPCs using correct signatures
-- Each REVOKE is wrapped in a DO block to handle signature mismatches gracefully

DO $$ BEGIN REVOKE ALL ON FUNCTION public.set_canonical_rpc(boolean) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.void_transaction(uuid, uuid, text) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.approve_and_complete_withdrawal(uuid, numeric, text, text, boolean, integer) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, date, text, uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.force_delete_investor(uuid, uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.void_transactions_bulk(uuid[], uuid, text) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.unvoid_transaction(uuid, uuid, text) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.apply_investor_transaction(uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.apply_investor_transaction(uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose, uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.apply_transaction_with_crystallization(uuid, uuid, text, numeric, date, text, numeric, uuid, text, aum_purpose, uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.recompute_investor_position(uuid, uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.recalculate_fund_aum_for_date(uuid, date) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.add_fund_to_investor(uuid, text, numeric, numeric) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.acquire_position_lock(uuid, uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.acquire_withdrawal_lock(uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.acquire_yield_lock(uuid, date) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN REVOKE ALL ON FUNCTION public.check_is_admin(uuid) FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Ensure authenticated + service_role keep access
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, date, text, uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, date, text, uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.force_delete_investor(uuid, uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.force_delete_investor(uuid, uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_transactions_bulk(uuid[], uuid, text) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_transactions_bulk(uuid[], uuid, text) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.unvoid_transaction(uuid, uuid, text) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.unvoid_transaction(uuid, uuid, text) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_investor_transaction(uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_investor_transaction(uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_investor_transaction(uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose, uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_investor_transaction(uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose, uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_transaction_with_crystallization(uuid, uuid, text, numeric, date, text, numeric, uuid, text, aum_purpose, uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_transaction_with_crystallization(uuid, uuid, text, numeric, date, text, numeric, uuid, text, aum_purpose, uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.recompute_investor_position(uuid, uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.recompute_investor_position(uuid, uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.recalculate_fund_aum_for_date(uuid, date) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.recalculate_fund_aum_for_date(uuid, date) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.add_fund_to_investor(uuid, text, numeric, numeric) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.add_fund_to_investor(uuid, text, numeric, numeric) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.acquire_position_lock(uuid, uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.acquire_position_lock(uuid, uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.acquire_withdrawal_lock(uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.acquire_withdrawal_lock(uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.acquire_yield_lock(uuid, date) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.acquire_yield_lock(uuid, date) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.approve_and_complete_withdrawal(uuid, numeric, text, text, boolean, integer) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.approve_and_complete_withdrawal(uuid, numeric, text, text, boolean, integer) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.set_canonical_rpc(boolean) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;
