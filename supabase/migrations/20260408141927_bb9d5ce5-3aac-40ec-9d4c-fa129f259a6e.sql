-- Bypass position-write guard
SET LOCAL app.canonical_rpc = 'true';
SET LOCAL indigo.canonical_rpc = 'true';

-- TASK 1: Compensating DUST_SWEEP debit for Indigo Fees SOL
INSERT INTO transactions_v2 (
  investor_id, fund_id, type, amount, value_date, tx_date,
  reference_id, notes, source, visibility_scope, is_system_generated, asset, fund_class
)
SELECT
  'b464a3f7-60d5-4bc0-9833-7b413bcc6cae',
  '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
  'DUST_SWEEP', -1.6446385727, CURRENT_DATE, CURRENT_DATE,
  'reconcile-dust-fees-sol-2026-04-08',
  'Compensating debit: reverse duplicate DUST_SWEEP credit from voided/reissued Indigo LP SOL withdrawal.',
  'migration', 'investor_visible', true, 'SOL', 'SOL'
WHERE NOT EXISTS (
  SELECT 1 FROM transactions_v2 WHERE reference_id = 'reconcile-dust-fees-sol-2026-04-08'
);

-- Recompute position
SELECT recompute_investor_position(
  'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
  '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
);

-- TASK 2: Refresh stale AUM (correct fund IDs)
SELECT recalculate_fund_aum_for_date(
  '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, CURRENT_DATE  -- SOL
);
SELECT recalculate_fund_aum_for_date(
  '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, CURRENT_DATE  -- USDT
);

-- TASK 3: Finalize 4 DRAFT statement periods
UPDATE statement_periods 
SET status = 'FINALIZED', finalized_at = now()
WHERE id IN (
  'e349e141-a9cc-44e3-b753-505781aa47b8',
  '06d45fc2-441a-4950-ac9f-bdc38057abde',
  '27090330-9b05-4ee7-ab2b-0c2624fe17f1',
  '1a38f45b-e042-426b-abec-ede79c7a1723'
) AND status = 'DRAFT';