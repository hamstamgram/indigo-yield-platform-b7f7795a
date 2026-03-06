-- Phase 1A: Add super_admin to app_role enum
-- This must be in its own migration to be committed before use
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';