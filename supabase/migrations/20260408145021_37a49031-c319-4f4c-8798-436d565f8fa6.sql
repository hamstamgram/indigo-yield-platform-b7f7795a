
-- PHASE 3: Convert all SECURITY DEFINER views to SECURITY INVOKER
-- Must handle dependency: v_ledger_position_mismatches depends on v_ledger_reconciliation

-- Drop dependent view first
DROP VIEW IF EXISTS public.v_ledger_position_mismatches;
DROP VIEW IF EXISTS public.v_ledger_reconciliation;

-- Drop all other views (no dependencies between them)
DROP VIEW IF EXISTS public.investor_position_ledger_mismatch;
DROP VIEW IF EXISTS public.investor_positions_with_funds;
DROP VIEW IF EXISTS public.investor_transactions_view;
DROP VIEW IF EXISTS public.monthly_statements_html;
DROP VIEW IF EXISTS public.monthly_statements_view;
DROP VIEW IF EXISTS public.position_transaction_reconciliation;
DROP VIEW IF EXISTS public.v_audit_summary;
DROP VIEW IF EXISTS public.v_concentration_risk;
DROP VIEW IF EXISTS public.v_cost_basis_mismatch;
DROP VIEW IF EXISTS public.v_crystallization_dashboard;
DROP VIEW IF EXISTS public.v_crystallization_gaps;
DROP VIEW IF EXISTS public.v_daily_platform_metrics_live;
DROP VIEW IF EXISTS public.v_fee_allocation_orphans;
DROP VIEW IF EXISTS public.v_fee_calculation_orphans;
DROP VIEW IF EXISTS public.v_ib_allocation_orphans;
DROP VIEW IF EXISTS public.v_liquidity_risk;
DROP VIEW IF EXISTS public.v_missing_withdrawal_transactions;
DROP VIEW IF EXISTS public.v_orphaned_positions;
DROP VIEW IF EXISTS public.v_orphaned_transactions;
DROP VIEW IF EXISTS public.v_position_transaction_variance;
DROP VIEW IF EXISTS public.v_potential_duplicate_profiles;
DROP VIEW IF EXISTS public.v_transaction_distribution_orphans;
DROP VIEW IF EXISTS public.v_transaction_sources;
DROP VIEW IF EXISTS public.v_yield_allocation_orphans;
DROP VIEW IF EXISTS public.v_yield_conservation_violations;
DROP VIEW IF EXISTS public.yield_distribution_conservation_check;

-- Recreate all views with SECURITY INVOKER

CREATE VIEW public.investor_position_ledger_mismatch
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    ip.fund_id,
    ip.current_value AS position_balance,
    COALESCE(ledger.ledger_sum, 0::numeric) AS ledger_balance,
    ip.current_value - COALESCE(ledger.ledger_sum, 0::numeric) AS discrepancy
   FROM investor_positions ip
     LEFT JOIN ( SELECT transactions_v2.investor_id,
            transactions_v2.fund_id,
            sum(transactions_v2.amount) AS ledger_sum
           FROM transactions_v2
          WHERE transactions_v2.is_voided = false
          GROUP BY transactions_v2.investor_id, transactions_v2.fund_id) ledger ON ledger.investor_id = ip.investor_id AND ledger.fund_id = ip.fund_id
  WHERE is_admin() AND ip.is_active = true AND abs(ip.current_value - COALESCE(ledger.ledger_sum, 0::numeric)) > 0.000001;

CREATE VIEW public.investor_positions_with_funds
WITH (security_invoker = true)
AS
SELECT concat(ip.investor_id, '-', ip.fund_id) AS id,
    ip.investor_id,
    ip.fund_id,
    f.code AS asset_code,
    f.name AS fund_name,
    f.asset,
    ip.current_value,
    ip.shares,
    ip.cost_basis,
    ip.is_active,
    ip.updated_at
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
  WHERE ip.is_active = true;

CREATE VIEW public.investor_transactions_view
WITH (security_invoker = true)
AS
SELECT t.id,
    t.investor_id,
    t.fund_id,
    f.code AS asset_code,
    f.name AS fund_name,
    f.asset,
    t.type AS transaction_type,
    t.amount,
    t.tx_date AS transaction_date,
    t.reference_id,
    t.purpose,
    t.created_at
   FROM transactions_v2 t
     JOIN funds f ON f.id = t.fund_id
  WHERE t.is_voided = false
  ORDER BY t.tx_date DESC;

CREATE VIEW public.monthly_statements_html
WITH (security_invoker = true)
AS
SELECT gs.id,
    gs.investor_id,
    COALESCE(sp.year, EXTRACT(year FROM gs.created_at)::integer) AS year,
    COALESCE(sp.month, EXTRACT(month FROM gs.created_at)::integer) AS month,
    COALESCE(gs.html_content, '<html><body>Statement not yet generated</body></html>'::text) AS html_content,
    gs.created_at
   FROM generated_statements gs
     LEFT JOIN statement_periods sp ON sp.id = gs.period_id;

