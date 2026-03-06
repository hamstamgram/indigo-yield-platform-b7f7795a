-- Migration: Fix corrupted profiles.created_at and add immutability guard
--
-- Problem: 7 investor profiles had their created_at overwritten by past bulk UPDATE operations.
-- The auth.users.created_at is the source of truth for account creation time.
--
-- Fix 1: Sync profiles.created_at from auth.users.created_at where they diverge
-- Fix 2: Add trigger to make created_at immutable on UPDATE

-- ============================================================
-- Fix 1: Repair corrupted created_at values
-- ============================================================

UPDATE public.profiles p
SET created_at = au.created_at
FROM auth.users au
WHERE au.id = p.id
  AND p.created_at != au.created_at
  AND ABS(EXTRACT(EPOCH FROM (p.created_at - au.created_at))) > 60;
-- Only fix rows where the difference is more than 60 seconds
  -- (sub-second differences are normal due to trigger vs edge function timing)

-- ============================================================
-- Fix 2: Immutability trigger for created_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.preserve_created_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Always preserve the original created_at value on UPDATE
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$function$;
-- Fire BEFORE UPDATE, before other triggers
DROP TRIGGER IF EXISTS trg_preserve_created_at ON public.profiles;
CREATE TRIGGER trg_preserve_created_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION preserve_created_at();
