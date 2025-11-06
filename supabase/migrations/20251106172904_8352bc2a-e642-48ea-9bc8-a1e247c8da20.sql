-- Fix security issue: Add search_path to update_updated_at_column function
-- This prevents potential security vulnerabilities from search_path manipulation

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;