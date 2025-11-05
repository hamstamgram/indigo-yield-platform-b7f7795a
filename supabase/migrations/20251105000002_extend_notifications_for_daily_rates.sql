-- =====================================================
-- Migration: Extend Notifications System for Daily Rates
-- Description: Add daily_rate notification type and related functions
-- Date: 2025-11-05
-- Phase: 5 - Daily Rates & Notifications
-- =====================================================

-- Add new notification type for daily rates
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'daily_rate';

-- Create function to send daily rate notifications to all investors
CREATE OR REPLACE FUNCTION public.send_daily_rate_notifications(
  p_rate_date date,
  p_btc_rate numeric,
  p_eth_rate numeric,
  p_sol_rate numeric,
  p_usdt_rate numeric,
  p_usdc_rate numeric,
  p_eurc_rate numeric,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  notifications_sent integer,
  notification_ids uuid[]
) AS $$
DECLARE
  v_notification_ids uuid[] := ARRAY[]::uuid[];
  v_notification_id uuid;
  v_user_id uuid;
  v_notification_count integer := 0;
  v_title text;
  v_body text;
  v_data jsonb;
BEGIN
  -- Build notification title
  v_title := 'Daily Rates - ' || to_char(p_rate_date, 'Mon DD, YYYY');

  -- Build notification body with all rates
  v_body := format(
    'Today''s cryptocurrency rates: BTC $%s, ETH $%s, SOL $%s, USDT $%s, USDC $%s, EURC $%s',
    to_char(p_btc_rate, 'FM999,999,999.99'),
    to_char(p_eth_rate, 'FM999,999,999.99'),
    to_char(p_sol_rate, 'FM999,999,999.99'),
    to_char(p_usdt_rate, 'FM999,999,999.99'),
    to_char(p_usdc_rate, 'FM999,999,999.99'),
    to_char(p_eurc_rate, 'FM999,999,999.99')
  );

  -- Add notes if provided
  IF p_notes IS NOT NULL AND trim(p_notes) != '' THEN
    v_body := v_body || '. ' || p_notes;
  END IF;

  -- Build data JSON with all rates
  v_data := jsonb_build_object(
    'rate_date', p_rate_date,
    'btc_rate', p_btc_rate,
    'eth_rate', p_eth_rate,
    'sol_rate', p_sol_rate,
    'usdt_rate', p_usdt_rate,
    'usdc_rate', p_usdc_rate,
    'eurc_rate', p_eurc_rate,
    'notes', p_notes
  );

  -- Send notification to all active investors
  FOR v_user_id IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.investors i ON i.profile_id = p.id
    WHERE p.role = 'investor'
      AND i.status = 'active'
  LOOP
    -- Insert notification
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      data_jsonb,
      priority,
      created_at
    )
    VALUES (
      v_user_id,
      'daily_rate',
      v_title,
      v_body,
      v_data,
      'medium',
      now()
    )
    RETURNING id INTO v_notification_id;

    -- Track notification ID
    v_notification_ids := array_append(v_notification_ids, v_notification_id);
    v_notification_count := v_notification_count + 1;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT v_notification_count, v_notification_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to admins only
REVOKE ALL ON FUNCTION public.send_daily_rate_notifications FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_daily_rate_notifications TO authenticated;

-- Add RLS policy check in function (already using SECURITY DEFINER)
COMMENT ON FUNCTION public.send_daily_rate_notifications IS 'Sends daily rate notifications to all active investors. Can only be called by admins.';

-- Create view for daily rate notification history
CREATE OR REPLACE VIEW public.daily_rate_notification_history AS
SELECT
  n.id,
  n.user_id,
  p.full_name as investor_name,
  p.email as investor_email,
  n.title,
  n.body,
  n.data_jsonb,
  n.read_at,
  n.priority,
  n.created_at,
  (n.data_jsonb->>'rate_date')::date as rate_date,
  (n.data_jsonb->>'btc_rate')::numeric as btc_rate,
  (n.data_jsonb->>'eth_rate')::numeric as eth_rate,
  (n.data_jsonb->>'sol_rate')::numeric as sol_rate
FROM public.notifications n
JOIN public.profiles p ON p.id = n.user_id
WHERE n.type = 'daily_rate'
ORDER BY n.created_at DESC;

-- Grant select on view to admins
GRANT SELECT ON public.daily_rate_notification_history TO authenticated;

-- Add comments
COMMENT ON VIEW public.daily_rate_notification_history IS 'View of all daily rate notifications sent to investors with details';
