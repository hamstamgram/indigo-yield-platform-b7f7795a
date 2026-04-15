-- =============================================================================
-- STABILIZATION PHASE 3: Yield Constraint Gate
-- =============================================================================
-- Validates chk_correction_has_parent constraint and adds idempotency to
-- yield application to prevent chk_correction_has_parent violations.
--
-- The constraint:
--   distribution_type IN ('original','daily','deposit','withdrawal','transaction')
--   OR parent_distribution_id IS NOT NULL
--
-- This means corrections must have a parent, but original/daily/deposit/withdrawal/transaction
-- can exist standalone.
-- =============================================================================

-- 1. Validate yield_distributions constraint - INSERT test cases
-- Uses is_voided=TRUE so test rows are inert and safe to leave behind
DO $$
DECLARE
    v_fund_id UUID;
    v_test_passed BOOLEAN := TRUE;
    v_test_id_1 UUID;
    v_test_id_2 UUID;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    SELECT id INTO v_fund_id FROM funds LIMIT 1;
    IF v_fund_id IS NULL THEN
        RAISE NOTICE 'SKIP: No funds found - skipping yield constraint validation';
        RETURN;
    END IF;

   -- Test case 1: Original distribution type (should PASS - allowed standalone)
    BEGIN
        PERFORM set_config('indigo.canonical_rpc', 'true', true);
        INSERT INTO yield_distributions (
            fund_id, distribution_type, period_start, period_end,
            gross_yield_amount, recorded_aum, effective_date,
            status, purpose, is_voided, created_by
        ) VALUES (
            v_fund_id, 'original', CURRENT_DATE - 30, CURRENT_DATE - 1,
            0, 0, CURRENT_DATE,
            'applied'::yield_distribution_status, 'transaction'::aum_purpose,
            TRUE, (SELECT id FROM profiles LIMIT 1)
        )
        RETURNING id INTO v_test_id_1;
        RAISE NOTICE 'PASS: Original distribution type inserts without parent';
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'FAIL: Original distribution type failed - constraint too restrictive';
    END;

    -- Test case 2: Daily distribution type (should PASS - allowed standalone)
    BEGIN
        PERFORM set_config('indigo.canonical_rpc', 'true', true);
        INSERT INTO yield_distributions (
            fund_id, distribution_type, period_start, period_end,
            gross_yield_amount, recorded_aum, effective_date,
            status, purpose, is_voided, created_by
        ) VALUES (
            v_fund_id, 'daily', CURRENT_DATE - 7, CURRENT_DATE - 1,
            0, 0, CURRENT_DATE,
            'applied'::yield_distribution_status, 'transaction'::aum_purpose,
            TRUE, (SELECT id FROM profiles LIMIT 1)
        )
        RETURNING id INTO v_test_id_2;
        RAISE NOTICE 'PASS: Daily distribution type inserts without parent';
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'FAIL: Daily distribution type failed - constraint too restrictive';
    END;

    -- Test case 3: Correction without parent (should FAIL - requires parent)
    BEGIN
        PERFORM set_config('indigo.canonical_rpc', 'true', true);
        INSERT INTO yield_distributions (
            fund_id, distribution_type, period_start, period_end,
            gross_yield_amount, recorded_aum, effective_date,
            status, purpose, is_voided, created_by, parent_distribution_id, reason
        ) VALUES (
            v_fund_id, 'correction', CURRENT_DATE - 30, CURRENT_DATE - 1,
            0, 0, CURRENT_DATE,
            'applied'::yield_distribution_status, 'transaction'::aum_purpose,
            TRUE, (SELECT id FROM profiles LIMIT 1), NULL, 'test correction'
        );
        v_test_passed := FALSE;
        RAISE EXCEPTION 'FAIL: Correction without parent should have been rejected';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: Correction without parent correctly rejected';
    END;

    -- Clean up test rows
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    DELETE FROM yield_distributions WHERE id IN (v_test_id_1, v_test_id_2);

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'PASS: Yield constraint chk_correction_has_parent validated';
    RAISE NOTICE '============================================================';
END $$;

-- 2. Add idempotency key column to yield_distributions if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'yield_distributions'
          AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE yield_distributions ADD COLUMN idempotency_key TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_yield_distributions_idempotency 
            ON yield_distributions(idempotency_key) WHERE idempotency_key IS NOT NULL;
        RAISE NOTICE 'Added idempotency_key column to yield_distributions';
    ELSE
        RAISE NOTICE 'idempotency_key already exists on yield_distributions';
    END IF;
END $$;

-- 3. Create yield application idempotency function
-- NOTE: Uses apply_adb_yield_distribution_v3 as the canonical yield function
-- If a different function is used in production, update this accordingly
CREATE OR REPLACE FUNCTION public.apply_yield_idempotent(
    p_fund_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_gross_yield_amount NUMERIC,
    p_admin_id UUID DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
) RETURNS JSONB AS $$
DECLARE
    v_existing_distribution RECORD;
    v_result JSONB;
BEGIN
    -- If idempotency key provided, check for existing yield
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_distribution
        FROM yield_distributions
        WHERE fund_id = p_fund_id 
          AND period_end = p_period_end
          AND idempotency_key = p_idempotency_key
          AND is_voided = FALSE;

        IF v_existing_distribution.id IS NOT NULL THEN
            RETURN JSONB_BUILD_OBJECT(
                'success', TRUE,
                'idempotent_replay', TRUE,
                'distribution_id', v_existing_distribution.id,
                'message', 'Yield distribution already applied for this idempotency key'
            );
        END IF;
    END IF;

    -- Apply yield with existing function (sets canonical_rpc internally)
    v_result := public.apply_adb_yield_distribution_v3(
        p_fund_id,
        p_period_start,
        p_period_end,
        p_gross_yield_amount,
        p_admin_id,
        p_purpose,
        NULL,  -- distribution_date
        NULL   -- recorded_aum
    );

    -- Update idempotency key if provided
    IF p_idempotency_key IS NOT NULL AND v_result->>'success' = 'true' THEN
        PERFORM set_config('indigo.canonical_rpc', 'true', true);
        UPDATE yield_distributions
        SET idempotency_key = p_idempotency_key
        WHERE id = (
            SELECT id FROM yield_distributions
            WHERE fund_id = p_fund_id 
              AND period_end = p_period_end
              AND idempotency_key IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        );
    END IF;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.apply_yield_idempotent(UUID, DATE, DATE, NUMERIC, UUID, TEXT, aum_purpose) OWNER TO postgres;

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'STABILIZATION PHASE 3 COMPLETE - Yield constraint gate active';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Verified: chk_correction_has_parent constraint correct';
    RAISE NOTICE 'Added: idempotency_key column to yield_distributions';
    RAISE NOTICE 'Added: apply_yield_idempotent() function';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Phase 4 - Notification Side-Effect Reliability';
    RAISE NOTICE '        (Add retry logic to notify-yield-applied)';
END $$;