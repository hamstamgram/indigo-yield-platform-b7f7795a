# Email Delivery State Machine

## Generated: 2024-12-22

## State Diagram

```
                    ┌─────────────┐
                    │   queued    │ ◄─────────────────────┐
                    └──────┬──────┘                       │
                           │                              │
                           │ send_via_mailersend          │ retry
                           ▼                              │
                    ┌─────────────┐                       │
                    │   sending   │                       │
                    └──────┬──────┘                       │
                           │                              │
              ┌────────────┼────────────┐                 │
              │            │            │                 │
              ▼            ▼            ▼                 │
       ┌──────────┐  ┌──────────┐  ┌──────────┐          │
       │   sent   │  │  failed  │──┼──────────┘          │
       └────┬─────┘  └──────────┘                        │
            │                                            │
            │ webhook/poll                               │
            ▼                                            │
     ┌─────────────┐                                     │
     │  delivered  │                                     │
     └─────────────┘                                     │
                                                         │
     ┌─────────────┐                                     │
     │  cancelled  │ ◄───── cancel (from queued/failed)  │
     └─────────────┘                                     │
                                                         │
     ┌─────────────┐                                     │
     │   bounced   │ ◄───── webhook                      │
     └─────────────┘                                     │
                                                         │
     ┌─────────────┐                                     │
     │ complained  │ ◄───── webhook                      │
     └─────────────┘                                     │
                                                         │
     ┌─────────────┐                                     │
     │   skipped   │ ◄───── no email / already sent      │
     └─────────────┘
```

## State Transitions

| From | To | Trigger |
|------|-----|---------|
| `queued` | `sending` | `send-report-mailersend` function invoked |
| `sending` | `sent` | MailerSend API returns success |
| `sending` | `failed` | MailerSend API returns error |
| `sent` | `delivered` | Webhook or status poll confirms delivery |
| `sent` | `bounced` | Webhook reports bounce |
| `sent` | `complained` | Webhook reports spam complaint |
| `failed` | `queued` | `retry_delivery` RPC called |
| `queued` | `cancelled` | `cancel_delivery` RPC called |
| `failed` | `cancelled` | `cancel_delivery` RPC called |
| `sending` | `queued` | `requeue_stale_sending` (stuck > 15 min) |
| - | `skipped` | No email address or already sent |

## Audit Fields

Each transition updates:
- `status`: New state
- `updated_at`: Timestamp
- `attempt_count`: Incremented on send attempts
- `last_attempt_at`: Timestamp of last attempt
- `sent_at`: Set when status becomes 'sent'
- `delivered_at`: Set when status becomes 'delivered'
- `failed_at`: Set when status becomes 'failed'
- `error_message`: Error details if failed
- `error_code`: Error code if available
- `provider_message_id`: MailerSend message ID