CREATE VIEW public.monthly_statements_view
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    f.id AS fund_id,
    f.code AS asset_code,
    f.name AS fund_name,
    f.asset,
    EXTRACT(year FROM CURRENT_DATE)::integer AS year,
    EXTRACT(month FROM CURRENT_DATE)::integer AS month,
    EXTRACT(year FROM CURRENT_DATE)::integer AS period_year,
    EXTRACT(month FROM CURRENT_DATE)::integer AS period_month,
    COALESCE(( SELECT sum(transactions_v2.amount) FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = f.id AND transactions_v2.type = 'DEPOSIT'::tx_type AND transactions_v2.is_voided = false), 0::numeric)::text AS beginning_balance,
    COALESCE(( SELECT sum(transactions_v2.amount) FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = f.id AND transactions_v2.type = 'DEPOSIT'::tx_type AND transactions_v2.is_voided = false), 0::numeric)::text AS begin_balance,
    COALESCE(( SELECT sum(transactions_v2.amount) FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = f.id AND transactions_v2.type = 'DEPOSIT'::tx_type AND transactions_v2.is_voided = false), 0::numeric)::text AS additions,
    COALESCE(( SELECT sum(abs(transactions_v2.amount)) FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = f.id AND transactions_v2.type = 'WITHDRAWAL'::tx_type AND transactions_v2.is_voided = false), 0::numeric)::text AS redemptions,
    COALESCE(( SELECT sum(transactions_v2.amount) FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = f.id AND transactions_v2.type = 'YIELD'::tx_type AND transactions_v2.is_voided = false), 0::numeric)::text AS net_income,
    ip.current_value::text AS ending_balance,
    ip.current_value::text AS end_balance,
    '0'::text AS rate_of_return,
    '0'::text AS rate_of_return_mtd,
    now() AS created_at
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
  WHERE ip.is_active = true;

CREATE VIEW public.position_transaction_reconciliation
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    ip.fund_id,
    ip.current_value AS position_value,
    COALESCE(t.tx_sum, 0::numeric) AS transaction_sum,
    ip.current_value - COALESCE(t.tx_sum, 0::numeric) AS difference
   FROM investor_positions ip
     LEFT JOIN LATERAL ( SELECT sum(
                CASE
                    WHEN transactions_v2.type = ANY (ARRAY['DEPOSIT'::tx_type, 'YIELD'::tx_type, 'INTEREST'::tx_type, 'IB_CREDIT'::tx_type, 'INTERNAL_CREDIT'::tx_type, 'FEE_CREDIT'::tx_type, 'ADJUSTMENT'::tx_type]) THEN transactions_v2.amount
                    WHEN transactions_v2.type = ANY (ARRAY['WITHDRAWAL'::tx_type, 'FEE'::tx_type, 'INTERNAL_WITHDRAWAL'::tx_type]) THEN - abs(transactions_v2.amount)
                    ELSE 0::numeric
                END) AS tx_sum
           FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = ip.fund_id AND transactions_v2.is_voided = false) t ON true
  WHERE is_admin();

CREATE VIEW public.v_audit_summary
WITH (security_invoker = true)
AS
SELECT audit_leakage_report() ->> 'overall_status'::text AS status,
    ((audit_leakage_report() -> 'summary'::text) ->> 'total_issues'::text)::integer AS total_issues,
    ((audit_leakage_report() -> 'summary'::text) ->> 'asymmetric_void_count'::text)::integer AS asymmetric_void_count,
    ((audit_leakage_report() -> 'summary'::text) ->> 'negative_cost_basis_count'::text)::integer AS negative_cost_basis_count,
    ((audit_leakage_report() -> 'summary'::text) ->> 'fee_leakage_count'::text)::integer AS fee_leakage_count,
    ((audit_leakage_report() -> 'summary'::text) ->> 'ib_leakage_count'::text)::integer AS ib_leakage_count,
    (audit_leakage_report() ->> 'audit_timestamp'::text)::timestamp with time zone AS audit_timestamp;

