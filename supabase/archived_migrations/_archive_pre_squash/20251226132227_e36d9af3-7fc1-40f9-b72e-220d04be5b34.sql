-- Issue B: Add payout status tracking to ib_allocations
-- Add columns to track commission payout status

ALTER TABLE ib_allocations
ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid')),
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS payout_batch_id uuid;

-- Create index for filtering by payout status
CREATE INDEX IF NOT EXISTS idx_ib_allocations_payout_status ON ib_allocations(payout_status);

-- Create index for payout batch lookups
CREATE INDEX IF NOT EXISTS idx_ib_allocations_payout_batch ON ib_allocations(payout_batch_id) WHERE payout_batch_id IS NOT NULL;

-- Add audit trigger for payout status changes
CREATE OR REPLACE FUNCTION audit_ib_allocation_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payout_status IS DISTINCT FROM NEW.payout_status THEN
    INSERT INTO audit_log (
      entity,
      entity_id,
      action,
      actor_user,
      old_values,
      new_values,
      created_at
    ) VALUES (
      'ib_allocations',
      NEW.id::text,
      'payout_status_change',
      NEW.paid_by,
      jsonb_build_object('payout_status', OLD.payout_status),
      jsonb_build_object('payout_status', NEW.payout_status, 'paid_at', NEW.paid_at, 'payout_batch_id', NEW.payout_batch_id),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ib_allocation_payout_audit ON ib_allocations;
CREATE TRIGGER ib_allocation_payout_audit
  AFTER UPDATE ON ib_allocations
  FOR EACH ROW
  EXECUTE FUNCTION audit_ib_allocation_payout();

COMMENT ON COLUMN ib_allocations.payout_status IS 'Commission payout status: pending or paid';
COMMENT ON COLUMN ib_allocations.paid_at IS 'Timestamp when commission was marked as paid';
COMMENT ON COLUMN ib_allocations.paid_by IS 'Admin user who marked the commission as paid';
COMMENT ON COLUMN ib_allocations.payout_batch_id IS 'Batch ID for grouped payout operations';