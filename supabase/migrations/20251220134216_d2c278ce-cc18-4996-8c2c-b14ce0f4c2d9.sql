-- Change default fee_percentage from 2% to 20% for new investors
ALTER TABLE public.profiles 
ALTER COLUMN fee_percentage SET DEFAULT 0.20;