CREATE VIEW public.v_concentration_risk
WITH (security_invoker = true)
AS
WITH fund_totals AS (
         SELECT investor_positions.fund_id,
            sum(investor_positions.current_value) AS total_aum
           FROM investor_positions
          WHERE investor_positions.is_active = true
          GROUP BY investor_positions.fund_id
        )
 SELECT f.id AS fund_id,
    f.code AS fund_code,
    p.id AS investor_id,
    TRIM(BOTH FROM (COALESCE(p.first_name, ''::text) || ' '::text) || COALESCE(p.last_name, ''::text)) AS investor_name,
    p.account_type::text AS account_type,
    ip.current_value AS position_value,
    ft.total_aum AS fund_aum,
        CASE
            WHEN ft.total_aum > 0::numeric THEN round(ip.current_value / ft.total_aum * 100::numeric, 2)
            ELSE 0::numeric
        END AS ownership_pct,
        CASE
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0::numeric)) >= 0.40 THEN 'CRITICAL'::text
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0::numeric)) >= 0.25 THEN 'HIGH'::text
            WHEN (ip.current_value / NULLIF(ft.total_aum, 0::numeric)) >= 0.15 THEN 'MEDIUM'::text
            ELSE 'LOW'::text
        END AS concentration_level
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
     JOIN profiles p ON p.id = ip.investor_id
     JOIN fund_totals ft ON ft.fund_id = f.id
  WHERE ip.is_active = true AND f.status = 'active'::fund_status AND p.account_type = 'investor'::account_type
  ORDER BY (
        CASE
            WHEN ft.total_aum > 0::numeric THEN round(ip.current_value / ft.total_aum * 100::numeric, 2)
            ELSE 0::numeric
        END) DESC;

CREATE VIEW public.v_cost_basis_mismatch
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    ip.fund_id,
    f.code AS fund_code,
    p.email AS investor_email,
    TRIM(BOTH FROM (COALESCE(p.first_name, ''::text) || ' '::text) || COALESCE(p.last_name, ''::text)) AS investor_name,
    ip.cost_basis AS position_cost_basis,
    computed.cost_basis AS computed_cost_basis,
    ip.current_value AS position_current_value,
    computed.current_value AS computed_current_value,
    ip.shares AS position_shares,
    computed.shares AS computed_shares,
    ip.cost_basis - computed.cost_basis AS cost_basis_variance,
    ip.current_value - computed.current_value AS current_value_variance,
        CASE
            WHEN computed.cost_basis > 0::numeric THEN round((ip.cost_basis - computed.cost_basis) / computed.cost_basis * 100::numeric, 2)
            ELSE 0::numeric
        END AS cost_basis_variance_pct
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
     JOIN profiles p ON p.id = ip.investor_id
     CROSS JOIN LATERAL ( SELECT GREATEST(COALESCE(sum(
                CASE
                    WHEN (t.type = ANY (ARRAY['DEPOSIT'::tx_type, 'INTERNAL_CREDIT'::tx_type])) AND NOT t.is_voided THEN t.amount
                    WHEN (t.type = ANY (ARRAY['WITHDRAWAL'::tx_type, 'INTERNAL_WITHDRAWAL'::tx_type])) AND NOT t.is_voided THEN - abs(t.amount)
                    ELSE 0::numeric
                END), 0::numeric), 0::numeric) AS cost_basis,
            COALESCE(sum(
                CASE
                    WHEN (t.type = ANY (ARRAY['DEPOSIT'::tx_type, 'YIELD'::tx_type, 'INTEREST'::tx_type, 'IB_CREDIT'::tx_type, 'FEE_CREDIT'::tx_type, 'INTERNAL_CREDIT'::tx_type, 'DUST_SWEEP'::tx_type])) AND NOT t.is_voided THEN t.amount
                    WHEN (t.type = ANY (ARRAY['WITHDRAWAL'::tx_type, 'FEE'::tx_type, 'IB_DEBIT'::tx_type, 'INTERNAL_WITHDRAWAL'::tx_type])) AND NOT t.is_voided THEN t.amount
                    ELSE 0::numeric
                END), 0::numeric) AS current_value,
            GREATEST(COALESCE(sum(
                CASE
                    WHEN (t.type = ANY (ARRAY['DEPOSIT'::tx_type, 'YIELD'::tx_type, 'INTEREST'::tx_type, 'IB_CREDIT'::tx_type, 'FEE_CREDIT'::tx_type, 'INTERNAL_CREDIT'::tx_type, 'DUST_SWEEP'::tx_type])) AND NOT t.is_voided THEN t.amount
                    WHEN (t.type = ANY (ARRAY['WITHDRAWAL'::tx_type, 'FEE'::tx_type, 'IB_DEBIT'::tx_type, 'INTERNAL_WITHDRAWAL'::tx_type])) AND NOT t.is_voided THEN t.amount
                    ELSE 0::numeric
                END), 0::numeric), 0::numeric) AS shares
           FROM transactions_v2 t
          WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id) computed
  WHERE abs(ip.cost_basis - computed.cost_basis) > 0.01 OR abs(ip.current_value - computed.current_value) > 0.01 OR abs(ip.shares - computed.shares) > 0.01;

