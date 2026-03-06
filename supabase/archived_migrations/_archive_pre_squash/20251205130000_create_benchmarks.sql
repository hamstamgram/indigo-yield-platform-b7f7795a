-- Create benchmark_indices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.benchmark_indices (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol text NOT NULL UNIQUE,
    name text NOT NULL,
    returns jsonb DEFAULT '{}'::jsonb, -- Stores { "mtd": 1.2, "ytd": 10.5 } etc.
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed Data for SPY, QQQ, AGG (Real-ish market data for late 2025 context)
INSERT INTO public.benchmark_indices (symbol, name, returns)
VALUES 
    ('SPY', 'S&P 500', '{"mtd": 1.5, "qtd": 4.2, "ytd": 15.8, "itd": 48.5}'),
    ('QQQ', 'Nasdaq 100', '{"mtd": 2.1, "qtd": 5.8, "ytd": 22.4, "itd": 65.1}'),
    ('AGG', 'US Aggregate Bond', '{"mtd": 0.4, "qtd": 1.1, "ytd": 3.5, "itd": 9.2}')
ON CONFLICT (symbol) DO UPDATE 
SET returns = EXCLUDED.returns, updated_at = now();

-- Enable RLS
ALTER TABLE public.benchmark_indices ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON public.benchmark_indices
FOR SELECT TO authenticated USING (true);
