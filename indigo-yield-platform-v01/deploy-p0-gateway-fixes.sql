-- P0 Gateway Fixes: Canonical RPC Functions Deployment
-- This script deploys three canonical RPC functions to enforce proper gateway usage
-- Tested and verified on remote Supabase database

-- Function 1: GDPR Compliant Data Export
-- Canonical function for exporting investor data with audit logging
CREATE OR REPLACE FUNCTION export_investor_data(investor_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    authenticated_user_id UUID;
BEGIN
    -- Authentication check
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Authorization check - only allow users to export their own data or admins
    IF authenticated_user_id != investor_id_param
       AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = authenticated_user_id AND role = 'super_admin') THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    -- Export investor data
    SELECT jsonb_build_object(
        'personal_info', jsonb_build_object(
            'user_id', up.user_id,
            'full_name', up.full_name,
            'email', up.email,
            'created_at', up.created_at
        ),
        'investments', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'investment_id', i.id,
                    'amount', i.amount,
                    'investment_date', i.created_at,
                    'status', i.status
                )
            ) FROM investments i WHERE i.investor_id = investor_id_param),
            '[]'::jsonb
        ),
        'transactions', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'transaction_id', t.id,
                    'type', t.transaction_type,
                    'amount', t.amount,
                    'date', t.created_at
                )
            ) FROM transactions t WHERE t.user_id = investor_id_param),
            '[]'::jsonb
        ),
        'export_timestamp', NOW(),
        'export_requested_by', authenticated_user_id
    ) INTO result
    FROM user_profiles up
    WHERE up.user_id = investor_id_param;

    -- Audit log the export request
    INSERT INTO audit_logs (
        user_id,
        action,
        details,
        ip_address,
        created_at
    ) VALUES (
        authenticated_user_id,
        'GDPR_DATA_EXPORT',
        jsonb_build_object(
            'exported_user_id', investor_id_param,
            'data_types', ARRAY['personal_info', 'investments', 'transactions']
        ),
        inet_client_addr(),
        NOW()
    );

    IF result IS NULL THEN
        RAISE EXCEPTION 'Investor not found';
    END IF;

    RETURN result;
END;
$$;

-- Function 2: Standardized KPI Calculations
-- Canonical function for calculating key performance indicators
CREATE OR REPLACE FUNCTION get_kpi_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    authenticated_user_id UUID;
BEGIN
    -- Authentication check
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Authorization check - only admins can access KPI metrics
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = authenticated_user_id AND role IN ('admin', 'super_admin')) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    -- Calculate KPIs
    SELECT jsonb_build_object(
        'total_aum', COALESCE(
            (SELECT SUM(amount) FROM investments WHERE status = 'active'),
            0
        ),
        'total_investors', COALESCE(
            (SELECT COUNT(DISTINCT investor_id) FROM investments WHERE status = 'active'),
            0
        ),
        'monthly_inflows', COALESCE(
            (SELECT SUM(amount)
             FROM transactions
             WHERE transaction_type = 'DEPOSIT'
             AND created_at >= date_trunc('month', CURRENT_DATE)),
            0
        ),
        'monthly_outflows', COALESCE(
            (SELECT SUM(amount)
             FROM transactions
             WHERE transaction_type = 'WITHDRAWAL'
             AND created_at >= date_trunc('month', CURRENT_DATE)),
            0
        ),
        'avg_investment_size', COALESCE(
            (SELECT AVG(amount) FROM investments WHERE status = 'active'),
            0
        ),
        'fund_performance', COALESCE(
            (SELECT
                jsonb_build_object(
                    'ytd_return', AVG(yield_rate),
                    'total_yield_paid', SUM(yield_amount)
                )
             FROM yield_payments
             WHERE created_at >= date_trunc('year', CURRENT_DATE)),
            '{}'::jsonb
        ),
        'calculated_at', NOW(),
        'calculated_by', authenticated_user_id
    ) INTO result;

    RETURN result;
END;
$$;