CREATE VIEW public.v_crystallization_dashboard
WITH (security_invoker = true)
AS
SELECT f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    count(ip.investor_id) AS total_positions,
    count(ip.investor_id) FILTER (WHERE ip.last_yield_crystallization_date IS NULL) AS never_crystallized,
    count(ip.investor_id) FILTER (WHERE ip.last_yield_crystallization_date IS NOT NULL AND ip.last_yield_crystallization_date < (CURRENT_DATE - '7 days'::interval)) AS critical_stale,
    count(ip.investor_id) FILTER (WHERE ip.last_yield_crystallization_date IS NOT NULL AND ip.last_yield_crystallization_date >= (CURRENT_DATE - '7 days'::interval) AND ip.last_yield_crystallization_date < (CURRENT_DATE - '1 day'::interval)) AS warning_stale,
    count(ip.investor_id) FILTER (WHERE ip.last_yield_crystallization_date IS NOT NULL AND ip.last_yield_crystallization_date >= (CURRENT_DATE - '1 day'::interval)) AS up_to_date,
    min(ip.last_yield_crystallization_date) AS oldest_crystallization,
    max(ip.last_yield_crystallization_date) AS newest_crystallization
   FROM funds f
     LEFT JOIN investor_positions ip ON ip.fund_id = f.id
  GROUP BY f.id, f.code, f.name;

CREATE VIEW public.v_crystallization_gaps
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    ip.fund_id,
    f.code AS fund_code,
    p.email AS investor_email,
    ip.current_value,
    ip.last_yield_crystallization_date,
    ip.cumulative_yield_earned,
    tx.max_tx_date,
    tx.last_tx_type,
        CASE
            WHEN ip.last_yield_crystallization_date IS NULL THEN 'never_crystallized'::text
            WHEN ip.last_yield_crystallization_date < tx.max_tx_date THEN 'stale_crystallization'::text
            ELSE 'ok'::text
        END AS gap_type,
    COALESCE(tx.max_tx_date, CURRENT_DATE) - COALESCE(ip.last_yield_crystallization_date, '1900-01-01'::date) AS days_behind
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
     JOIN profiles p ON p.id = ip.investor_id
     LEFT JOIN LATERAL ( SELECT max(t.tx_date) AS max_tx_date,
            ( SELECT t2.type::text AS type
                   FROM transactions_v2 t2
                  WHERE t2.investor_id = ip.investor_id AND t2.fund_id = ip.fund_id AND (t2.is_voided IS NULL OR t2.is_voided = false)
                  ORDER BY t2.tx_date DESC, t2.created_at DESC
                 LIMIT 1) AS last_tx_type
           FROM transactions_v2 t
          WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND (t.is_voided IS NULL OR t.is_voided = false)) tx ON true
  WHERE ip.current_value > 0::numeric;

CREATE VIEW public.v_daily_platform_metrics_live
WITH (security_invoker = true)
AS
SELECT CURRENT_DATE AS metric_date,
    ( SELECT count(*) FROM profiles WHERE profiles.account_type = 'investor'::account_type AND profiles.status = 'active'::text) AS active_investors,
    ( SELECT count(*) FROM profiles WHERE profiles.account_type = 'ib'::account_type) AS total_ibs,
    ( SELECT count(*) FROM funds WHERE funds.status = 'active'::fund_status) AS active_funds,
    ( SELECT COALESCE(sum(ip.current_value), 0::numeric) FROM investor_positions ip JOIN profiles p ON p.id = ip.investor_id WHERE p.account_type = 'investor'::account_type AND ip.is_active = true) AS total_platform_aum,
    ( SELECT count(*) FROM withdrawal_requests WHERE withdrawal_requests.status = ANY (ARRAY['pending'::withdrawal_status, 'approved'::withdrawal_status])) AS pending_withdrawals,
    ( SELECT COALESCE(sum(withdrawal_requests.requested_amount), 0::numeric) FROM withdrawal_requests WHERE withdrawal_requests.status = ANY (ARRAY['pending'::withdrawal_status, 'approved'::withdrawal_status])) AS pending_withdrawal_amount,
    ( SELECT count(*) FROM yield_distributions WHERE yield_distributions.status = 'applied'::text AND yield_distributions.effective_date = CURRENT_DATE AND yield_distributions.is_voided = false) AS yields_today,
    now() AS refreshed_at;

CREATE VIEW public.v_fee_allocation_orphans
WITH (security_invoker = true)
AS
SELECT fa.id AS fee_allocation_id,
    fa.distribution_id,
    fa.investor_id,
    fa.fee_amount,
    fa.is_voided
   FROM fee_allocations fa
     LEFT JOIN yield_distributions yd ON yd.id = fa.distribution_id
  WHERE fa.is_voided = false AND (yd.id IS NULL OR yd.is_voided = true);

