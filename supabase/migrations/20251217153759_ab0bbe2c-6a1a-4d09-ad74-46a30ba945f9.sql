-- Migrate investor positions from deprecated EURCYF fund to active IND-EURC fund
UPDATE public.investor_positions 
SET fund_id = '58f8bcad-56b0-4369-a6c6-34c5d4aaa961'  -- IND-EURC (active)
WHERE fund_id = '243f87b3-c165-4ec2-acb0-7b9117a50b05'; -- EURCYF (deprecated)