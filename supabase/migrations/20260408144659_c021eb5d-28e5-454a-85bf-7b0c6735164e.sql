
-- PHASE 1: Eliminate redundant audit triggers
-- Drop the legacy audit trigger on transactions_v2 that duplicates delta_audit_transactions_v2
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions_v2;

-- Drop the legacy trigger function (only used by the dropped trigger)
DROP FUNCTION IF EXISTS public.audit_transaction_changes();

-- PHASE 4a: Drop disabled trigger and its function
DROP TRIGGER IF EXISTS trg_ib_commission_to_ledger ON public.ib_commission_ledger;
DROP FUNCTION IF EXISTS public.fn_sync_ib_commission_to_ledger();

-- PHASE 4b: Drop dev-only functions
DROP FUNCTION IF EXISTS public._fast_wipe();
DROP FUNCTION IF EXISTS public.reset_all_data_keep_profiles();

-- PHASE 4c: Drop orphaned sync function
DROP FUNCTION IF EXISTS public.sync_ib_account_type();

-- PHASE 4d: Drop legacy overloads (keep the richer signatures)
-- finalize_month_yield: keep the 4-param (year,month) version, drop the 3-param (date) version
DROP FUNCTION IF EXISTS public.finalize_month_yield(uuid, date, uuid);

-- check_historical_lock: keep the 4-param version, drop the 2-param version
DROP FUNCTION IF EXISTS public.check_historical_lock(uuid, date);

-- log_audit_event: keep the 6-param version, drop the 4-param version and 0-param trigger version
DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, text);
DROP FUNCTION IF EXISTS public.log_audit_event();