CREATE VIEW public.v_fee_calculation_orphans
WITH (security_invoker = true)
AS
SELECT fa.id,
    fa.distribution_id,
    fa.fund_id,
    fa.investor_id,
    fa.fees_account_id,
    fa.period_start,
    fa.period_end,
    fa.purpose,
    fa.base_net_income,
    fa.fee_percentage,
    fa.fee_amount,
    fa.credit_transaction_id,
    fa.debit_transaction_id,
    fa.created_at,
    fa.created_by,
    fa.is_voided,
    fa.voided_at,
    fa.voided_by
   FROM fee_allocations fa
     LEFT JOIN yield_distributions yd ON fa.distribution_id = yd.id
  WHERE fa.is_voided = false AND (yd.id IS NULL OR yd.status = 'voided'::text);

CREATE VIEW public.v_ib_allocation_orphans
WITH (security_invoker = true)
AS
SELECT ia.id AS ib_allocation_id,
    ia.distribution_id,
    ia.ib_investor_id,
    ia.source_investor_id,
    ia.ib_fee_amount,
    ia.is_voided
   FROM ib_allocations ia
     LEFT JOIN yield_distributions yd ON yd.id = ia.distribution_id
  WHERE ia.is_voided = false AND (yd.id IS NULL OR yd.is_voided = true);

CREATE VIEW public.v_liquidity_risk
WITH (security_invoker = true)
AS
SELECT f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    COALESCE(pos.total_aum, 0::numeric) AS total_aum,
    COALESCE(wr_agg.total_pending, 0::numeric) AS pending_withdrawals,
    COALESCE(pos.active_positions, 0) AS active_positions,
        CASE
            WHEN COALESCE(pos.total_aum, 0::numeric) > 0::numeric THEN round(COALESCE(wr_agg.total_pending, 0::numeric) / pos.total_aum * 100::numeric, 2)
            ELSE 0::numeric
        END AS withdrawal_ratio,
        CASE
            WHEN COALESCE(pos.total_aum, 0::numeric) = 0::numeric THEN 'NO_AUM'::text
            WHEN (COALESCE(wr_agg.total_pending, 0::numeric) / NULLIF(pos.total_aum, 0::numeric)) > 0.3 THEN 'HIGH'::text
            WHEN (COALESCE(wr_agg.total_pending, 0::numeric) / NULLIF(pos.total_aum, 0::numeric)) > 0.15 THEN 'MEDIUM'::text
            ELSE 'LOW'::text
        END AS risk_level
   FROM funds f
     LEFT JOIN ( SELECT ip.fund_id,
            sum(ip.current_value) AS total_aum,
            count(*)::integer AS active_positions
           FROM investor_positions ip
          WHERE ip.is_active = true
          GROUP BY ip.fund_id) pos ON pos.fund_id = f.id
     LEFT JOIN ( SELECT wr.fund_id,
            sum(wr.requested_amount) FILTER (WHERE wr.status = ANY (ARRAY['pending'::withdrawal_status, 'approved'::withdrawal_status, 'processing'::withdrawal_status])) AS total_pending
           FROM withdrawal_requests wr
          GROUP BY wr.fund_id) wr_agg ON wr_agg.fund_id = f.id
  WHERE f.status = 'active'::fund_status;

CREATE VIEW public.v_missing_withdrawal_transactions
WITH (security_invoker = true)
AS
SELECT wr.id AS withdrawal_request_id,
    wr.investor_id,
    wr.fund_id,
    wr.requested_amount,
    wr.processed_amount,
    wr.status,
    wr.processed_at
   FROM withdrawal_requests wr
     LEFT JOIN transactions_v2 t ON t.investor_id = wr.investor_id AND t.fund_id = wr.fund_id AND t.type = 'WITHDRAWAL'::tx_type AND t.is_voided = false AND (t.reference_id ~~ 'WDR-%'::text OR t.reference_id ~~ 'dust-sweep-%'::text OR t.reference_id ~~ 'DUST_SWEEP_OUT:%'::text) AND t.created_at >= wr.request_date
  WHERE wr.status = 'completed'::withdrawal_status AND t.id IS NULL;

CREATE VIEW public.v_orphaned_positions
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    ip.fund_id,
    ip.current_value,
    ip.shares,
    ip.last_transaction_date,
    ip.updated_at,
        CASE
            WHEN p.id IS NULL AND f.id IS NULL THEN 'BOTH_MISSING'::text
            WHEN p.id IS NULL THEN 'INVESTOR_MISSING'::text
            WHEN f.id IS NULL THEN 'FUND_MISSING'::text
            ELSE 'VALID'::text
        END AS orphan_type,
    p.id IS NULL AS investor_missing,
    f.id IS NULL AS fund_missing
   FROM investor_positions ip
     LEFT JOIN profiles p ON ip.investor_id = p.id
     LEFT JOIN funds f ON ip.fund_id = f.id
  WHERE p.id IS NULL OR f.id IS NULL;

