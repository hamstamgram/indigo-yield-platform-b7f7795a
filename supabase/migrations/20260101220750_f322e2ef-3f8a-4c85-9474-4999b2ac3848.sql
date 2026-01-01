-- Drop the older 2-argument void_transaction function
-- This resolves the "Could not choose the best candidate function" error
-- The newer void_transaction(uuid, text, uuid DEFAULT NULL) with negative balance pre-check remains
DROP FUNCTION IF EXISTS public.void_transaction(uuid, text);