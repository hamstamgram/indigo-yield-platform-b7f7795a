
-- Add audit triggers for fee schedule and role changes

-- 1. Audit trigger for investor_fee_schedule changes
CREATE OR REPLACE FUNCTION public.audit_fee_schedule_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'investor_fee_schedule',
      NEW.id::text,
      'FEE_SCHEDULE_CREATED',
      auth.uid(),
      NULL,
      jsonb_build_object(
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'fee_pct', NEW.fee_pct,
        'effective_date', NEW.effective_date,
        'end_date', NEW.end_date
      ),
      jsonb_build_object('trigger', 'audit_fee_schedule_changes')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'investor_fee_schedule',
      NEW.id::text,
      'FEE_SCHEDULE_UPDATED',
      auth.uid(),
      jsonb_build_object(
        'investor_id', OLD.investor_id,
        'fund_id', OLD.fund_id,
        'fee_pct', OLD.fee_pct,
        'effective_date', OLD.effective_date,
        'end_date', OLD.end_date
      ),
      jsonb_build_object(
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'fee_pct', NEW.fee_pct,
        'effective_date', NEW.effective_date,
        'end_date', NEW.end_date
      ),
      jsonb_build_object('trigger', 'audit_fee_schedule_changes')
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'investor_fee_schedule',
      OLD.id::text,
      'FEE_SCHEDULE_DELETED',
      auth.uid(),
      jsonb_build_object(
        'investor_id', OLD.investor_id,
        'fund_id', OLD.fund_id,
        'fee_pct', OLD.fee_pct,
        'effective_date', OLD.effective_date,
        'end_date', OLD.end_date
      ),
      NULL,
      jsonb_build_object('trigger', 'audit_fee_schedule_changes')
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for investor_fee_schedule
DROP TRIGGER IF EXISTS audit_investor_fee_schedule_trigger ON investor_fee_schedule;
CREATE TRIGGER audit_investor_fee_schedule_trigger
  AFTER INSERT OR UPDATE OR DELETE ON investor_fee_schedule
  FOR EACH ROW EXECUTE FUNCTION audit_fee_schedule_changes();

-- 2. Audit trigger for user_roles changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get user email for better audit context
  IF TG_OP = 'DELETE' THEN
    SELECT email INTO v_user_email FROM profiles WHERE id = OLD.user_id;
  ELSE
    SELECT email INTO v_user_email FROM profiles WHERE id = NEW.user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'user_roles',
      NEW.id::text,
      'ROLE_GRANTED',
      auth.uid(),
      NULL,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role::text
      ),
      jsonb_build_object('user_email', v_user_email, 'trigger', 'audit_user_role_changes')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'user_roles',
      NEW.id::text,
      'ROLE_CHANGED',
      auth.uid(),
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role::text
      ),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role::text
      ),
      jsonb_build_object('user_email', v_user_email, 'trigger', 'audit_user_role_changes')
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
    VALUES (
      'user_roles',
      OLD.id::text,
      'ROLE_REVOKED',
      auth.uid(),
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role::text
      ),
      NULL,
      jsonb_build_object('user_email', v_user_email, 'trigger', 'audit_user_role_changes')
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for user_roles
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_user_role_changes();