CREATE VIEW public.v_orphaned_transactions
WITH (security_invoker = true)
AS
SELECT id,
    investor_id,
    fund_id,
    type,
    amount,
    tx_date,
    reference_id
   FROM transactions_v2 t
  WHERE NOT is_voided AND NOT (EXISTS ( SELECT 1
           FROM investor_positions ip
          WHERE ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id));

CREATE VIEW public.v_position_transaction_variance
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    ip.fund_id,
    f.code AS fund_code,
    p.email AS investor_email,
    ip.current_value AS position_value,
    ip.cost_basis,
    COALESCE(deposits.total, 0::numeric) AS total_deposits,
    COALESCE(withdrawals.total, 0::numeric) AS total_withdrawals,
    COALESCE(yields.total, 0::numeric) AS total_interest,
    COALESCE(fees.total, 0::numeric) AS total_fees,
    ip.current_value - (COALESCE(deposits.total, 0::numeric) - COALESCE(withdrawals.total, 0::numeric) + COALESCE(yields.total, 0::numeric) - COALESCE(fees.total, 0::numeric)) AS balance_variance
   FROM investor_positions ip
     JOIN funds f ON f.id = ip.fund_id
     JOIN profiles p ON p.id = ip.investor_id
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(transactions_v2.amount), 0::numeric) AS total
           FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = ip.fund_id AND transactions_v2.type = 'DEPOSIT'::tx_type AND transactions_v2.is_voided = false) deposits ON true
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(abs(transactions_v2.amount)), 0::numeric) AS total
           FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = ip.fund_id AND transactions_v2.type = 'WITHDRAWAL'::tx_type AND transactions_v2.is_voided = false) withdrawals ON true
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(transactions_v2.amount), 0::numeric) AS total
           FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = ip.fund_id AND (transactions_v2.type = ANY (ARRAY['INTEREST'::tx_type, 'YIELD'::tx_type, 'FEE_CREDIT'::tx_type, 'IB_CREDIT'::tx_type, 'DUST_SWEEP'::tx_type])) AND transactions_v2.is_voided = false) yields ON true
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(abs(transactions_v2.amount)), 0::numeric) AS total
           FROM transactions_v2
          WHERE transactions_v2.investor_id = ip.investor_id AND transactions_v2.fund_id = ip.fund_id AND transactions_v2.type = 'FEE'::tx_type AND transactions_v2.is_voided = false) fees ON true
  WHERE ip.is_active = true AND abs(ip.current_value - (COALESCE(deposits.total, 0::numeric) - COALESCE(withdrawals.total, 0::numeric) + COALESCE(yields.total, 0::numeric) - COALESCE(fees.total, 0::numeric))) > 0.01;

CREATE VIEW public.v_potential_duplicate_profiles
WITH (security_invoker = true)
AS
WITH email_groups AS (
         SELECT lower(TRIM(BOTH FROM profiles.email)) AS normalized_email,
            count(*) AS profile_count,
            array_agg(profiles.id ORDER BY profiles.created_at) AS profile_ids,
            array_agg(profiles.email ORDER BY profiles.created_at) AS emails,
            array_agg((profiles.first_name || ' '::text) || profiles.last_name ORDER BY profiles.created_at) AS names,
            min(profiles.created_at) AS first_created,
            max(profiles.created_at) AS last_created
           FROM profiles
          WHERE profiles.email IS NOT NULL
          GROUP BY (lower(TRIM(BOTH FROM profiles.email)))
         HAVING count(*) > 1
        ), name_groups AS (
         SELECT (lower(TRIM(BOTH FROM profiles.first_name)) || ' '::text) || lower(TRIM(BOTH FROM profiles.last_name)) AS normalized_name,
            count(*) AS profile_count,
            array_agg(profiles.id ORDER BY profiles.created_at) AS profile_ids,
            array_agg(profiles.email ORDER BY profiles.created_at) AS emails,
            min(profiles.created_at) AS first_created
           FROM profiles
          WHERE profiles.first_name IS NOT NULL AND profiles.last_name IS NOT NULL
          GROUP BY ((lower(TRIM(BOTH FROM profiles.first_name)) || ' '::text) || lower(TRIM(BOTH FROM profiles.last_name)))
         HAVING count(*) > 1
        )
 SELECT 'email_duplicate'::text AS duplicate_type,
    eg.normalized_email AS match_key,
    eg.profile_count,
    eg.profile_ids,
    eg.emails,
    eg.names,
    eg.first_created,
    eg.last_created,
    ( SELECT count(DISTINCT ip.fund_id) FROM investor_positions ip WHERE ip.investor_id = ANY (eg.profile_ids)) AS total_funds_affected,
    ( SELECT COALESCE(sum(ip.current_value), 0::numeric) FROM investor_positions ip WHERE ip.investor_id = ANY (eg.profile_ids)) AS total_value_affected
   FROM email_groups eg
