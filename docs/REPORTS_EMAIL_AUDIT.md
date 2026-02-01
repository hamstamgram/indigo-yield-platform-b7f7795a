# Reports & Email Delivery Pipeline Audit

> **Date**: 2026-02-01
> **Scope**: Report generation, email delivery, statement pipeline
> **Status**: Audit complete — recommendations only (no code changes to email templates)

---

## CTO Perspective: Architecture & Reliability

### Report Generation Pipeline

The platform uses a **synchronous-first** generation model:

| Generator | File | Lines | Pattern |
|-----------|------|-------|---------|
| HTML/Email | `services/reports/emailReportGenerator.ts` | ~508 | Sync string concatenation, returns HTML string |
| PDF | `services/reports/pdfGenerator.ts` | ~694 | Async (image fetching), class-based with page tracking |
| Excel | `services/reports/excelGenerator.ts` | ~669 | Sync worksheet builder, class-based |
| CSV | `services/api/reportsApi.ts` | inline | Simple transaction flattening |

**Edge Function reliability**: Email sending is delegated to the `send-email` Supabase Edge Function via `lib/email.ts`. The Edge Function is invoked per-email with no batching. Failures are terminal — the UI marks the delivery as `FAILED` and moves on.

**Concern**: For bulk sends (100+ investors), a single Edge Function timeout or Resend API hiccup can silently fail a subset of deliveries with no automatic recovery.

### Delivery Status Machine

The `ReportDeliveryCenter` (~986 lines) implements an 11-status delivery model:

```
QUEUED → SENDING → SENT → DELIVERED
                 ↘ FAILED
                 ↘ BOUNCED
         CANCELLED
         SKIPPED
         DRAFT
         PENDING
         OPENED
```

**Completeness**: The status set is comprehensive. However, transitions are enforced only at the UI/service layer — no database-level state machine constraints exist. A direct `statement_email_delivery` update could set an invalid transition (e.g., `DELIVERED` → `QUEUED`).

### Retry Logic & "Unstick" Mechanism

| Mechanism | Location | Trigger | Behavior |
|-----------|----------|---------|----------|
| Manual retry | `ReportDeliveryCenter` button | User click | Re-queues single failed delivery |
| Bulk retry | "Retry All Failed" button | User click | Re-queues all `FAILED` deliveries |
| Unstick | "Unstick Sending" button | User click | Resets `SENDING` records older than 15 minutes back to `QUEUED` |

**Gap**: There is **no automatic retry**. If the admin doesn't notice failures, they persist indefinitely. Recommended: implement a 3-attempt exponential backoff retry within the delivery queue processor, with a dead-letter status after exhaustion.

### Rate Limiting & Queue Management

- **Resend trial limit**: 100 emails/day (informational banner shown in UI, not enforced in code)
- **No server-side rate limiter** for email sending — the UI sends as fast as the Edge Function can respond
- **No queue table**: Delivery records in `statement_email_delivery` serve double duty as both tracking and queue state
- **No concurrency control**: Multiple admins can trigger bulk sends simultaneously

**Recommendation**: Add a server-side rate limiter (e.g., 10 emails/second) and a mutex/lock mechanism for bulk operations.

### Error Handling Gaps in `emailReportGenerator.ts`

1. **Silent null returns**: Generation failures return `null` with a `logError` call but no structured error propagation. Callers must null-check every result.
2. **No input validation**: Missing investor data (no positions, no performance records) produces empty sections rather than failing fast.
3. **CDN dependency**: Fund icons are hardcoded CDN URLs (Lines 5-18). CDN downtime = broken email renders.
4. **No template versioning**: Changes to the HTML template affect all future and in-flight emails with no rollback capability.

### Hardcoded `FUND_ICON_MAP` vs `ASSET_CONFIGS`

The email generator maintains its own `FUND_ICON_MAP` (6 entries) mapping asset symbols to CDN URLs. This diverges from the centralized `ASSET_CONFIGS` in `@/types/asset.ts` used by the frontend `CryptoIcon` component.

