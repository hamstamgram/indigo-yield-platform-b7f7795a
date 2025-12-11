-- Fix schema gaps for build errors

-- 1. Create platform_fees_collected VIEW (maps fee_calculations to the expected frontend structure)
CREATE OR REPLACE VIEW public.platform_fees_collected AS
SELECT
    fc.id,
    fc.investor_id,
    fc.fee_amount,
    f.asset AS asset_code,
    fc.calculation_date AS fee_date,
    DATE_TRUNC('month', fc.calculation_date)::DATE AS fee_month,
    fc.created_at
FROM public.fee_calculations fc
JOIN public.funds f ON fc.fund_id = f.id;
