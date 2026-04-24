-- Migration: add fee_pct and ib_percentage to protect_profile_sensitive_fields
-- Blocks investors from self-modifying fee percentages to bypass platform fees.

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Admins can update anything
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admins: block changes to sensitive fields
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin field';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify role field';
  END IF;
  IF NEW.account_type IS DISTINCT FROM OLD.account_type AND NOT is_admin() THEN
    RAISE EXCEPTION 'Cannot modify account_type field';
  END IF;
  IF NEW.is_system_account IS DISTINCT FROM OLD.is_system_account THEN
    RAISE EXCEPTION 'Cannot modify is_system_account field';
  END IF;
  IF NEW.include_in_reporting IS DISTINCT FROM OLD.include_in_reporting THEN
    RAISE EXCEPTION 'Cannot modify include_in_reporting field';
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Cannot modify kyc_status field';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email field';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify status field';
  END IF;
  IF NEW.ib_parent_id IS DISTINCT FROM OLD.ib_parent_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Cannot modify ib_parent_id field';
  END IF;
  IF NEW.ib_commission_source IS DISTINCT FROM OLD.ib_commission_source THEN
    RAISE EXCEPTION 'Cannot modify ib_commission_source field';
  END IF;
  IF NEW.onboarding_date IS DISTINCT FROM OLD.onboarding_date THEN
    RAISE EXCEPTION 'Cannot modify onboarding_date field';
  END IF;
  -- CRITICAL: prevent investors from bypassing platform fees
  IF NEW.fee_pct IS DISTINCT FROM OLD.fee_pct THEN
    RAISE EXCEPTION 'Cannot modify fee_pct field';
  END IF;
  IF NEW.ib_percentage IS DISTINCT FROM OLD.ib_percentage THEN
    RAISE EXCEPTION 'Cannot modify ib_percentage field';
  END IF;

  RETURN NEW;
END;
$$;
