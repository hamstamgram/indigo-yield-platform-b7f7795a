-- BUG-1: Fix notification delete RLS policy
-- Replace USING(false) with USING(user_id = auth.uid()) so users can delete their own notifications
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

CREATE POLICY "notifications_delete_own"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());
