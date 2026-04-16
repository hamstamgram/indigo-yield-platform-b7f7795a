
-- Update chk_amounts to include 'voided' status (voided can have approved_amount or not)
ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS chk_amounts;
ALTER TABLE public.withdrawal_requests ADD CONSTRAINT chk_amounts CHECK (
  (status = 'pending' AND approved_amount IS NULL)
  OR (status IN ('approved', 'processing', 'completed') AND approved_amount IS NOT NULL)
  OR (status IN ('rejected', 'cancelled', 'voided'))
);

-- Now fix the 3 orphaned records
DO $$
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  UPDATE public.withdrawal_requests
  SET status = 'voided',
      admin_notes = COALESCE(admin_notes, '') ||
        CASE WHEN admin_notes IS NOT NULL AND admin_notes != '' THEN ' | ' ELSE '' END ||
        'Data fix: All linked transactions were voided but status was not cascaded. Fixed 2026-04-09.'
  WHERE id IN (
    '8b440397-a0a3-449c-b4fd-bfebf3e47d57',
    '91a41a37-366e-4aca-8cbb-e7735b63044f',
    'a953883a-9fe8-41d4-ad4d-d9be229f7782'
  )
  AND status = 'completed';
END;
$$;
