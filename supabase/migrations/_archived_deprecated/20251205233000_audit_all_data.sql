
-- Deep Data Audit
-- Counts all key records to verify data presence

DO $$
DECLARE
    v_tx_count INT;
    v_report_count INT;
    v_pos_count INT;
    v_inv_count INT;
    v_inv_names TEXT;
BEGIN
    SELECT COUNT(*) INTO v_tx_count FROM public.transactions;
    SELECT COUNT(*) INTO v_report_count FROM public.investor_monthly_reports;
    SELECT COUNT(*) INTO v_pos_count FROM public.investor_positions;
    SELECT COUNT(*) INTO v_inv_count FROM public.investors;
    
    SELECT string_agg(name, ', ') INTO v_inv_names FROM public.investors;

    RAISE NOTICE '=== DEEP DATA AUDIT ===';
    RAISE NOTICE 'Total Investors: %', v_inv_count;
    RAISE NOTICE 'Investor Names: %', COALESCE(v_inv_names, 'None');
    RAISE NOTICE 'Total Transactions: %', v_tx_count;
    RAISE NOTICE 'Total Monthly Reports: %', v_report_count;
    RAISE NOTICE 'Total Positions: %', v_pos_count;
    RAISE NOTICE '=======================';
END $$;
