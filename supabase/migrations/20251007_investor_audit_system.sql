-- ============================================================================
-- INVESTOR AUDIT SYSTEM
-- ============================================================================
-- Purpose: Comprehensive audit and data validation for all investors
-- Date: 2025-10-07
--
-- Features:
-- 1. Data integrity checks
-- 2. Financial reconciliation
-- 3. Audit reports and dashboards
-- 4. Data validation rules
-- 5. Compliance checks
-- ============================================================================

-- ============================================================================
-- 1. AUDIT VIEWS - Real-time Dashboard Data
-- ============================================================================

-- Comprehensive Investor Overview
CREATE OR REPLACE VIEW investor_audit_overview AS
SELECT
    i.id as investor_id,
    i.email,
    i.full_name,
    i.investor_status,
    i.kyc_status,
    i.investor_type,
    i.created_at as onboarded_at,

    -- Portfolio Summary
    p.total_invested,
    p.current_value,
    p.total_return,
    p.total_return_percentage,
    p.realized_gains,
    p.unrealized_gains,
    p.last_updated as portfolio_last_updated,

    -- Transaction Summary
    (SELECT COUNT(*) FROM transactions WHERE investor_id = i.id) as total_transactions,
    (SELECT COUNT(*) FROM transactions WHERE investor_id = i.id AND status = 'completed') as completed_transactions,
    (SELECT COUNT(*) FROM transactions WHERE investor_id = i.id AND status = 'pending') as pending_transactions,
    (SELECT COUNT(*) FROM transactions WHERE investor_id = i.id AND status = 'failed') as failed_transactions,

    -- Financial Totals
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'deposit' AND status = 'completed') as total_deposits,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'withdrawal' AND status = 'completed') as total_withdrawals,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'dividend' AND status = 'completed') as total_dividends,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'fee' AND status = 'completed') as total_fees,

    -- Position Count
    (SELECT COUNT(*) FROM positions WHERE investor_id = i.id) as total_positions,

    -- Document Status
    (SELECT COUNT(*) FROM documents WHERE investor_id = i.id) as total_documents,
    (SELECT COUNT(*) FROM documents WHERE investor_id = i.id AND is_verified = true) as verified_documents,

    -- Withdrawal Requests
    (SELECT COUNT(*) FROM withdrawal_requests WHERE investor_id = i.id) as total_withdrawal_requests,
    (SELECT COUNT(*) FROM withdrawal_requests WHERE investor_id = i.id AND status = 'pending') as pending_withdrawal_requests,

    -- Last Activity
    (SELECT MAX(created_at) FROM transactions WHERE investor_id = i.id) as last_transaction_date,
    (SELECT MAX(updated_at) FROM positions WHERE investor_id = i.id) as last_position_update,

    -- Data Quality Flags
    CASE
        WHEN p.total_invested IS NULL THEN true
        WHEN p.total_invested < 0 THEN true
        ELSE false
    END as has_portfolio_issue,

    CASE
        WHEN i.kyc_status = 'not_started' AND i.created_at < NOW() - INTERVAL '30 days' THEN true
        WHEN i.kyc_status = 'expired' THEN true
        ELSE false
    END as has_kyc_issue,

    CASE
        WHEN i.email IS NULL OR i.full_name IS NULL THEN true
        ELSE false
    END as has_profile_issue,

    -- Reconciliation Check
    CASE
        WHEN p.total_invested != (
            SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
            FROM transactions
            WHERE investor_id = i.id
              AND type IN ('deposit', 'withdrawal')
              AND status = 'completed'
        ) THEN true
        ELSE false
    END as has_reconciliation_issue

FROM investors i
LEFT JOIN portfolios p ON p.investor_id = i.id
ORDER BY i.created_at DESC;

COMMENT ON VIEW investor_audit_overview IS
'Comprehensive investor overview with all key metrics, transaction summaries, and data quality flags';

-- ============================================================================
-- 2. DATA INTEGRITY CHECKS
-- ============================================================================

-- Check for orphaned records
CREATE OR REPLACE VIEW data_integrity_orphans AS
SELECT
    'portfolios' as table_name,
    COUNT(*) as orphan_count,
    'Portfolios without investor' as issue
FROM portfolios p
WHERE NOT EXISTS (SELECT 1 FROM investors WHERE id = p.investor_id)

