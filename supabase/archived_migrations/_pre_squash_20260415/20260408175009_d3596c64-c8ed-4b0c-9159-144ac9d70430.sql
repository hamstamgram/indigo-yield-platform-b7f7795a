
-- Purge audit_log rows from test-data cleanup period (correct year: 2026)
DELETE FROM public.audit_log
WHERE created_at >= '2026-03-28T00:00:00Z'
  AND created_at < '2026-04-05T00:00:00Z'
  AND action IN ('INSERT', 'DELETE', 'UPDATE', 'DELTA_UPDATE');

-- Purge data_edit_audit rows from same period
DELETE FROM public.data_edit_audit
WHERE edited_at >= '2026-03-28T00:00:00Z'
  AND edited_at < '2026-04-05T00:00:00Z';
