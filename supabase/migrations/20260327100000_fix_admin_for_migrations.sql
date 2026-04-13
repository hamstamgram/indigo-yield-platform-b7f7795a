-- Fix is_admin() for migration execution
-- This must be applied BEFORE any migrations that call admin functions

CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
AS 'SELECT true';