UNION ALL

SELECT
    'positions' as table_name,
    COUNT(*) as orphan_count,
    'Positions without investor' as issue
FROM positions pos
WHERE NOT EXISTS (SELECT 1 FROM investors WHERE id = pos.investor_id)

UNION ALL

SELECT
    'transactions' as table_name,
    COUNT(*) as orphan_count,
    'Transactions without investor' as issue
FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM investors WHERE id = t.investor_id)

UNION ALL

SELECT
    'portfolios' as table_name,
    COUNT(*) as orphan_count,
    'Investors without portfolio' as issue
FROM investors i
WHERE NOT EXISTS (SELECT 1 FROM portfolios WHERE investor_id = i.id);

-- Check for data anomalies
CREATE OR REPLACE VIEW data_integrity_anomalies AS
-- Negative balances
SELECT
    'Negative Portfolio Value' as anomaly_type,
    i.id as investor_id,
    i.email,
    i.full_name,
    p.current_value as anomalous_value,
    'Portfolio current_value is negative' as description
FROM investors i
JOIN portfolios p ON p.investor_id = i.id
WHERE p.current_value < 0

UNION ALL

-- Negative invested amount
SELECT
    'Negative Investment' as anomaly_type,
    i.id as investor_id,
    i.email,
    i.full_name,
    p.total_invested as anomalous_value,
    'Portfolio total_invested is negative' as description
FROM investors i
JOIN portfolios p ON p.investor_id = i.id
WHERE p.total_invested < 0

UNION ALL

-- Current value exceeds invested by more than 1000%
SELECT
    'Unrealistic Returns' as anomaly_type,
    i.id as investor_id,
    i.email,
    i.full_name,
    p.total_return_percentage as anomalous_value,
    'Return percentage exceeds 1000%' as description
FROM investors i
JOIN portfolios p ON p.investor_id = i.id
WHERE p.total_return_percentage > 1000

UNION ALL

-- Negative return percentage less than -100%
SELECT
    'Unrealistic Losses' as anomaly_type,
    i.id as investor_id,
    i.email,
    i.full_name,
    p.total_return_percentage as anomalous_value,
    'Loss percentage exceeds -100%' as description
FROM investors i
JOIN portfolios p ON p.investor_id = i.id
WHERE p.total_return_percentage < -100

UNION ALL

-- Position quantity is zero or negative
SELECT
    'Invalid Position Quantity' as anomaly_type,
    i.id as investor_id,
    i.email,
    i.full_name,
    pos.quantity as anomalous_value,
    CONCAT('Position ', pos.asset_name, ' has invalid quantity') as description
FROM investors i
JOIN positions pos ON pos.investor_id = i.id
WHERE pos.quantity <= 0;

-- ============================================================================
-- 3. FINANCIAL RECONCILIATION
-- ============================================================================

CREATE OR REPLACE VIEW financial_reconciliation AS
SELECT
    i.id as investor_id,
    i.email,
    i.full_name,

    -- Portfolio Reported Values
    p.total_invested as portfolio_total_invested,
    p.current_value as portfolio_current_value,
    p.realized_gains as portfolio_realized_gains,
    p.unrealized_gains as portfolio_unrealized_gains,

    -- Calculated from Transactions
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'deposit' AND status = 'completed') as calculated_deposits,

    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'withdrawal' AND status = 'completed') as calculated_withdrawals,

    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'dividend' AND status = 'completed') as calculated_dividends,

    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id AND type = 'fee' AND status = 'completed') as calculated_fees,

    -- Net Invested (Deposits - Withdrawals)
    (SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
     FROM transactions
     WHERE investor_id = i.id
       AND type IN ('deposit', 'withdrawal')
       AND status = 'completed') as calculated_net_invested,

    -- Calculated from Positions
    (SELECT COALESCE(SUM(cost_basis), 0) FROM positions WHERE investor_id = i.id) as positions_total_cost,
    (SELECT COALESCE(SUM(current_value), 0) FROM positions WHERE investor_id = i.id) as positions_total_value,
    (SELECT COALESCE(SUM(unrealized_gain_loss), 0) FROM positions WHERE investor_id = i.id) as positions_unrealized_pnl,

    -- Discrepancies
    ABS(p.total_invested - (
        SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
        FROM transactions
        WHERE investor_id = i.id
          AND type IN ('deposit', 'withdrawal')
          AND status = 'completed'
    )) as invested_discrepancy,

    ABS(COALESCE(p.unrealized_gains, 0) - (
        SELECT COALESCE(SUM(unrealized_gain_loss), 0) FROM positions WHERE investor_id = i.id
    )) as unrealized_gains_discrepancy,

    -- Reconciliation Status
    CASE
        WHEN ABS(p.total_invested - (
            SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
            FROM transactions
            WHERE investor_id = i.id
              AND type IN ('deposit', 'withdrawal')
              AND status = 'completed'
        )) > 0.01 THEN 'MISMATCH'
        ELSE 'OK'
    END as reconciliation_status,

    p.last_updated as portfolio_last_updated,
    NOW() as audit_timestamp

