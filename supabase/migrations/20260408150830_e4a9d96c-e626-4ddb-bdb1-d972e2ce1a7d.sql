
-- Fix v_missing_withdrawal_transactions to eliminate false positives
-- The old view required fund_id match AND specific reference_id patterns,
-- but the RPC doesn't always use the same fund_id and reference patterns vary.
CREATE OR REPLACE VIEW public.v_missing_withdrawal_transactions
WITH (security_invoker = true) AS
SELECT
  wr.id AS withdrawal_request_id,
  wr.investor_id,
  wr.fund_id,
  wr.requested_amount,
  wr.processed_amount,
  wr.status,
  wr.processed_at
FROM withdrawal_requests wr
LEFT JOIN transactions_v2 t
  ON t.investor_id = wr.investor_id
  AND t.type = 'WITHDRAWAL'::tx_type
  AND t.is_voided = false
  AND t.created_at >= wr.request_date
WHERE wr.status = 'completed'::withdrawal_status
  AND t.id IS NULL;
