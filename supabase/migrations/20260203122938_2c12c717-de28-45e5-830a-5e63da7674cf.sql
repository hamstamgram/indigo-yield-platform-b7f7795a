-- Fix: ON CONFLICT constraint mismatch in sync_ib_allocations_from_commission_ledger
-- Issue: The trigger used ON CONFLICT ON CONSTRAINT ib_allocations_idempotency which includes
-- nullable distribution_id column. PostgreSQL cannot match ON CONFLICT with nullable columns.
-- Solution: Use column-based ON CONFLICT and add guard clause for NULL distribution_id.

-- Step 1: Drop the duplicate partial index that conflicts with the named constraint
DROP INDEX IF EXISTS public.ib_allocations_distribution_unique;

-- Step 2: Update the trigger function with proper ON CONFLICT handling
CREATE OR REPLACE FUNCTION public.sync_ib_allocations_from_commission_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Guard: Skip if no valid distribution_id (prevents ON CONFLICT issues with NULL)
  IF new.yield_distribution_id IS NULL THEN
    RETURN new;
  END IF;

  -- Guard: Skip if distribution doesn't exist (prevents orphan allocations)
  IF NOT EXISTS (SELECT 1 FROM public.yield_distributions WHERE id = new.yield_distribution_id) THEN
    RETURN new;
  END IF;

  -- Insert IB allocation from commission ledger entry
  -- Uses DO NOTHING for idempotency (duplicates are silently ignored)
  INSERT INTO public.ib_allocations (
    id,
    ib_investor_id,
    source_investor_id,
    fund_id,
    source_net_income,
    ib_percentage,
    ib_fee_amount,
    effective_date,
    created_at,
    created_by,
    distribution_id,
    period_start,
    period_end,
    purpose,
    source,
    is_voided
  )
  SELECT
    gen_random_uuid(),
    new.ib_id,
    new.source_investor_id,
    new.fund_id,
    new.gross_yield_amount,
    new.ib_percentage,
    new.ib_commission_amount,
    new.effective_date,
    COALESCE(new.created_at, now()),
    new.created_by,
    new.yield_distribution_id,
    yd.period_start,
    yd.period_end,
    yd.purpose,
    'from_investor_yield',
    COALESCE(new.is_voided, false)
  FROM public.yield_distributions yd
  WHERE yd.id = new.yield_distribution_id
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$function$;