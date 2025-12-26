# Email Delivery Center Schema

## Generated: 2024-12-22

## Tables

### `statement_email_delivery`

Tracks individual email deliveries for investor statements.

```sql
CREATE TABLE statement_email_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID REFERENCES generated_statements(id),
  investor_id UUID REFERENCES profiles(id),
  period_id UUID REFERENCES statement_periods(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  channel TEXT DEFAULT 'email',
  delivery_mode TEXT, -- email_html, pdf_attachment, link_only, hybrid
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  error_code TEXT,
  provider_message_id TEXT,
  provider TEXT DEFAULT 'mailersend',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

### Status Values

| Status | Description |
|--------|-------------|
| `queued` | Awaiting send |
| `sending` | Currently being sent |
| `sent` | Successfully sent to provider |
| `delivered` | Confirmed delivered to recipient |
| `failed` | Send failed |
| `bounced` | Email bounced |
| `complained` | Recipient complained (spam) |
| `cancelled` | Manually cancelled |
| `skipped` | Skipped (no email, already sent, etc.) |

## RPCs

### `queue_statement_deliveries(p_period_id, p_channel)`
Creates delivery records for all investors with statements in a period.

### `get_delivery_stats(p_period_id)`
Returns aggregated stats for a period:
- total, queued, sending, sent, failed, cancelled, skipped
- statements_generated, investors_in_scope
- oldest_queued_at, stuck_sending

### `retry_delivery(p_delivery_id)`
Resets a failed delivery to queued status.

### `cancel_delivery(p_delivery_id)`
Cancels a queued delivery.

### `mark_sent_manually(p_delivery_id, p_note)`
Marks a delivery as sent with a manual note.

### `requeue_stale_sending(p_period_id, p_minutes)`
Requeues deliveries stuck in 'sending' status for too long.

## Edge Functions

### `send-report-mailersend`
Sends a single report via MailerSend API.

Parameters:
- `delivery_id`: UUID of the delivery record
- `delivery_mode`: email_html | pdf_attachment | link_only | hybrid

### `refresh-delivery-status`
Checks MailerSend for updated delivery status.

Parameters:
- `delivery_id`: UUID of the delivery record
