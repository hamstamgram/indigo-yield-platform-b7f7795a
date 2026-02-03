-- ==========================================
-- AUDIT CLEANUP: Remove CSP violation spam
-- ==========================================

-- Delete old CSP violation entries from audit_log
-- These are logged to console anyway and don't need DB storage
DELETE FROM audit_log 
WHERE entity = 'security' 
  AND action = 'CSP_VIOLATION';