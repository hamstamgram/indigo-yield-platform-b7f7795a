

# Resend Email Infrastructure Audit -- Results & Remediation Plan

## Audit Summary: Resend Migration is COMPLETE (functionally), but has naming debt

### Finding 1: Zero MailerSend API/SDK References -- PASS
No `MAILERSEND_API_KEY`, `api.mailersend.com`, or MailerSend SDK imports exist anywhere in Edge Functions. All 9 email-sending functions use `RESEND_API_KEY` and call `https://api.resend.com/emails`. The webhook function (`mailersend-webhook`) uses `RESEND_WEBHOOK_SIGNING_SECRET` and validates `resend-signature` headers with HMAC-SHA256. The migration to Resend is functionally complete.

### Finding 2 (P2 -- Naming Debt): Legacy "mailersend" Names Persist
The migration swapped internals but kept old names. This creates confusion for any new developer or auditor:

| Artifact | Current Name | Should Be |
|----------|-------------|-----------|
| Edge Function directory | `send-report-mailersend/` | `send-report-email/` or `send-report-resend/` |
| Edge Function directory | `mailersend-webhook/` | `resend-webhook/` |
| Frontend method | `deliveryService.sendViaMailerSend()` | `deliveryService.sendViaResend()` |
| Frontend invocations | `supabase.functions.invoke("send-report-mailersend")` (4 call sites) | Updated name |
| Doc references | 7 files reference "mailersend" in function names | Update to match |

**Call sites referencing old names:**
- `src/services/admin/deliveryService.ts` -- method name + invoke call
- `src/services/admin/reports/email.ts` -- invoke call
- `src/services/core/systemHealthService.ts` -- invoke call
- `src/features/admin/reports/hooks/useDeliveryMutations.ts` -- method call (x2)
- `src/types/domains/delivery.ts` -- comment

### Finding 3: Resend SDK Import (P3 -- Minor)
`send-notification-email/deno.json` imports `npm:resend@2.0.0` and uses the Resend class. All other functions use raw `fetch()` to `api.resend.com`. This inconsistency is harmless but worth noting -- the SDK adds bundle weight vs a simple fetch call.

### Finding 4: Cron Job for Monthly Reports -- PASS
Job 5 (`0 23 28-31 * *`) correctly invokes `monthly-report-scheduler` with the current anon key. The scheduler triggers `generate-fund-performance` and `process-report-delivery-queue`, both of which use Resend. No stale keys.

### Finding 5: Webhook Signature Verification -- PASS
`mailersend-webhook/index.ts` (despite the name) correctly validates Resend's `resend-signature` header using HMAC-SHA256 with `RESEND_WEBHOOK_SIGNING_SECRET`. The Resend event types (`email.sent`, `email.delivered`, `email.bounced`, etc.) are properly typed.

---

## Implementation Plan

### Step 1: Rename `send-report-mailersend` Edge Function
- Create `supabase/functions/send-report-email/index.ts` with the exact same content as `send-report-mailersend/index.ts`
- Delete `supabase/functions/send-report-mailersend/`
- Update 3 frontend call sites to invoke `"send-report-email"` instead of `"send-report-mailersend"`

### Step 2: Rename `mailersend-webhook` Edge Function
- Create `supabase/functions/resend-webhook/index.ts` with the exact same content
- Delete `supabase/functions/mailersend-webhook/`
- Update Resend dashboard webhook URL (user action -- must be communicated)

### Step 3: Rename Frontend Method
- `deliveryService.sendViaMailerSend()` becomes `deliveryService.sendViaResend()`
- Update 2 call sites in `useDeliveryMutations.ts`

### Step 4: Update Documentation
- `docs/flows/STATEMENT_FLOW.md` -- update function names
- `docs/SECURITY_REVIEW.md` -- update function references
- `docs/PLATFORM_FLOWCHARTS.md` -- update sequence diagram (also fix "MailerSend API" label to "Resend API")

### Risk Note
Renaming Edge Functions means the old function URLs stop working immediately on deploy. The webhook URL in the Resend dashboard must be updated BEFORE or simultaneously with the rename of `mailersend-webhook`. The frontend changes for `send-report-mailersend` must deploy in the same push as the function rename.

