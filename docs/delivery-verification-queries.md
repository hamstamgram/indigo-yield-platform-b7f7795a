# Report Delivery System - Verification Queries

Use these SQL queries to verify the report delivery system is working correctly.

## 1. Check Delivery Status Distribution

```sql
-- Overview of delivery statuses for the current/latest period
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM statement_email_delivery
WHERE period_id = (
  SELECT id FROM statement_periods 
  ORDER BY year DESC, month DESC 
  LIMIT 1
)
GROUP BY status
ORDER BY count DESC;
```

## 2. Check Delivery Stats (matches RPC)

```sql
-- Comprehensive stats for a period
SELECT 
  COUNT(*) FILTER (WHERE status ILIKE 'queued') as queued,
  COUNT(*) FILTER (WHERE status ILIKE 'sending') as sending,
  COUNT(*) FILTER (WHERE status ILIKE 'sent') as sent,
  COUNT(*) FILTER (WHERE status ILIKE 'failed') as failed,
  COUNT(*) FILTER (WHERE status ILIKE 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE status ILIKE 'skipped') as skipped,
  MIN(created_at) FILTER (WHERE status ILIKE 'queued') as oldest_queued_at,
  COUNT(*) FILTER (
    WHERE status ILIKE 'sending' 
    AND updated_at < NOW() - INTERVAL '15 minutes'
  ) as stuck_sending
FROM statement_email_delivery
WHERE period_id = (
  SELECT id FROM statement_periods 
  ORDER BY year DESC, month DESC 
  LIMIT 1
);
```

## 3. Check Failed Deliveries with Errors

```sql
-- List failed deliveries with error details
SELECT 
  sed.recipient_email,
  p.first_name || ' ' || p.last_name as investor_name,
  sed.error_code,
  sed.error_message,
  sed.attempt_count,
  sed.failed_at,
  sed.created_at
FROM statement_email_delivery sed
LEFT JOIN profiles p ON p.id = sed.investor_id
WHERE sed.status ILIKE 'failed'
  AND sed.period_id = (
    SELECT id FROM statement_periods 
    ORDER BY year DESC, month DESC 
    LIMIT 1
  )
ORDER BY sed.failed_at DESC
LIMIT 20;
```

## 4. Check Delivery Audit Trail

```sql
-- Recent audit log entries for deliveries
SELECT 
  action,
  delivery_id,
  old_status,
  new_status,
  note,
  created_at,
  created_by
FROM report_delivery_audit
ORDER BY created_at DESC
LIMIT 50;
```

## 5. Check Investors Without Deliveries

```sql
-- Investors who have statements but no delivery records
SELECT 
  gs.investor_id,
  p.first_name || ' ' || p.last_name as investor_name,
  p.email,
  gs.created_at as statement_created
FROM generated_statements gs
LEFT JOIN statement_email_delivery sed ON sed.statement_id = gs.id
LEFT JOIN profiles p ON p.id = gs.investor_id
WHERE gs.period_id = (
  SELECT id FROM statement_periods 
  ORDER BY year DESC, month DESC 
  LIMIT 1
)
  AND sed.id IS NULL
ORDER BY p.first_name, p.last_name;
```

## 6. Check Delivery Processing Times

```sql
-- Average time from queued to sent
SELECT 
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) / 60 as avg_minutes_to_send,
  MIN(EXTRACT(EPOCH FROM (sent_at - created_at))) / 60 as min_minutes,
  MAX(EXTRACT(EPOCH FROM (sent_at - created_at))) / 60 as max_minutes,
  COUNT(*) as sent_count
FROM statement_email_delivery
WHERE status ILIKE 'sent'
  AND sent_at IS NOT NULL
  AND period_id = (
    SELECT id FROM statement_periods 
    ORDER BY year DESC, month DESC 
    LIMIT 1
  );
```

## 7. Check Statement Generation Coverage

```sql
-- Statements per period
SELECT 
  sp.period_name,
  COUNT(DISTINCT gs.id) as statements_generated,
  COUNT(DISTINCT gs.investor_id) as unique_investors,
  COUNT(DISTINCT sed.id) as delivery_records,
  COUNT(DISTINCT sed.id) FILTER (WHERE sed.status ILIKE 'sent') as delivered
FROM statement_periods sp
LEFT JOIN generated_statements gs ON gs.period_id = sp.id
LEFT JOIN statement_email_delivery sed ON sed.period_id = sp.id
GROUP BY sp.id, sp.period_name, sp.year, sp.month
ORDER BY sp.year DESC, sp.month DESC
LIMIT 6;
```

## 8. Check for Duplicate Deliveries

```sql
-- Find duplicate delivery records (same investor, period, channel)
SELECT 
  investor_id,
  period_id,
  channel,
  COUNT(*) as count
FROM statement_email_delivery
GROUP BY investor_id, period_id, channel
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

## 9. End-to-End Verification Checklist

### Manual Testing Flow:
1. Navigate to `/admin/investor-reports`
2. Select a period and click "Generate Reports"
3. Click "Delivery Center" link
4. Click "Queue Remaining Statements"
5. Verify queued count increases
6. Click "Send Queued Now"
7. Check Edge Function logs for processing
8. Verify sent count increases
9. Check System Health page for delivery metrics

### Database Verification:
```sql
-- Quick health check
SELECT 
  'Delivery Records' as metric,
  COUNT(*) as value
FROM statement_email_delivery
UNION ALL
SELECT 
  'Successful Deliveries',
  COUNT(*) FILTER (WHERE status ILIKE 'sent')
FROM statement_email_delivery
UNION ALL
SELECT 
  'Failed Deliveries',
  COUNT(*) FILTER (WHERE status ILIKE 'failed')
FROM statement_email_delivery
UNION ALL
SELECT 
  'Audit Log Entries',
  COUNT(*)
FROM report_delivery_audit;
```

## 10. Check Email Log Integration

```sql
-- Verify emails are being logged
SELECT 
  recipient,
  subject,
  status,
  template,
  sent_at,
  error
FROM email_logs
WHERE template ILIKE '%statement%' 
   OR subject ILIKE '%statement%'
ORDER BY created_at DESC
LIMIT 20;
```
