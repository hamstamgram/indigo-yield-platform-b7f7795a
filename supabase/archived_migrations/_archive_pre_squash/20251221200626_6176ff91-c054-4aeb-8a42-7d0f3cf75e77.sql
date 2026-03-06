-- P0: Add SELECT policy for audit_log (admins only)
-- P1: Add intended_role column to admin_invites
-- Add performance indexes for audit_log filtering

-- 1. Add SELECT policy for audit_log table (CRITICAL FIX)
CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin_for_jwt());

-- 2. Add intended_role column to admin_invites for role persistence
ALTER TABLE public.admin_invites 
ADD COLUMN IF NOT EXISTS intended_role text DEFAULT 'admin' CHECK (intended_role IN ('admin', 'super_admin'));

-- 3. Add performance indexes for audit_log filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user ON public.audit_log(actor_user);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- 4. Add index for admin_invites email lookup
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON public.admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_admin_invites_code ON public.admin_invites(invite_code);