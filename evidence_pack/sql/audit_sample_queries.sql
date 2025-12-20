-- Evidence Pack: Audit Sample Queries
-- Retrieves last 20 events for each audit category

-- ============================================
-- 1. Yield/Performance Data Edits
-- ============================================
SELECT 
    id,
    table_name,
    record_id,
    operation,
    changed_fields,
    edited_by,
    edit_source,
    edited_at,
    old_data->>'mtd_net_income' AS old_net_income,
    new_data->>'mtd_net_income' AS new_net_income
FROM data_edit_audit
WHERE table_name = 'investor_fund_performance'
ORDER BY edited_at DESC
LIMIT 20;

-- ============================================
-- 2. AUM Edits
-- ============================================
SELECT 
    id,
    table_name,
    record_id,
    operation,
    changed_fields,
    edited_by,
    edit_source,
    edited_at,
    old_data->>'total_aum' AS old_aum,
    new_data->>'total_aum' AS new_aum
FROM data_edit_audit
WHERE table_name = 'fund_daily_aum'
ORDER BY edited_at DESC
LIMIT 20;

-- ============================================
-- 3. Withdrawal Approvals/Rejections
-- ============================================
SELECT 
    id,
    entity,
    entity_id,
    action,
    actor_user,
    old_values->>'status' AS old_status,
    new_values->>'status' AS new_status,
    new_values->>'notes' AS notes,
    created_at
FROM audit_log
WHERE entity = 'withdrawal_requests'
  AND action IN ('approved', 'rejected', 'withdrawal_approved', 'withdrawal_rejected')
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 4. Fee Applications
-- ============================================
SELECT 
    fa.id,
    p.full_name AS investor_name,
    f.name AS fund_name,
    fa.fee_amount,
    fa.fee_percentage,
    fa.period_start,
    fa.period_end,
    fa.purpose,
    admin.full_name AS applied_by,
    fa.created_at
FROM fee_allocations fa
JOIN profiles p ON p.id = fa.investor_id
JOIN funds f ON f.id = fa.fund_id
LEFT JOIN profiles admin ON admin.id = fa.created_by
ORDER BY fa.created_at DESC
LIMIT 20;

-- ============================================
-- 5. Report Send Events
-- ============================================
SELECT 
    id,
    recipient,
    subject,
    template,
    status,
    sent_at,
    delivered_at,
    error,
    metadata->>'investor_id' AS investor_id,
    metadata->>'period_id' AS period_id
FROM email_logs
WHERE template ILIKE '%statement%' 
   OR template ILIKE '%report%'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 6. Report Regeneration Events
-- ============================================
SELECT 
    id,
    report_id,
    report_table,
    changed_by,
    change_reason,
    previous_html_hash,
    previous_pdf_url,
    change_summary,
    changed_at
FROM report_change_log
ORDER BY changed_at DESC
LIMIT 20;

-- ============================================
-- 7. Admin Role Changes
-- ============================================
SELECT 
    id,
    entity,
    entity_id,
    action,
    actor_user,
    old_values->>'is_admin' AS was_admin,
    new_values->>'is_admin' AS is_admin,
    old_values->>'is_super_admin' AS was_super_admin,
    new_values->>'is_super_admin' AS is_super_admin,
    created_at
FROM audit_log
WHERE entity = 'profiles'
  AND action IN ('admin_role_granted', 'admin_role_revoked', 'super_admin_granted', 'role_change')
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- SUMMARY: Count of each audit category
-- ============================================
SELECT 
    'Performance Edits' AS category,
    COUNT(*) AS event_count
FROM data_edit_audit WHERE table_name = 'investor_fund_performance'
UNION ALL
SELECT 'AUM Edits', COUNT(*) FROM data_edit_audit WHERE table_name = 'fund_daily_aum'
UNION ALL
SELECT 'Withdrawal Actions', COUNT(*) FROM audit_log WHERE entity = 'withdrawal_requests'
UNION ALL
SELECT 'Fee Applications', COUNT(*) FROM fee_allocations
UNION ALL
SELECT 'Report Sends', COUNT(*) FROM email_logs WHERE template ILIKE '%statement%' OR template ILIKE '%report%'
UNION ALL
SELECT 'Report Regenerations', COUNT(*) FROM report_change_log
UNION ALL
SELECT 'Admin Role Changes', COUNT(*) FROM audit_log WHERE entity = 'profiles' AND action ILIKE '%admin%';
