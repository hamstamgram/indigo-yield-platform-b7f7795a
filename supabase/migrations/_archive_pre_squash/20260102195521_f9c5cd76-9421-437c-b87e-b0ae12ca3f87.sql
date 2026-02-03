-- Fix security warning: Set search_path on functions

ALTER FUNCTION public.adjust_investor_position(uuid,uuid,numeric,text,uuid,text,date,text) 
SET search_path = public;

ALTER FUNCTION public.get_position_reconciliation(date,uuid) 
SET search_path = public;