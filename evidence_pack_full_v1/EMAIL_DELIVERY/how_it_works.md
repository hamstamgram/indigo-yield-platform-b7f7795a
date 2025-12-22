# Email Delivery System - How It Works

## Generated: 2024-12-22

## Overview

The email delivery system uses MailerSend as the single provider for sending investor reports. All test email functionality has been removed. Every email send creates a tracking record BEFORE attempting delivery.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Report Generation                               │
├─────────────────────────────────────────────────────────────────────┤
│  generate_period_statements RPC                                      │
│       ↓                                                              │
│  generated_statements (one per investor per period)                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Delivery Queue                                  │
├─────────────────────────────────────────────────────────────────────┤
│  queue_statement_deliveries RPC                                      │
│       ↓                                                              │
│  statement_email_delivery (status: QUEUED)                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Email Sending                                   │
├─────────────────────────────────────────────────────────────────────┤
│  send-report-mailersend (single)                                     │
│  process-report-delivery-queue (batch)                               │
│       ↓                                                              │
│  MailerSend API                                                      │
│       ↓                                                              │
│  statement_email_delivery (status: SENT/FAILED)                      │
│  report_delivery_events (audit log)                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Webhook Updates                                 │
├─────────────────────────────────────────────────────────────────────┤
│  mailersend-webhook (public endpoint)                                │
│       ↓                                                              │
│  statement_email_delivery (status: DELIVERED/OPENED/BOUNCED/FAILED) │
│  report_delivery_events (audit log)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Edge Functions

| Function | Purpose | Auth Required | Provider |
|----------|---------|---------------|----------|
| `send-report-mailersend` | Send single report | Yes (admin) | MailerSend |
| `process-report-delivery-queue` | Batch send queued | Yes (admin) | MailerSend |
| `mailersend-webhook` | Receive status updates | No (public) | MailerSend |
| `refresh-delivery-status` | Manual status refresh | Yes (admin) | MailerSend |

## Status Flow

```
QUEUED → SENDING → SENT → DELIVERED
                      ↘
                    OPENED
                      ↘
                    CLICKED
           ↘
         FAILED
           ↘
         BOUNCED
           ↘
         COMPLAINED
```

## Key Tables

### `statement_email_delivery`
Primary tracking table for all email deliveries.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| statement_id | uuid | FK to generated_statements |
| investor_id | uuid | FK to profiles |
| period_id | uuid | FK to statement_periods |
| recipient_email | text | Email address |
| status | text | QUEUED, SENDING, SENT, DELIVERED, FAILED, BOUNCED, etc. |
| provider | text | Always 'mailersend' |
| provider_message_id | text | MailerSend message ID |
| delivery_mode | text | email_html, pdf_attachment, link_only, hybrid |
| sent_at | timestamptz | When email was sent |
| delivered_at | timestamptz | When confirmed delivered |
| attempt_count | int | Number of send attempts |
| error_message | text | Last error if failed |

### `report_delivery_events`
Audit log of all delivery events.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| delivery_id | uuid | FK to statement_email_delivery |
| event_type | text | sent, delivered, opened, clicked, bounced, failed |
| provider_message_id | text | MailerSend message ID |
| event_data | jsonb | Full event payload |
| occurred_at | timestamptz | When event occurred |

## Delivery Record Creation Order

**CRITICAL**: Delivery records are ALWAYS created BEFORE sending emails.

1. When called with `investor_id + period_id`:
   - Check for existing delivery record
   - If none exists, INSERT new record with status `QUEUED`
   - Only then attempt to send via MailerSend
   - Update status to `SENT` or `FAILED` based on result

2. When called with `delivery_id`:
   - Fetch existing delivery record
   - Update status to `SENDING`
   - Attempt to send via MailerSend
   - Update status to `SENT` or `FAILED` based on result

This ensures there is NEVER an email sent without a tracking record.

## Verification SQL Queries

### Check Delivery Tracking Consistency