| Source | Assets Covered | Location |
|--------|---------------|----------|
| `FUND_ICON_MAP` (email) | BTC, ETH, SOL, USDT, XAUT, EURC | `emailReportGenerator.ts:5-18` |
| `ASSET_CONFIGS` (frontend) | BTC, ETH, SOL, USDT, XAUT, EURC, XRP | `types/asset.ts` |

**Missing in email**: XRP has no icon in email templates. When an XRP fund statement is generated, it falls back to `default-fund-icon.png`.

**Recommendation**: Consolidate to a single asset registry. Email templates should reference `ASSET_CONFIGS` or a shared database table rather than maintaining a parallel map.

---

## CFO Perspective: Data Accuracy & Compliance

### Report Data Sourcing

Investor reports pull from **live data**, not point-in-time snapshots:

| Data Point | Source Table/View | Freshness |
|------------|------------------|-----------|
| Position balances | `investor_positions` (live) | Real-time |
| Fund performance | `investor_fund_performance` | Period-end snapshot |
| Transaction history | `transactions_v2` | Real-time |
| Fee calculations | `fee_allocations` | Period-end |

**Accuracy concern**: `investor_positions.current_value` is a live aggregate. If a report is generated mid-day while a deposit is being processed, the balance shown may not match the period-end figure. The `investor_fund_performance` table provides the authoritative period-end snapshot, but the position data shown alongside it is live.

**Recommendation**: Reports should exclusively use `investor_fund_performance` data for period-end figures. Live position data should only appear in "current portfolio" views, not historical statements.

### Statement Period Logic & Date Boundaries

Periods are managed via the `statement_periods` table:

```
statement_periods: { year, month, period_name, status, finalized_at }
```

- **Period creation**: Manual via admin UI
- **Finalization**: Locks the period from further yield distributions or edits
- **Boundary**: Calendar month (1st to last day)

**Gap**: There is no automated period creation. If the admin forgets to create a period, statements for that month cannot be generated. Consider adding automatic period creation on the 1st of each month.

### Fee Display Accuracy

- **Management fees**: Displayed from `investor_fund_performance.mgmt_fees` (period-end calculation)
- **Performance fees**: Displayed from `investor_fund_performance.perf_fees`
- **IB commissions**: Not displayed on investor statements (by design — commissions are an internal cost)

**Verified**: Fee amounts are sourced from the canonical `fee_allocations` table via the performance calculation pipeline, not computed at render time. This is correct.

### Audit Trail: `statement_email_delivery` Tracking

Each email delivery creates a record:

```sql
statement_email_delivery: {
  id, statement_id, investor_id, period_id,
  delivery_mode, status, recipient_email,
  sent_at, delivered_at, failed_at,
  error_message, attempt_count,
  resend_message_id, created_at, updated_at
}
```

**Completeness**: The schema tracks the full lifecycle. However:

1. **No delivery confirmation webhooks**: The `delivered_at` field is only populated when an admin manually clicks "Refresh Status" to poll the Resend API. Without webhooks, `SENT` status may never advance to `DELIVERED` or `BOUNCED`.
2. **No open tracking**: The `OPENED` status exists in the enum but is never populated (Resend webhook integration not implemented).
3. **No click tracking**: Not implemented.

**Recommendation**: Implement Resend webhooks to automatically update delivery status. This is critical for compliance — regulators may require proof of delivery, not just proof of sending.

### Data Retention & Archival

- **Generated statements**: Stored in `generated_statements` table indefinitely
- **Email delivery records**: Stored in `statement_email_delivery` indefinitely
- **No archival policy**: Old records accumulate without cleanup
- **No export/backup mechanism** for compliance archives

**Recommendation**: Define a retention policy (e.g., 7 years for financial statements per standard financial regulations). Implement periodic archival to cold storage.

---

## UI Lead Perspective: UX & Design

### InvestorReports Page (~628 lines)

