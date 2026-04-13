-- Batch 1b: Archive backup tables
-- These tables are no longer referenced in application code and serve only as historical snapshots

DROP TABLE IF EXISTS public._fee_schedule_backup CASCADE;
DROP TABLE IF EXISTS public._fund_aum_backup CASCADE;
DROP TABLE IF EXISTS public._funds_backup CASCADE;
DROP TABLE IF EXISTS public._ib_schedule_backup CASCADE;
DROP TABLE IF EXISTS public._positions_backup CASCADE;
DROP TABLE IF EXISTS public._profiles_backup CASCADE;
DROP TABLE IF EXISTS public._transactions_backup CASCADE;
DROP TABLE IF EXISTS public._user_roles_backup CASCADE;