UNION ALL
 SELECT 'name_duplicate'::text AS duplicate_type,
    ng.normalized_name AS match_key,
    ng.profile_count,
    ng.profile_ids,
    ng.emails,
    NULL::text[] AS names,
    ng.first_created,
    NULL::timestamp with time zone AS last_created,
    ( SELECT count(DISTINCT ip.fund_id) FROM investor_positions ip WHERE ip.investor_id = ANY (ng.profile_ids)) AS total_funds_affected,
    ( SELECT COALESCE(sum(ip.current_value), 0::numeric) FROM investor_positions ip WHERE ip.investor_id = ANY (ng.profile_ids)) AS total_value_affected
   FROM name_groups ng
  WHERE NOT (EXISTS ( SELECT 1 FROM email_groups eg WHERE ng.profile_ids && eg.profile_ids))
  ORDER BY 10 DESC;

CREATE VIEW public.v_transaction_distribution_orphans
WITH (security_invoker = true)
AS
SELECT t.id AS transaction_id,
    t.investor_id,
    t.fund_id,
    t.type AS transaction_type,
    t.amount,
    t.tx_date,
    t.distribution_id,
    t.purpose,
        CASE
            WHEN yd.id IS NULL THEN 'MISSING_DISTRIBUTION'::text
            WHEN yd.is_voided = true THEN 'VOIDED_DISTRIBUTION'::text
            ELSE 'OK'::text
        END AS issue_type
   FROM transactions_v2 t
     LEFT JOIN yield_distributions yd ON yd.id = t.distribution_id
  WHERE is_admin() AND t.distribution_id IS NOT NULL AND t.is_voided = false AND (yd.id IS NULL OR yd.is_voided = true);

CREATE VIEW public.v_transaction_sources
WITH (security_invoker = true)
AS
SELECT source,
    count(*) AS tx_count,
    count(*) FILTER (WHERE is_voided = false) AS active_count
   FROM transactions_v2
  WHERE source::text <> ALL (ARRAY['rpc_canonical'::text, 'crystallization'::text, 'manual_admin'::text, 'yield_distribution'::text, 'system'::text, 'migration'::text, 'fee_allocation'::text, 'ib_allocation'::text, 'internal_routing'::text, 'investor_wizard'::text, 'system_bootstrap'::text, 'withdrawal_completion'::text, 'yield_correction'::text, 'yield_aum_sync'::text])
  GROUP BY source
  ORDER BY (count(*)) DESC;

CREATE VIEW public.v_yield_allocation_orphans
WITH (security_invoker = true)
AS
SELECT ya.id AS allocation_id,
    ya.distribution_id,
    ya.investor_id,
    ya.fund_id,
    ya.gross_amount,
    ya.net_amount,
        CASE
            WHEN yd.id IS NULL THEN 'MISSING_DISTRIBUTION'::text
            WHEN yd.is_voided = true THEN 'VOIDED_DISTRIBUTION'::text
            ELSE 'OK'::text
        END AS issue_type
   FROM yield_allocations ya
     LEFT JOIN yield_distributions yd ON yd.id = ya.distribution_id
  WHERE is_admin() AND (ya.is_voided IS NULL OR ya.is_voided = false) AND (yd.id IS NULL OR yd.is_voided = true);

