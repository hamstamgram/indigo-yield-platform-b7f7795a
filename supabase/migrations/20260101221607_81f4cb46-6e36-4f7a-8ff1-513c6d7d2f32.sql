-- Drop the duplicate 2-parameter void_transaction function
-- This leaves only the 3-parameter version with DEFAULT NULL for p_actor_id
DROP FUNCTION IF EXISTS public.void_transaction(uuid, text);