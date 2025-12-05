-- Migration: Add Notification Settings and Price Alerts
-- Date: 2025-11-27

BEGIN;

-- 1. Notification Settings Table
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Channels
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    
    -- Categories
    transaction_notifications boolean DEFAULT true,
    alert_notifications boolean DEFAULT true,
    system_notifications boolean DEFAULT true,
    security_notifications boolean DEFAULT true,
    document_notifications boolean DEFAULT true,
    support_notifications boolean DEFAULT true,
    yield_notifications boolean DEFAULT true,
    portfolio_notifications boolean DEFAULT true,
    
    -- Configuration
    email_frequency text DEFAULT 'realtime' CHECK (email_frequency IN ('realtime', 'daily', 'weekly')),
    quiet_hours_start time,
    quiet_hours_end time,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id)
);

-- RLS for notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings" 
    ON public.notification_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" 
    ON public.notification_settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" 
    ON public.notification_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);


-- 2. Price Alerts Table
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    asset_symbol text NOT NULL,
    alert_type text NOT NULL CHECK (alert_type IN ('above', 'below', 'change_percent')),
    threshold_value numeric NOT NULL,
    is_active boolean DEFAULT true,
    triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- RLS for price_alerts
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own price alerts" 
    ON public.price_alerts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own price alerts" 
    ON public.price_alerts FOR ALL 
    USING (auth.uid() = user_id);

-- 3. Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at
    BEFORE UPDATE ON public.price_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