```sql
-- Artifacts vs Deliveries reconciliation
SELECT 
  sp.period_name,
  (SELECT COUNT(*) FROM generated_statements gs WHERE gs.period_id = sp.id) as statements_generated,
  (SELECT COUNT(*) FROM statement_email_delivery sed 
   WHERE sed.period_id = sp.id 
   AND sed.status NOT IN ('cancelled', 'CANCELLED', 'skipped', 'SKIPPED')) as deliveries_tracked,
  (SELECT COUNT(*) FROM statement_email_delivery sed 
   WHERE sed.period_id = sp.id 
   AND sed.status IN ('SENT', 'DELIVERED', 'sent', 'delivered')) as sent_or_delivered,
  (SELECT COUNT(*) FROM statement_email_delivery sed 
   WHERE sed.period_id = sp.id 
   AND sed.status IN ('FAILED', 'BOUNCED', 'failed', 'bounced')) as failed_or_bounced,
  (SELECT COUNT(*) FROM statement_email_delivery sed 
   WHERE sed.period_id = sp.id 
   AND sed.status IN ('QUEUED', 'queued')) as still_queued
FROM statement_periods sp
ORDER BY sp.year DESC, sp.month DESC;
```

### Check for Orphaned Sends (emails sent without tracking)

```sql
-- Should return 0 rows if system is working correctly
SELECT 
  el.id as email_log_id,
  el.recipient,
  el.sent_at,
  el.message_id
FROM email_logs el
LEFT JOIN statement_email_delivery sed ON el.message_id = sed.provider_message_id
WHERE el.template = 'investor_report'
  AND sed.id IS NULL
  AND el.sent_at > NOW() - INTERVAL '30 days';
```

### Check Delivery Status Distribution

```sql
SELECT 
  UPPER(status) as status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM statement_email_delivery
GROUP BY UPPER(status)
ORDER BY count DESC;
```

### Check Provider Distribution

```sql
-- Should show 100% mailersend
SELECT 
  COALESCE(provider, 'unknown') as provider,
  COUNT(*) as count
FROM statement_email_delivery
WHERE sent_at IS NOT NULL
GROUP BY provider;
```

### Check for Stuck Deliveries

```sql
-- Deliveries stuck in SENDING for more than 10 minutes
SELECT 
  id,
  investor_id,
  recipient_email,
  status,
  updated_at,
  NOW() - updated_at as stuck_duration
FROM statement_email_delivery
WHERE status IN ('SENDING', 'sending')
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

### Check Recent Delivery Events

```sql
SELECT 
  rde.event_type,
  rde.occurred_at,
  rde.provider_message_id,
  sed.recipient_email,
  sed.status as current_status
FROM report_delivery_events rde
JOIN statement_email_delivery sed ON rde.delivery_id = sed.id
ORDER BY rde.occurred_at DESC
LIMIT 50;
```

## Admin Access Verification

Both edge functions verify admin access using:

1. JWT token from `Authorization` header
2. Check `user_roles` table for `admin` or `super_admin` role
3. Fallback to `profiles.is_admin = true`

```sql
-- Verify admin users have correct roles
SELECT 
  p.id,
  p.email,
  p.is_admin,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.is_admin = true OR ur.role IN ('admin', 'super_admin');
```

## Secrets Required

| Secret Name | Description |
|-------------|-------------|
| `MAILERSEND_API_TOKEN` | MailerSend API authentication token |
| `MAILERSEND_FROM_EMAIL` | Sender email (default: reports@indigoyield.com) |
| `MAILERSEND_FROM_NAME` | Sender name (default: Indigo Yield) |
| `MAILERSEND_WEBHOOK_SIGNING_SECRET` | Optional webhook verification |

## Test Email Removal

The `TestEmailSection` component has been removed. All email sending now goes through the production flow with full tracking:

1. ~~Test Email Section~~ - REMOVED
2. Queue Remaining Statements - Creates delivery records
3. Send via MailerSend - Processes queue with tracking

## Idempotency

- Sending same `delivery_id` twice will update existing record, not create duplicate
- `queue_statement_deliveries` RPC skips investors who already have delivery records
- Webhook updates are idempotent (same event processed multiple times has same result)

## Error Handling

1. **MailerSend API errors**: Logged to `error_message`, status set to `FAILED`
2. **Missing statement**: Logged to `error_message`, status set to `FAILED`
3. **Missing investor email**: Logged to `error_message`, status set to `SKIPPED`
4. **Network errors**: Logged, can be retried via `retry_delivery` RPC

## Webhook Configuration

Configure MailerSend webhook to point to:
```
https://<project-id>.supabase.co/functions/v1/mailersend-webhook
```

Events to enable:
- `activity.sent`
- `activity.delivered`
- `activity.opened`
- `activity.clicked`
- `activity.soft_bounced`
- `activity.hard_bounced`
- `activity.spam_complaint`
