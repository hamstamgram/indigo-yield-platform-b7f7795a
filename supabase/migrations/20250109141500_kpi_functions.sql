-- KPI Functions for Admin Dashboard
-- These functions provide real-time KPI data for the admin dashboard

-- Function to calculate total AUM (Assets Under Management)
CREATE OR REPLACE FUNCTION get_total_aum()
RETURNS TABLE(total_aum NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(p.balance * 
    CASE 
      WHEN a.symbol = 'BTC' THEN 67500  -- Current BTC price
      WHEN a.symbol = 'ETH' THEN 3200   -- Current ETH price
      WHEN a.symbol = 'SOL' THEN 148    -- Current SOL price
      WHEN a.symbol = 'USDT' THEN 1     -- USDT is 1:1 with USD
      WHEN a.symbol = 'EUR' THEN 1.08   -- EUR to USD rate
      ELSE 1
    END
  ), 0) as total_aum
  FROM portfolios p
  JOIN assets a ON p.asset_id = a.id
  WHERE p.balance > 0;
END;
$$;

-- Function to get total investor count
CREATE OR REPLACE FUNCTION get_investor_count()
RETURNS TABLE(count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT p.id)::INTEGER as count
  FROM profiles p
  WHERE p.is_admin = false
  AND EXISTS (
    SELECT 1 FROM portfolios po 
    WHERE po.user_id = p.id 
    AND po.balance > 0
  );
END;
$$;

-- Function to calculate 24h interest (simplified - would need interest_transactions table for accuracy)
CREATE OR REPLACE FUNCTION get_24h_interest()
RETURNS TABLE(interest NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, calculate estimated daily interest based on average yield rate of 7.2% APY
  RETURN QUERY
  SELECT COALESCE(
    (SELECT SUM(p.balance * 
      CASE 
        WHEN a.symbol = 'BTC' THEN 67500
        WHEN a.symbol = 'ETH' THEN 3200
        WHEN a.symbol = 'SOL' THEN 148
        WHEN a.symbol = 'USDT' THEN 1
        WHEN a.symbol = 'EUR' THEN 1.08
        ELSE 1
      END * 0.072 / 365  -- 7.2% APY divided by 365 days
    )
    FROM portfolios p
    JOIN assets a ON p.asset_id = a.id
    WHERE p.balance > 0), 
    0
  ) as interest;
END;
$$;

-- Function to get pending withdrawals count
CREATE OR REPLACE FUNCTION get_pending_withdrawals()
RETURNS TABLE(count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::INTEGER as count
  FROM withdrawals w
  WHERE w.status = 'pending';
EXCEPTION
  WHEN undefined_table THEN
    -- If withdrawals table doesn't exist, return 0
    RETURN QUERY SELECT 0::INTEGER as count;
END;
$$;

-- Function to get all investors with portfolio summary
CREATE OR REPLACE FUNCTION get_all_investors_with_summary()
RETURNS TABLE(
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  total_aum NUMERIC,
  last_statement_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(
      (SELECT SUM(po.balance * 
        CASE 
          WHEN a.symbol = 'BTC' THEN 67500
          WHEN a.symbol = 'ETH' THEN 3200
          WHEN a.symbol = 'SOL' THEN 148
          WHEN a.symbol = 'USDT' THEN 1
          WHEN a.symbol = 'EUR' THEN 1.08
          ELSE 1
        END
      )
      FROM portfolios po
      JOIN assets a ON po.asset_id = a.id
      WHERE po.user_id = p.id
      AND po.balance > 0), 
      0
    ) as total_aum,
    NULL::DATE as last_statement_date  -- Would need statements table for this
  FROM profiles p
  WHERE p.is_admin = false
  ORDER BY total_aum DESC;
END;
$$;

-- Function to get investor portfolio summary
CREATE OR REPLACE FUNCTION get_investor_portfolio_summary(investor_id UUID)
RETURNS TABLE(
  total_aum NUMERIC,
  portfolio_count INTEGER,
  last_statement_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      (SELECT SUM(po.balance * 
        CASE 
          WHEN a.symbol = 'BTC' THEN 67500
          WHEN a.symbol = 'ETH' THEN 3200
          WHEN a.symbol = 'SOL' THEN 148
          WHEN a.symbol = 'USDT' THEN 1
          WHEN a.symbol = 'EUR' THEN 1.08
          ELSE 1
        END
      )
      FROM portfolios po
      JOIN assets a ON po.asset_id = a.id
      WHERE po.user_id = investor_id
      AND po.balance > 0), 
      0
    ) as total_aum,
    COALESCE(
      (SELECT COUNT(*)::INTEGER
      FROM portfolios po
      WHERE po.user_id = investor_id
      AND po.balance > 0),
      0
    ) as portfolio_count,
    NULL::DATE as last_statement_date;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_total_aum() TO authenticated;
GRANT EXECUTE ON FUNCTION get_investor_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_24h_interest() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_withdrawals() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_investors_with_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_investor_portfolio_summary(UUID) TO authenticated;