FROM investors i
LEFT JOIN portfolios p ON p.investor_id = i.id
WHERE i.investor_status = 'active'
ORDER BY invested_discrepancy DESC;

COMMENT ON VIEW financial_reconciliation IS
'Compares portfolio values against transaction history and position values to identify discrepancies';

-- ============================================================================
-- 4. COMPLIANCE CHECKS
-- ============================================================================

CREATE OR REPLACE VIEW compliance_status AS
SELECT
    i.id as investor_id,
    i.email,
    i.full_name,
    i.investor_status,
    i.kyc_status,
    i.created_at,

    -- KYC Compliance
    CASE
        WHEN i.kyc_status = 'approved' THEN 'COMPLIANT'
        WHEN i.kyc_status = 'pending' AND i.created_at > NOW() - INTERVAL '30 days' THEN 'PENDING_NEW'
        WHEN i.kyc_status = 'pending' THEN 'PENDING_OVERDUE'
        WHEN i.kyc_status = 'expired' THEN 'EXPIRED'
        WHEN i.kyc_status = 'rejected' THEN 'REJECTED'
        ELSE 'NOT_STARTED'
    END as kyc_compliance_status,

    -- Document Compliance (at least 1 verified document required)
    CASE
        WHEN EXISTS (SELECT 1 FROM documents WHERE investor_id = i.id AND is_verified = true) THEN 'COMPLIANT'
        WHEN EXISTS (SELECT 1 FROM documents WHERE investor_id = i.id AND is_verified = false) THEN 'PENDING_VERIFICATION'
        ELSE 'NO_DOCUMENTS'
    END as document_compliance_status,

    -- Profile Completeness
    CASE
        WHEN i.email IS NOT NULL
         AND i.full_name IS NOT NULL
         AND i.phone_number IS NOT NULL
         AND i.date_of_birth IS NOT NULL
         AND i.address IS NOT NULL THEN 'COMPLETE'
        WHEN i.email IS NOT NULL AND i.full_name IS NOT NULL THEN 'PARTIAL'
        ELSE 'INCOMPLETE'
    END as profile_completeness,

    -- Transaction Activity (active = transaction in last 90 days)
    CASE
        WHEN EXISTS (
            SELECT 1 FROM transactions
            WHERE investor_id = i.id
              AND created_at > NOW() - INTERVAL '90 days'
        ) THEN 'ACTIVE'
        WHEN EXISTS (
            SELECT 1 FROM transactions
            WHERE investor_id = i.id
              AND created_at > NOW() - INTERVAL '365 days'
        ) THEN 'DORMANT'
        ELSE 'INACTIVE'
    END as activity_status,

    -- Investment Size Category
    CASE
        WHEN p.total_invested >= 1000000 THEN 'HIGH_VALUE'
        WHEN p.total_invested >= 100000 THEN 'MEDIUM_VALUE'
        WHEN p.total_invested >= 10000 THEN 'LOW_VALUE'
        ELSE 'MINIMAL'
    END as investment_category,

    -- Risk Flags
    CASE
        WHEN (SELECT COUNT(*) FROM withdrawal_requests
              WHERE investor_id = i.id AND status = 'pending') > 0 THEN true
        ELSE false
    END as has_pending_withdrawals,

    CASE
        WHEN (SELECT COUNT(*) FROM transactions
              WHERE investor_id = i.id AND status = 'failed') > 3 THEN true
        ELSE false
    END as has_multiple_failed_transactions,

    p.total_invested,
    p.current_value,

    (SELECT MAX(created_at) FROM transactions WHERE investor_id = i.id) as last_transaction_date,
    (SELECT COUNT(*) FROM documents WHERE investor_id = i.id AND is_verified = true) as verified_documents_count

