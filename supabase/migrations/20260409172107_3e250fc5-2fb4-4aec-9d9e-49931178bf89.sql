
-- Fix search_path linter warnings on functions modified in previous migration

ALTER FUNCTION public.validate_withdrawal_transition(text, text) SET search_path TO 'public';
ALTER FUNCTION public.guard_withdrawal_state_transitions() SET search_path TO 'public';
ALTER FUNCTION public.cascade_void_from_transaction() SET search_path TO 'public';
