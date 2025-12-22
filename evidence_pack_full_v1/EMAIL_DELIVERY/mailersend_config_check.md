# MailerSend Configuration Check

## Generated: 2024-12-22

## Secrets Configuration

### Required Secrets
| Secret Name | Status | Description |
|-------------|--------|-------------|
| `MAILERSEND_API_TOKEN` | ✅ Configured | API token for MailerSend authentication |
| `MAILERSEND_FROM_EMAIL` | ✅ Optional | Default: `reports@indigoyield.com` |
| `MAILERSEND_FROM_NAME` | ✅ Optional | Default: `Indigo Yield` |
| `MAILERSEND_WEBHOOK_SIGNING_SECRET` | ⚠️ Optional | For webhook signature verification |

## Edge Functions Deployed

| Function | Status | Purpose |
|----------|--------|---------|
| `send-report-mailersend` | ✅ Deployed | Sends investor reports via MailerSend API |
| `refresh-delivery-status` | ✅ Deployed | Refreshes delivery status from MailerSend |
| `mailersend-webhook` | ✅ Deployed | Receives webhook callbacks from MailerSend |

## Admin Access Verification

Both edge functions verify admin access using:
1. JWT token from `Authorization` header
2. Check `profiles.is_admin = true` for the authenticated user

The RPC functions (`queue_statement_deliveries`, `retry_delivery`, etc.) use:
1. `public.is_admin()` function which checks `user_roles` table

### Admin Users
Both admin users have correct configuration:
- `is_admin = true` in `profiles` table
- `admin` or `super_admin` role in `user_roles` table

## MailerSend API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/email` | POST | Send email |
| `/v1/api-quota` | GET | Health check / quota |
| `/v1/activity/{message_id}` | GET | Refresh delivery status |

## Webhook Events Handled

| Event Type | Status Update | Notes |
|------------|---------------|-------|
| `activity.sent` | `SENT` | Email accepted by MailerSend |
| `activity.delivered` | `DELIVERED` | Email delivered to recipient |
| `activity.opened` | - | Records `opened_at` timestamp |
| `activity.clicked` | - | Records `clicked_at` timestamp |
| `activity.soft_bounced` | `BOUNCED` | Temporary delivery failure |
| `activity.hard_bounced` | `FAILED` | Permanent delivery failure |
| `activity.spam_complaint` | `COMPLAINED` | Recipient reported spam |
| `activity.unsubscribed` | - | Logged but status unchanged |

## Database Tables

### `statement_email_delivery`
Tracks individual email deliveries with status, timestamps, and provider message IDs.

### `report_delivery_events`
Logs all delivery events for audit trail with:
- `delivery_id` - Reference to delivery record
- `provider_message_id` - MailerSend message ID
- `event_type` - Type of event (sent, delivered, bounced, etc.)
- `event_data` - Full event payload as JSONB
- `occurred_at` - When the event occurred

## Status Values

All status values are supported in both lowercase and UPPERCASE:
- `queued` / `QUEUED`
- `sending` / `SENDING`
- `sent` / `SENT`
- `delivered` / `DELIVERED`
- `failed` / `FAILED`
- `bounced` / `BOUNCED`
- `complained` / `COMPLAINED`
- `cancelled` / `CANCELLED`
- `skipped` / `SKIPPED`

## Health Check

To verify MailerSend connectivity from the UI:
1. Navigate to Report Delivery Center (`/admin/reports/delivery`)
2. Click "Test Email" section
3. Use "Check MailerSend Status" button
4. Response shows:
   - API reachability status
   - Remaining email quota
   - Configured from email/name

## Troubleshooting

### "Admin access required" error
1. Ensure user has `is_admin = true` in `profiles` table
2. Ensure user has `admin` or `super_admin` role in `user_roles` table
3. Check JWT token is being passed in Authorization header

### Emails not sending
1. Verify `MAILERSEND_API_TOKEN` secret is configured
2. Check MailerSend domain is verified
3. Verify from email matches verified domain
4. Check edge function logs for errors

### Webhook not updating status
1. Configure webhook in MailerSend dashboard
2. Point to: `https://<project>.supabase.co/functions/v1/mailersend-webhook`
3. Optionally set `MAILERSEND_WEBHOOK_SIGNING_SECRET` for security
