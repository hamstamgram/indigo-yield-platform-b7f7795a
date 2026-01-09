-- Fix the view to use SECURITY INVOKER instead of DEFINER
DROP VIEW IF EXISTS v_orphaned_user_roles;

CREATE VIEW v_orphaned_user_roles 
WITH (security_invoker = true) AS
SELECT ur.* FROM user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ur.user_id);