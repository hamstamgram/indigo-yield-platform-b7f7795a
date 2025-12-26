# Statement Flow

## Overview
Monthly statement generation and email delivery with tracking.

## Operations

### Generate Statement
**Insert**: generated_statements (investor_id, period_id, html_content)
**Idempotency**: Unique on (investor_id, period_id)
**Preconditions**: Period exists, investor has positions

### Send Statement Email
**Edge Function**: send-report-mailersend
**Insert**: statement_email_delivery
**Tracking**: provider_message_id from MailerSend

### Track Delivery
**Webhook**: mailersend-webhook
**Update**: statement_email_delivery status (SENT → DELIVERED/OPENED/CLICKED)

## Cache Invalidation
```typescript
queryClient.invalidateQueries({ queryKey: ['statements'] });
queryClient.invalidateQueries({ queryKey: ['email-delivery'] });
```

## Status: ✅ PASS
