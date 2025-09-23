-- Enable realtime for key tables
ALTER TABLE public.withdrawal_requests REPLICA IDENTITY FULL;
ALTER TABLE public.investor_positions REPLICA IDENTITY FULL;
ALTER TABLE public.daily_yield_applications REPLICA IDENTITY FULL;
ALTER TABLE public.yield_rates REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investor_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_yield_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yield_rates;