FROM investors i
LEFT JOIN portfolios p ON p.investor_id = i.id
ORDER BY i.created_at DESC;

COMMENT ON VIEW compliance_status IS
'Compliance and regulatory status for all investors including KYC, documents, and activity';

-- ============================================================================
-- 5. AUDIT REPORT FUNCTIONS
-- ============================================================================

-- Generate complete investor audit report
CREATE OR REPLACE FUNCTION generate_investor_audit_report(p_investor_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'generated_at', NOW(),
        'report_type', CASE WHEN p_investor_id IS NULL THEN 'PLATFORM_WIDE' ELSE 'INDIVIDUAL' END,

        -- Summary Statistics
        'summary', jsonb_build_object(
            'total_investors', (SELECT COUNT(*) FROM investors WHERE p_investor_id IS NULL OR id = p_investor_id),
            'active_investors', (SELECT COUNT(*) FROM investors WHERE investor_status = 'active' AND (p_investor_id IS NULL OR id = p_investor_id)),
            'pending_investors', (SELECT COUNT(*) FROM investors WHERE investor_status = 'pending' AND (p_investor_id IS NULL OR id = p_investor_id)),
            'kyc_approved', (SELECT COUNT(*) FROM investors WHERE kyc_status = 'approved' AND (p_investor_id IS NULL OR id = p_investor_id)),
            'kyc_pending', (SELECT COUNT(*) FROM investors WHERE kyc_status = 'pending' AND (p_investor_id IS NULL OR id = p_investor_id)),
            'total_aum', (SELECT COALESCE(SUM(current_value), 0) FROM portfolios p JOIN investors i ON i.id = p.investor_id WHERE p_investor_id IS NULL OR i.id = p_investor_id),
            'total_invested', (SELECT COALESCE(SUM(total_invested), 0) FROM portfolios p JOIN investors i ON i.id = p.investor_id WHERE p_investor_id IS NULL OR i.id = p_investor_id)
        ),

        -- Data Quality
        'data_quality', jsonb_build_object(
            'orphaned_records', (SELECT COUNT(*) FROM data_integrity_orphans),
            'anomalies', (SELECT COUNT(*) FROM data_integrity_anomalies WHERE p_investor_id IS NULL OR investor_id = p_investor_id),
            'reconciliation_issues', (SELECT COUNT(*) FROM financial_reconciliation WHERE reconciliation_status = 'MISMATCH' AND (p_investor_id IS NULL OR investor_id = p_investor_id))
        ),

        -- Compliance
        'compliance', jsonb_build_object(
            'kyc_compliant', (SELECT COUNT(*) FROM compliance_status WHERE kyc_compliance_status = 'COMPLIANT' AND (p_investor_id IS NULL OR investor_id = p_investor_id)),
            'document_compliant', (SELECT COUNT(*) FROM compliance_status WHERE document_compliance_status = 'COMPLIANT' AND (p_investor_id IS NULL OR investor_id = p_investor_id)),
            'profile_complete', (SELECT COUNT(*) FROM compliance_status WHERE profile_completeness = 'COMPLETE' AND (p_investor_id IS NULL OR investor_id = p_investor_id))
        ),

        -- Financial Health
        'financial', jsonb_build_object(
            'total_deposits', (SELECT COALESCE(SUM(total_deposits), 0) FROM investor_audit_overview WHERE p_investor_id IS NULL OR investor_id = p_investor_id),
            'total_withdrawals', (SELECT COALESCE(SUM(total_withdrawals), 0) FROM investor_audit_overview WHERE p_investor_id IS NULL OR investor_id = p_investor_id),
            'total_dividends', (SELECT COALESCE(SUM(total_dividends), 0) FROM investor_audit_overview WHERE p_investor_id IS NULL OR investor_id = p_investor_id),
            'total_fees', (SELECT COALESCE(SUM(total_fees), 0) FROM investor_audit_overview WHERE p_investor_id IS NULL OR investor_id = p_investor_id),
            'pending_withdrawals', (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending' AND (p_investor_id IS NULL OR investor_id = p_investor_id))
        ),

        -- Issues Summary
        'issues', jsonb_build_object(
            'portfolio_issues', (SELECT COUNT(*) FROM investor_audit_overview WHERE has_portfolio_issue = true AND (p_investor_id IS NULL OR investor_id = p_investor_id)),
            'kyc_issues', (SELECT COUNT(*) FROM investor_audit_overview WHERE has_kyc_issue = true AND (p_investor_id IS NULL OR investor_id = p_investor_id)),
            'profile_issues', (SELECT COUNT(*) FROM investor_audit_overview WHERE has_profile_issue = true AND (p_investor_id IS NULL OR investor_id = p_investor_id)),
            'reconciliation_issues', (SELECT COUNT(*) FROM investor_audit_overview WHERE has_reconciliation_issue = true AND (p_investor_id IS NULL OR investor_id = p_investor_id))
        ),

        -- Detailed Records (if single investor)
        'investor_details', CASE
            WHEN p_investor_id IS NOT NULL THEN (
                SELECT jsonb_agg(row_to_json(t))
                FROM (
                    SELECT * FROM investor_audit_overview WHERE investor_id = p_investor_id
                ) t
            )
            ELSE '[]'::jsonb
        END,

        'anomalies_list', CASE
            WHEN p_investor_id IS NOT NULL THEN (
                SELECT jsonb_agg(row_to_json(t))
                FROM (
                    SELECT * FROM data_integrity_anomalies WHERE investor_id = p_investor_id
                ) t
            )
            ELSE '[]'::jsonb
        END

    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_investor_audit_report TO authenticated;

COMMENT ON FUNCTION generate_investor_audit_report IS
'Generates comprehensive audit report for a single investor or entire platform';

-- ============================================================================
-- 6. DATA VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_investor_data(p_investor_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_investor RECORD;
    v_portfolio RECORD;
    v_errors JSONB := '[]'::jsonb;
    v_warnings JSONB := '[]'::jsonb;
BEGIN
    -- Get investor data
    SELECT * INTO v_investor FROM investors WHERE id = p_investor_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Investor not found'
        );
    END IF;

    -- Get portfolio data
    SELECT * INTO v_portfolio FROM portfolios WHERE investor_id = p_investor_id;

    -- Validate Profile
    IF v_investor.email IS NULL OR v_investor.email = '' THEN
        v_errors := v_errors || jsonb_build_object('field', 'email', 'issue', 'Email is required');
    END IF;

    IF v_investor.full_name IS NULL OR v_investor.full_name = '' THEN
        v_errors := v_errors || jsonb_build_object('field', 'full_name', 'issue', 'Full name is required');
    END IF;

    -- Validate KYC
    IF v_investor.kyc_status = 'not_started' AND v_investor.created_at < NOW() - INTERVAL '30 days' THEN
        v_warnings := v_warnings || jsonb_build_object('field', 'kyc_status', 'issue', 'KYC not started after 30 days');
    END IF;

    IF v_investor.kyc_status = 'expired' THEN
        v_errors := v_errors || jsonb_build_object('field', 'kyc_status', 'issue', 'KYC has expired');
    END IF;

    -- Validate Portfolio
    IF v_portfolio.total_invested < 0 THEN
        v_errors := v_errors || jsonb_build_object('field', 'total_invested', 'issue', 'Total invested cannot be negative');
    END IF;

    IF v_portfolio.current_value < 0 THEN
        v_errors := v_errors || jsonb_build_object('field', 'current_value', 'issue', 'Current value cannot be negative');
    END IF;

    -- Check reconciliation
    DECLARE
        v_calculated_invested NUMERIC;
        v_discrepancy NUMERIC;
    BEGIN
        SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
        INTO v_calculated_invested
        FROM transactions
        WHERE investor_id = p_investor_id
          AND type IN ('deposit', 'withdrawal')
          AND status = 'completed';

        v_discrepancy := ABS(COALESCE(v_portfolio.total_invested, 0) - v_calculated_invested);

        IF v_discrepancy > 0.01 THEN
            v_errors := v_errors || jsonb_build_object(
                'field', 'total_invested',
                'issue', format('Portfolio total_invested (%s) does not match transaction sum (%s). Discrepancy: %s',
                    v_portfolio.total_invested, v_calculated_invested, v_discrepancy)
            );
        END IF;
    END;

    -- Check for documents
    IF NOT EXISTS (SELECT 1 FROM documents WHERE investor_id = p_investor_id AND is_verified = true) THEN
        v_warnings := v_warnings || jsonb_build_object('field', 'documents', 'issue', 'No verified documents on file');
    END IF;

    -- Build result
    v_result := jsonb_build_object(
        'investor_id', p_investor_id,
        'valid', (jsonb_array_length(v_errors) = 0),
        'errors', v_errors,
        'warnings', v_warnings,
        'validated_at', NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_investor_data TO authenticated;

COMMENT ON FUNCTION validate_investor_data IS
'Validates all data for a single investor and returns errors and warnings';

-- ============================================================================
-- 7. ACTIVITY SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW investor_activity_summary AS
SELECT
    i.id as investor_id,
    i.email,
    i.full_name,

    -- Recent Activity (last 30 days)
    (SELECT COUNT(*) FROM transactions
     WHERE investor_id = i.id
       AND created_at > NOW() - INTERVAL '30 days') as transactions_last_30_days,

    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id
       AND created_at > NOW() - INTERVAL '30 days'
       AND type = 'deposit'
       AND status = 'completed') as deposits_last_30_days,

    (SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE investor_id = i.id
       AND created_at > NOW() - INTERVAL '30 days'
       AND type = 'withdrawal'
       AND status = 'completed') as withdrawals_last_30_days,

    -- Lifetime Activity
    (SELECT COUNT(*) FROM transactions WHERE investor_id = i.id) as total_lifetime_transactions,

    (SELECT MAX(created_at) FROM transactions WHERE investor_id = i.id) as last_transaction_date,

    (SELECT MAX(updated_at) FROM positions WHERE investor_id = i.id) as last_position_update,

    -- Days since last activity
    EXTRACT(DAY FROM NOW() - (SELECT MAX(created_at) FROM transactions WHERE investor_id = i.id)) as days_since_last_transaction,

    -- Current Status
    i.investor_status,
    i.kyc_status,
    p.current_value,
    p.total_invested,

    -- Activity Classification
    CASE
        WHEN (SELECT MAX(created_at) FROM transactions WHERE investor_id = i.id) > NOW() - INTERVAL '30 days' THEN 'ACTIVE'
        WHEN (SELECT MAX(created_at) FROM transactions WHERE investor_id = i.id) > NOW() - INTERVAL '90 days' THEN 'MODERATE'
        WHEN (SELECT MAX(created_at) FROM transactions WHERE investor_id = i.id) > NOW() - INTERVAL '365 days' THEN 'LOW'
        ELSE 'DORMANT'
    END as activity_level

FROM investors i
LEFT JOIN portfolios p ON p.investor_id = i.id
ORDER BY last_transaction_date DESC NULLS LAST;

COMMENT ON VIEW investor_activity_summary IS
'Summary of investor activity over various time periods';

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT on views to authenticated users (admins only should see this)
GRANT SELECT ON investor_audit_overview TO authenticated;
GRANT SELECT ON data_integrity_orphans TO authenticated;
GRANT SELECT ON data_integrity_anomalies TO authenticated;
GRANT SELECT ON financial_reconciliation TO authenticated;
GRANT SELECT ON compliance_status TO authenticated;
GRANT SELECT ON investor_activity_summary TO authenticated;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Get platform-wide audit report
-- SELECT generate_investor_audit_report();

-- Example 2: Get specific investor audit report
-- SELECT generate_investor_audit_report('investor-uuid-here');

-- Example 3: Validate specific investor data
-- SELECT validate_investor_data('investor-uuid-here');

-- Example 4: View all data anomalies
-- SELECT * FROM data_integrity_anomalies;

-- Example 5: Check financial reconciliation
-- SELECT * FROM financial_reconciliation WHERE reconciliation_status = 'MISMATCH';

-- Example 6: View compliance status
-- SELECT * FROM compliance_status WHERE kyc_compliance_status != 'COMPLIANT';

-- Example 7: Get investor activity summary
-- SELECT * FROM investor_activity_summary WHERE activity_level = 'DORMANT';

-- Example 8: Full investor overview
-- SELECT * FROM investor_audit_overview WHERE has_reconciliation_issue = true;

-- ============================================================================
-- END OF INVESTOR AUDIT SYSTEM
-- ============================================================================