**Current layout**: Single-page tab interface with summary cards, filter bar, and data table.

**Strengths**:
- URL-persisted filters (month, search, status) survive page refreshes
- Smart preview opens HTML in sanitized new window
- CryptoIcon already used for asset display in table rows
- Multi-email recipient display with primary/verified badges

**Concerns**:
- 628 lines is at the upper bound of maintainable component size
- Performance editor dialog is embedded inline rather than extracted
- No skeleton loading states for initial data fetch

### ReportDeliveryCenter (~986 lines)

This is the most complex component in the admin panel.

**Current responsibilities** (too many for one component):
1. Period selection and summary stats
2. Delivery status table with sorting/filtering
3. Bulk action buttons (Queue, Send, Retry, Unstick)
4. Per-row action buttons (Send, Retry, Cancel, Refresh)
5. Progress bar during bulk operations
6. Visual workflow indicator (Generate → Queue → Send)
7. Resend trial limit warning banner

**Recommended split**:

| Component | Responsibility | Est. Lines |
|-----------|---------------|------------|
| `DeliveryStats` | Summary cards + KPIs | ~80 |
| `DeliveryFilters` | Period selector + search + status filter | ~100 |
| `DeliveryTable` | Sortable table + row actions | ~250 |
| `DeliveryBulkActions` | Queue/Send/Retry/Unstick buttons | ~150 |
| `DeliveryProgressBar` | Batch send progress indicator | ~60 |
| `ReportDeliveryCenter` | Orchestrator (state + hooks) | ~200 |

### Delivery Status Visualization

**Current**: Color-coded badges with icons per status. The visual workflow indicator (3-step: Generate → Queue → Send) provides good high-level context.

**Improvement opportunities**:
- Add a timeline/Gantt view for bulk send operations showing per-investor delivery progress
- Show delivery attempt history inline (currently requires clicking into details)
- Add "time since sent" indicators for stuck `SENDING` records

### Bulk Operations UX

**Current flow**: Select All → Click Action → Watch Progress Bar

**Concerns**:
1. No confirmation dialog before bulk send (immediate execution)
2. No undo mechanism for "Queue Remaining" action
3. Progress bar shows count but no ETA or individual status
4. No way to pause a running bulk operation

**Recommendation**: Add a confirmation dialog with recipient count before bulk sends. Show per-investor status during execution (expandable progress view).

### Error State Presentation

**Current**: Toast notifications for individual errors. Failed deliveries show red badge in table.

**Improvement opportunities**:
- Group related failures (e.g., "12 emails failed: Resend rate limit exceeded") instead of 12 individual toasts
- Show error message in table tooltip on hover over failed badge
- Add a "Failed Deliveries" summary card with one-click "Retry All"

### Filter & Search Capabilities

**Current**: Period selector, status filter, investor name search.

**Missing**:
- Filter by fund (useful when sending fund-specific statements)
- Filter by delivery mode (email vs. other future modes)
- Date range filter for delivery attempts
- Export filtered results to CSV for audit purposes

---

## Summary of Recommendations

### Priority 1 (Address Soon)
- [ ] Implement Resend webhook integration for delivery status updates
- [ ] Add automatic retry (3 attempts, exponential backoff) for failed deliveries
- [ ] Add XRP icon to `FUND_ICON_MAP` in email templates
- [ ] Add confirmation dialog before bulk email sends

### Priority 2 (Medium Term)
- [ ] Refactor `ReportDeliveryCenter` into 5-6 sub-components
- [ ] Consolidate `FUND_ICON_MAP` and `ASSET_CONFIGS` into single source
- [ ] Add server-side rate limiting for email sends
- [ ] Implement automatic statement period creation

### Priority 3 (Long Term)
- [ ] Define and implement data retention/archival policy
- [ ] Move from UI-triggered bulk sends to cron-based background job
- [ ] Add delivery analytics dashboard (open rates, bounce rates)
- [ ] Ensure reports use period-end snapshots exclusively (not live positions)
