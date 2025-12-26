# Audit Events Documentation

## Overview

All auditable events are tracked in either:
- `audit_log` - General audit trail for entity changes
- `data_edit_audit` - Specific audit for data edits (performance, AUM)
- `report_change_log` - Audit trail for report regeneration

---

## 1. Yield/Performance Data Edits

**Table:** `data_edit_audit`  
**Trigger:** `audit_investor_fund_performance_trigger`  
**Function:** `audit_investor_fund_performance_changes()`

**Source Files:**
- Migration: `supabase/migrations/20251220233931_*.sql`
- Service: `src/services/shared/performanceDataService.ts:45-80`

**Tracked Fields:**
- `table_name`: 'investor_fund_performance'
- `record_id`: The performance record UUID
- `old_data`: Previous values (JSON)
- `new_data`: New values (JSON)
- `changed_fields`: Array of modified column names
- `edited_by`: Admin user UUID
- `edit_source`: 'admin_editor' or 'database_trigger'

---

## 2. AUM Edits

**Table:** `data_edit_audit`  
**Manual logging via:** `src/services/shared/aumEditService.ts`

**Tracked Fields:**
- `table_name`: 'fund_daily_aum'
- `old_data` / `new_data`: Before/after values
- `edit_source`: 'admin_aum_editor'

---

## 3. Withdrawal Approvals/Rejections

**Table:** `audit_log`  
**Source:** `src/routes/admin/AdminWithdrawalsPage.tsx:~80-120`

**Event Types:**
- `withdrawal_approved`
- `withdrawal_rejected`

**Tracked Data:**
- `entity`: 'withdrawal_requests'
- `entity_id`: Withdrawal request UUID
- `action`: 'approved' or 'rejected'
- `actor_user`: Admin who performed action
- `old_values`: Previous status
- `new_values`: New status + notes

---

## 4. Fee Application

**Table:** `fee_allocations` (self-auditing with timestamps)  
**Additional:** `audit_log` for manual fee adjustments

**Source:** `src/services/yield/feeAllocationService.ts`

**Tracked:**
- `created_by`: Admin who applied fees
- `created_at`: Timestamp
- `distribution_id`: Links to yield distribution batch

---

## 5. Report Send Events

**Table:** `email_logs`  
**Source:** `supabase/functions/send-investor-report/index.ts`

**Tracked Fields:**
- `recipient`: Email address
- `subject`: Email subject
- `template`: 'investor_statement'
- `status`: 'sent', 'delivered', 'failed'
- `sent_at`: Timestamp
- `metadata`: Contains investor_id, period_id, report_type

---

## 6. Report Regeneration

**Table:** `report_change_log`  
**Source:** `src/services/core/reportUpsertService.ts:87-110`

**Tracked Fields:**
- `report_id`: Statement/report UUID
- `report_table`: 'generated_statements' or 'generated_reports'
- `changed_by`: Admin user UUID
- `previous_html_hash`: Hash of old content
- `previous_pdf_url`: Old PDF URL
- `change_reason`: Description of change
- `changed_at`: Timestamp

---

## 7. Admin Role Changes

**Table:** `audit_log`  
**Source:** `src/routes/admin/settings/AdminUsersPage.tsx`

**Event Types:**
- `admin_role_granted`
- `admin_role_revoked`
- `super_admin_granted`

**Tracked:**
- `entity`: 'profiles'
- `entity_id`: User UUID
- `action`: Role change type
- `old_values`: Previous role flags
- `new_values`: New role flags

---

## Sample Queries

See `evidence_pack/sql/audit_sample_queries.sql` for queries to retrieve audit events.
