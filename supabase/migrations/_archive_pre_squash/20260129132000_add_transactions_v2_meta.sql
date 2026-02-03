-- Add meta column for crystallization snapshot linkage
ALTER TABLE public.transactions_v2
  ADD COLUMN IF NOT EXISTS meta jsonb;
