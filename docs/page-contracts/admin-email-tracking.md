# Page Contract: Admin Email Tracking

## Route
- **Path**: `/admin/email-tracking`
- **Component**: `src/pages/admin/EmailTracking.tsx`
- **Guard**: `AdminGuard`

## Purpose
Track statement email deliveries, view delivery events, retry failed sends.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `statement_email_delivery` | Delivery records |
| `report_delivery_events` | Webhook events |
| `generated_statements` | Statement references |
| `profiles` | Recipient details |
| `statement_periods` | Period context |

### Delivery List Query
```sql
SELECT 
  sed.id,
  sed.statement_id,
  sed.investor_id,
  sed.period_id,
  sed.recipient_email,
  sed.subject,
  sed.status,
  sed.sent_at,
  sed.delivered_at,
  sed.opened_at,
  sed.bounced_at,
  sed.error_message,
  sed.retry_count,
  sed.provider_message_id,
  p.name AS investor_name,
  sp.label AS period_label
FROM statement_email_delivery sed
JOIN profiles p ON sed.investor_id = p.id
JOIN statement_periods sp ON sed.period_id = sp.id
ORDER BY sed.created_at DESC;
```

### Delivery Events Query
```sql
SELECT 
  rde.id,
  rde.delivery_id,
  rde.event_type,
  rde.event_data,
  rde.occurred_at,
  rde.provider_message_id
FROM report_delivery_events rde
WHERE rde.delivery_id = $1
ORDER BY rde.occurred_at DESC;
```

---

## Status Workflow
```
PENDING → QUEUED → SENT → DELIVERED
                      ↓
                   BOUNCED
                      ↓
                   FAILED
```

---

## Write Operations

### Retry Send
**RPC**: `retry_statement_delivery`

**Writes**:
1. `statement_email_delivery.status = 'QUEUED'`
2. `statement_email_delivery.retry_count += 1`
3. `statement_email_delivery.error_message = NULL`

### Cancel Send
**RPC**: Direct update

**Writes**:
1. `statement_email_delivery.status = 'CANCELLED'`

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Status | `status` | Multi-select |
| Period | `period_id` | Select |
| Date range | `created_at` | DatePicker |
| Search | `recipient_email`, `investor_name` | Text |

---

## Aggregations
```sql
-- Summary statistics
SELECT 
  COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'QUEUED') AS queued_count,
  COUNT(*) FILTER (WHERE status = 'SENT') AS sent_count,
  COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered_count,
  COUNT(*) FILTER (WHERE status = 'BOUNCED') AS bounced_count,
  COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'DELIVERED')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('SENT', 'DELIVERED', 'BOUNCED')), 0) * 100, 
    1
  ) AS delivery_rate
FROM statement_email_delivery
WHERE period_id = $1;
```

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Timestamps | - | ISO 8601 |
| Rates | 1 | Percentage |
| Counts | 0 | Integer |

---

## Cache Invalidation

### React Query Keys
```typescript
['email-deliveries']
['email-delivery-stats', periodId]
['delivery-events', deliveryId]
```

### Invalidate After
| Operation | Keys to Invalidate |
|-----------|-------------------|
| Retry send | `email-deliveries`, `email-delivery-stats` |
| Cancel send | `email-deliveries`, `email-delivery-stats` |
| Webhook received | `email-deliveries`, `delivery-events` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View deliveries | `is_admin()` | No |
| View events | `is_admin()` | No |
| Retry delivery | `is_admin()` | Yes |
| Cancel delivery | `is_admin()` | Yes |
| Bulk retry | `is_admin()` | Yes |
