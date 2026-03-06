-- Drop duplicate apply_adb_yield_distribution_v4 overload that causes
-- "Could not choose the best candidate function" ambiguity error.
-- The newer overload with p_snapshot_time DEFAULT NULL handles both cases.

DROP FUNCTION IF EXISTS public.apply_adb_yield_distribution_v4(
  uuid, date, date, numeric, uuid, aum_purpose, date, numeric
);
