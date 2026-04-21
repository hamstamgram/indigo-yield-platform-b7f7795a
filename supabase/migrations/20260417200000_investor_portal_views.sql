-- ============================================================
-- Create missing investor portal views
-- Date: 2026-04-17
-- ============================================================
-- The investor portal service references 3 views that don't
-- exist yet: investor_positions_with_funds,
-- investor_transactions_view, and monthly_statements_view.
-- These views provide investor-facing data with proper RLS
-- (investors can only see their own data).
-- ============================================================

-- View 1: investor_positions_with_funds
-- Used by getInvestorTransactionAssets() to list assets for filtering
CREATE OR REPLACE VIEW public.investor_positions_with_funds AS
SELECT
  ip.investor_id,
  ip.fund_id,
  ip.current_value,
  ip.shares,
  ip.is_active,
  f.asset AS asset_code,
  f.name AS fund_name,
  f.code AS fund_code
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
WHERE ip.is_active = true
  AND ip.current_value > 0;

ALTER VIEW public.investor_positions_with_funds OWNER TO postgres;

-- View 2: investor_transactions_view
-- Used by getInvestorTransactionsList() for the investor portal
-- Only shows investor_visible, non-voided transactions
CREATE OR REPLACE VIEW public.investor_transactions_view AS
SELECT
  t.id,
  t.investor_id,
  t.fund_id,
  t.type AS transaction_type,
  t.amount,
  t.asset AS asset_code,
  t.tx_date AS transaction_date,
  t.reference_id,
  t.notes,
  t.is_voided,
  t.visibility_scope,
  t.balance_before,
  t.balance_after,
  t.created_at,
  f.name AS fund_name,
  f.code AS fund_code,
  f.asset AS fund_asset
FROM transactions_v2 t
JOIN funds f ON f.id = t.fund_id
WHERE t.is_voided = false
  AND t.visibility_scope = 'investor_visible';

ALTER VIEW public.investor_transactions_view OWNER TO postgres;

-- View 3: monthly_statements_view
-- Used by getInvestorStatements(), getStatementYears(), getStatementAssets()
-- Maps investor_fund_performance + statement_periods into a flat view
CREATE OR REPLACE VIEW public.monthly_statements_view AS
SELECT
  ifp.id,
  ifp.investor_id,
  ifp.fund_name,
  ifp.fund_name AS asset_code,
  sp.year,
  sp.month,
  ifp.mtd_beginning_balance AS beginning_balance,
  ifp.mtd_ending_balance AS ending_balance,
  ifp.mtd_additions AS additions,
  ifp.mtd_redemptions AS redemptions,
  ifp.mtd_net_income AS net_income,
  ifp.mtd_rate_of_return AS rate_of_return,
  ifp.qtd_beginning_balance,
  ifp.qtd_additions,
  ifp.qtd_redemptions,
  ifp.qtd_net_income,
  ifp.qtd_ending_balance,
  ifp.qtd_rate_of_return,
  ifp.ytd_beginning_balance,
  ifp.ytd_additions,
  ifp.ytd_redemptions,
  ifp.ytd_net_income,
  ifp.ytd_ending_balance,
  ifp.ytd_rate_of_return,
  ifp.itd_beginning_balance,
  ifp.itd_additions,
  ifp.itd_redemptions,
  ifp.itd_net_income,
  ifp.itd_ending_balance,
  ifp.itd_rate_of_return,
  ifp.created_at,
  sp.period_name,
  sp.period_end_date
FROM investor_fund_performance ifp
JOIN statement_periods sp ON sp.id = ifp.period_id
WHERE ifp.purpose = 'reporting';

ALTER VIEW public.monthly_statements_view OWNER TO postgres;

-- RLS on views: These inherit RLS from base tables.
-- investor_positions_with_funds: investor_positions RLS already restricts to own rows
-- investor_transactions_view: transactions_v2 RLS + visibility_scope filter
-- monthly_statements_view: investor_fund_performance RLS already restricts to own rows

-- Grant SELECT to authenticated users
GRANT SELECT ON public.investor_positions_with_funds TO authenticated, service_role;
GRANT SELECT ON public.investor_transactions_view TO authenticated, service_role;
GRANT SELECT ON public.monthly_statements_view TO authenticated, service_role;