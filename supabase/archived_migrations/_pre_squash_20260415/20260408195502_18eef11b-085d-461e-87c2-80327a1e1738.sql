
-- Bulk REVOKE from anon
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- REVOKE from PUBLIC on critical mutation functions
REVOKE EXECUTE ON FUNCTION public.apply_backfill_yield(uuid, date, numeric, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.force_delete_investor(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_segmented_yield_distribution(uuid, date, numeric, uuid, aum_purpose, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose, numeric, uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_platform_data(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_daily_position_snapshot(date, uuid) FROM PUBLIC;

-- Selective GRANT-back for anon: signup triggers & RLS helpers
GRANT EXECUTE ON FUNCTION public.create_profile_on_signup() TO anon;
GRANT EXECUTE ON FUNCTION public.assign_default_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.can_insert_notification() TO anon;
GRANT EXECUTE ON FUNCTION public.compute_profile_role(uuid, account_type, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_uniqueness() TO anon;
GRANT EXECUTE ON FUNCTION public.check_duplicate_profile() TO anon;
GRANT EXECUTE ON FUNCTION public.get_system_mode() TO anon;
GRANT EXECUTE ON FUNCTION public.build_error_response(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.build_success_response(jsonb, text) TO anon;

-- Ensure authenticated and service_role retain full access
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