CREATE VIEW public.v_yield_conservation_violations
WITH (security_invoker = true)
AS
SELECT yd.id AS distribution_id,
    f.code AS fund_code,
    'gross_mismatch'::text AS violation_type,
    abs(COALESCE(yd.gross_yield_amount, yd.gross_yield, 0::numeric) - COALESCE(yd.total_net_amount, yd.net_yield, 0::numeric) - COALESCE(yd.total_fee_amount, yd.total_fees, 0::numeric) - COALESCE(yd.total_ib_amount, yd.total_ib, 0::numeric)) AS gross_diff,
    yd.fund_id,
    yd.effective_date,
    COALESCE(yd.gross_yield_amount, yd.gross_yield) AS header_gross,
    COALESCE(yd.total_net_amount, yd.net_yield) AS header_net,
    COALESCE(yd.total_fee_amount, yd.total_fees) AS header_fees,
    COALESCE(yd.total_ib_amount, yd.total_ib) AS header_ib,
    COALESCE(yd.dust_amount, 0::numeric) AS header_dust,
    abs(COALESCE(yd.gross_yield_amount, yd.gross_yield, 0::numeric) - COALESCE(yd.total_net_amount, yd.net_yield, 0::numeric) - COALESCE(yd.total_fee_amount, yd.total_fees, 0::numeric) - COALESCE(yd.total_ib_amount, yd.total_ib, 0::numeric)) AS variance
   FROM yield_distributions yd
     JOIN funds f ON f.id = yd.fund_id
  WHERE (yd.is_voided IS NULL OR yd.is_voided = false) AND yd.status = 'applied'::text AND yd.consolidated_into_id IS NULL AND abs(COALESCE(yd.gross_yield_amount, yd.gross_yield, 0::numeric) - COALESCE(yd.total_net_amount, yd.net_yield, 0::numeric) - COALESCE(yd.total_fee_amount, yd.total_fees, 0::numeric) - COALESCE(yd.total_ib_amount, yd.total_ib, 0::numeric)) >
        CASE f.asset
            WHEN 'BTC'::text THEN 0.00000001
            WHEN 'ETH'::text THEN 0.00000001
            WHEN 'USDT'::text THEN 0.0001
            WHEN 'USDC'::text THEN 0.0001
            WHEN 'EURC'::text THEN 0.0001
            WHEN 'SOL'::text THEN 0.00001
            WHEN 'XRP'::text THEN 0.00001
            WHEN 'ADA'::text THEN 0.00001
            WHEN 'xAUT'::text THEN 0.00000001
            ELSE 0.0001
        END;

CREATE VIEW public.yield_distribution_conservation_check
WITH (security_invoker = true)
AS
SELECT id AS distribution_id,
    fund_id,
    effective_date,
    COALESCE(gross_yield_amount, gross_yield) AS gross,
    COALESCE(total_net_amount, net_yield) AS net,
    COALESCE(total_fee_amount, total_fees) AS fees,
    COALESCE(total_ib_amount, total_ib) AS ib,
    COALESCE(dust_amount, 0::numeric) AS dust,
    abs(COALESCE(gross_yield_amount, gross_yield, 0::numeric) - COALESCE(total_net_amount, net_yield, 0::numeric) - COALESCE(total_fee_amount, total_fees, 0::numeric) - COALESCE(total_ib_amount, total_ib, 0::numeric) - COALESCE(dust_amount, 0::numeric)) AS residual
   FROM yield_distributions yd
  WHERE is_admin() AND (is_voided IS NULL OR is_voided = false) AND status = 'applied'::text AND gross_yield_amount IS NOT NULL AND consolidated_into_id IS NULL AND abs(COALESCE(gross_yield_amount, gross_yield, 0::numeric) - COALESCE(total_net_amount, net_yield, 0::numeric) - COALESCE(total_fee_amount, total_fees, 0::numeric) - COALESCE(total_ib_amount, total_ib, 0::numeric) - COALESCE(dust_amount, 0::numeric)) > 0.01;

-- Now recreate the dependency chain: v_ledger_reconciliation first, then v_ledger_position_mismatches

CREATE VIEW public.v_ledger_reconciliation
WITH (security_invoker = true)
AS
WITH position_totals AS (
         SELECT ip.investor_id,
            ip.fund_id,
            ip.current_value,
            f.name AS fund_name,
            f.asset
           FROM investor_positions ip
             JOIN funds f ON f.id = ip.fund_id
          WHERE ip.current_value <> 0::numeric AND ip.is_active = true
        ), ledger_totals AS (
         SELECT t.investor_id,
            t.fund_id,
            sum(t.amount) AS ledger_sum
           FROM transactions_v2 t
          WHERE t.is_voided = false
          GROUP BY t.investor_id, t.fund_id
        )
 SELECT pt.investor_id,
    pt.fund_id,
    pt.fund_name,
    pt.asset,
    pt.current_value AS position_balance,
    COALESCE(lt.ledger_sum, 0::numeric) AS ledger_balance,
    pt.current_value - COALESCE(lt.ledger_sum, 0::numeric) AS drift
   FROM position_totals pt
     LEFT JOIN ledger_totals lt ON lt.investor_id = pt.investor_id AND lt.fund_id = pt.fund_id
  WHERE is_admin() AND abs(pt.current_value - COALESCE(lt.ledger_sum, 0::numeric)) > 0.000001;

CREATE VIEW public.v_ledger_position_mismatches
WITH (security_invoker = true)
AS
SELECT f.code AS fund_code,
    rl.investor_id,
    rl.drift AS difference,
    rl.fund_id,
    rl.position_balance,
    rl.ledger_balance
   FROM v_ledger_reconciliation rl
     JOIN funds f ON f.id = rl.fund_id;
