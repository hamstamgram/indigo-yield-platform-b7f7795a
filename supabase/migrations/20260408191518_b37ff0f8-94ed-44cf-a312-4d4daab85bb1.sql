
-- Migration 3: P1 — Void orphaned distribution
SELECT void_yield_distribution(
  '63b032b8-7b16-4335-844e-b6d49e53dba0'::uuid,
  'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
  'Audit remediation: orphaned test distribution with purpose=transaction causing conservation violation',
  false
);
