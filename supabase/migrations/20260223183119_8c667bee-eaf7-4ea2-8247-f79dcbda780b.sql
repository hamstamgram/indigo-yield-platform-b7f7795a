-- Drop redundant SELECT policies on notifications
-- Keeping: notifications_select (user_id = auth.uid() OR is_admin())
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Notifications own access" ON notifications;

-- Drop redundant SELECT policies on investor_emails
-- Keeping: investor_emails_select_own_or_admin (investor_id = auth.uid() OR is_admin_safe())
DROP POLICY IF EXISTS "Admins can view investor emails" ON investor_emails;
DROP POLICY IF EXISTS "investor_emails_select_own" ON investor_emails;