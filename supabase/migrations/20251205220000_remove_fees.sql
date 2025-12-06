
-- Remove Fee Structure Migration
-- Zeros out all fee configurations for investors and funds

DO $$
BEGIN
    -- 1. Zero out investor fee percentages
    UPDATE public.profiles
    SET fee_percentage = 0;

    -- 2. Zero out fund fee configurations
    UPDATE public.funds
    SET mgmt_fee_bps = 0, perf_fee_bps = 0;

    UPDATE public.fund_configurations
    SET mgmt_fee_bps = 0, perf_fee_bps = 0;

    -- 3. Zero out yield settings default rates (if any represent fees, though usually they are yields)
    -- Assuming yield_settings.rate_bps is strictly yield, not fee.
    
    RAISE NOTICE 'Fee structure removed (rates set to 0).';
END $$;