-- Function 3: Integrity Monitoring System
-- Canonical function for automated system health checks
CREATE OR REPLACE FUNCTION run_integrity_monitoring()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    authenticated_user_id UUID;
    violations_count INTEGER := 0;
    warnings TEXT[] := '{}';
BEGIN
    -- Authentication check
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Authorization check - only admins can run integrity monitoring
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = authenticated_user_id AND role IN ('admin', 'super_admin')) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    -- Check 1: Investment amount consistency
    IF EXISTS (
        SELECT 1 FROM investments
        WHERE amount <= 0 OR amount IS NULL
    ) THEN
        violations_count := violations_count + 1;
        warnings := array_append(warnings, 'Invalid investment amounts detected');
    END IF;

    -- Check 2: Transaction balance consistency
    IF EXISTS (
        SELECT user_id
        FROM transactions
        GROUP BY user_id
        HAVING SUM(
            CASE
                WHEN transaction_type = 'DEPOSIT' THEN amount
                WHEN transaction_type = 'WITHDRAWAL' THEN -amount
                ELSE 0
            END
        ) < 0
    ) THEN
        violations_count := violations_count + 1;
        warnings := array_append(warnings, 'Negative balance detected in transaction history');
    END IF;

    -- Check 3: Orphaned records
    IF EXISTS (
        SELECT 1 FROM investments i
        LEFT JOIN user_profiles up ON i.investor_id = up.user_id
        WHERE up.user_id IS NULL
    ) THEN
        violations_count := violations_count + 1;
        warnings := array_append(warnings, 'Orphaned investment records found');
    END IF;

    -- Check 4: AUM calculation verification
    DECLARE
        calculated_aum NUMERIC;
        stored_aum NUMERIC;
    BEGIN
        SELECT SUM(amount) INTO calculated_aum FROM investments WHERE status = 'active';
        SELECT aum INTO stored_aum FROM fund_daily_aum ORDER BY date DESC LIMIT 1;

        IF ABS(COALESCE(calculated_aum, 0) - COALESCE(stored_aum, 0)) > 0.01 THEN
            violations_count := violations_count + 1;
            warnings := array_append(warnings, 'AUM calculation mismatch detected');
        END IF;
    END;

    -- Build result
    SELECT jsonb_build_object(
        'status', CASE
            WHEN violations_count = 0 THEN 'HEALTHY'
            WHEN violations_count <= 2 THEN 'WARNING'
            ELSE 'CRITICAL'
        END,
        'violations_count', violations_count,
        'warnings', to_jsonb(warnings),
        'checks_performed', ARRAY[
            'investment_amounts',
            'transaction_balances',
            'orphaned_records',
            'aum_calculation'
        ],
        'monitoring_timestamp', NOW(),
        'monitored_by', authenticated_user_id,
        'system_health_score', CASE
            WHEN violations_count = 0 THEN 100
            WHEN violations_count = 1 THEN 85
            WHEN violations_count = 2 THEN 70
            ELSE 50
        END
    ) INTO result;

    -- Log monitoring results
    INSERT INTO audit_logs (
        user_id,
        action,
        details,
        created_at
    ) VALUES (
        authenticated_user_id,
        'INTEGRITY_MONITORING',
        result,
        NOW()
    );

    RETURN result;
END;
$$;

-- Add RLS policies for audit logs if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_admin_read') THEN
        CREATE POLICY audit_logs_admin_read ON audit_logs
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE user_id = auth.uid()
                AND role IN ('admin', 'super_admin')
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_system_insert') THEN
        CREATE POLICY audit_logs_system_insert ON audit_logs
        FOR INSERT
        WITH CHECK (TRUE); -- Allow system inserts from SECURITY DEFINER functions
    END IF;
END $$;

-- Enable RLS on audit_logs if not already enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION export_investor_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_kpi_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION run_integrity_monitoring TO authenticated;

-- Success message
SELECT 'P0 Gateway Fixes deployed successfully. Three canonical RPC functions are now available.' as deployment_status;