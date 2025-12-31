-- Fix remaining function missing search_path
CREATE OR REPLACE FUNCTION public.increment_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN 
    NEW.version := COALESCE(OLD.version, 0) + 1; 
    RETURN NEW; 
END;
$$;