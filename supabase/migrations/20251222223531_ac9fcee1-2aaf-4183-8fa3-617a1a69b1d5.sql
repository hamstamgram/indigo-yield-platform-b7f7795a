
-- P0 Critical Fixes Migration
-- 1. Fix get_historical_nav function to use correct column name (current_value instead of balance)
-- 2. Fix ensure_admin to check both user_roles AND profiles.is_admin
-- 3. Sync admin roles: ensure all profiles.is_admin=true users have admin role in user_roles

-- ============================================================
-- P0.1: Fix get_historical_nav column name (balance -> current_value)
-- ============================================================
DROP FUNCTION IF EXISTS get_historical_nav(DATE);

CREATE OR REPLACE FUNCTION get_historical_nav(target_date DATE)
RETURNS TABLE (
    fund_id UUID,
    fund_name TEXT,
    asset_code TEXT,
    aum NUMERIC,
    daily_inflows NUMERIC,
    daily_outflows NUMERIC,
    net_flow_24h NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH transaction_flows AS (
        -- Calculate daily flows from transactions_v2
        SELECT
            t.fund_id as tf_fund_id,
            COALESCE(SUM(CASE 
                WHEN t.type = 'DEPOSIT' THEN t.amount 
                ELSE 0 
            END), 0) as tx_inflows,
            COALESCE(SUM(CASE 
                WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount)
                ELSE 0 
            END), 0) as tx_outflows
        FROM public.transactions_v2 t
        WHERE t.tx_date = target_date
          AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
          AND (t.is_voided IS NULL OR t.is_voided = false)
        GROUP BY t.fund_id
    ),
    position_aum AS (
        -- Calculate AUM from investor_positions as fallback
        -- FIXED: Using current_value instead of balance
        SELECT
            ip.fund_id as pos_fund_id,
            COALESCE(SUM(ip.current_value), 0) as total_balance
        FROM public.investor_positions ip
        GROUP BY ip.fund_id
    )
    SELECT 
        f.id as fund_id,
        f.name as fund_name,
        f.asset as asset_code,
        COALESCE(dn.aum, pa.total_balance, 0) as aum,
        COALESCE(dn.total_inflows, tf.tx_inflows, 0) as daily_inflows,
        COALESCE(dn.total_outflows, tf.tx_outflows, 0) as daily_outflows,
        (COALESCE(dn.total_inflows, tf.tx_inflows, 0) - COALESCE(dn.total_outflows, tf.tx_outflows, 0)) as net_flow_24h
    FROM 
        public.funds f
    LEFT JOIN 
        public.daily_nav dn ON f.id = dn.fund_id AND dn.nav_date = target_date
    LEFT JOIN 
        transaction_flows tf ON f.id = tf.tf_fund_id
    LEFT JOIN
        position_aum pa ON f.id = pa.pos_fund_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_historical_nav(DATE) TO authenticated;

-- ============================================================
-- P0.2: Fix ensure_admin to check BOTH user_roles AND profiles.is_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check user_roles table first
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  ) THEN
    RETURN; -- User has admin role
  END IF;
  
  -- Fallback: check profiles.is_admin (legacy compatibility)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RETURN; -- User is admin via profiles
  END IF;
  
  -- Neither check passed, raise exception
  RAISE EXCEPTION 'Admin only operation';
END;
$$;

-- ============================================================
-- P0.4: Sync admin roles - ensure all profiles.is_admin=true users have admin role
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.is_admin = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id 
    AND ur.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
ON CONFLICT (user_id, role) DO NOTHING;
