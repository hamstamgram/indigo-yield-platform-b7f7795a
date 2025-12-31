# Withdrawal Flow Documentation

## Overview

This document describes the canonical withdrawal flow, including state transitions, database operations, and audit trail requirements.

## State Machine

```
┌─────────────┐
│   pending   │ ← Initial state when investor submits request
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌─────────────┐                        ┌─────────────┐
│  approved   │                        │  rejected   │ → Terminal
└──────┬──────┘                        └─────────────┘
       │
       ▼
┌─────────────┐
│ processing  │
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌─────────────┐                        ┌─────────────┐
│  completed  │ → Terminal             │  cancelled  │ → Terminal
└─────────────┘                        └─────────────┘
```

## Valid State Transitions

| From State   | To State    | Actor  | RPC Function                        |
|-------------|-------------|--------|-------------------------------------|
| pending     | approved    | Admin  | `update_withdrawal_status`          |
| pending     | rejected    | Admin  | `update_withdrawal_status`          |
| pending     | cancelled   | Admin  | `cancel_withdrawal_by_admin`        |
| approved    | processing  | Admin  | `update_withdrawal_status`          |
| approved    | cancelled   | Admin  | `cancel_withdrawal_by_admin`        |
| processing  | completed   | Admin  | `update_withdrawal_status`          |
| processing  | cancelled   | Admin  | `cancel_withdrawal_by_admin`        |

## Database Tables

### Primary Table: `withdrawal_requests`

| Column           | Type        | Description                          |
|-----------------|-------------|--------------------------------------|
| id              | UUID        | Primary key                          |
| investor_id     | UUID        | FK to profiles                       |
| fund_id         | UUID        | FK to funds                          |
| amount          | NUMERIC     | Withdrawal amount                    |
| currency        | TEXT        | Asset code (USDC, BTC, etc.)         |
| status          | ENUM        | Current state (see state machine)    |
| requested_at    | TIMESTAMPTZ | When request was created             |
| processed_at    | TIMESTAMPTZ | When processing completed            |
| processed_by    | UUID        | Admin who processed                  |
| notes           | TEXT        | Admin notes                          |
| wallet_address  | TEXT        | Destination wallet                   |
| tx_hash         | TEXT        | Blockchain transaction hash          |

### Audit Table: `withdrawal_audit_logs` (PLURAL - CANONICAL NAME)

| Column           | Type        | Description                          |
|-----------------|-------------|--------------------------------------|
| id              | UUID        | Primary key                          |
| withdrawal_id   | UUID        | FK to withdrawal_requests            |
| action          | ENUM        | Action type (created, approved, etc.)|
| old_status      | TEXT        | Previous status                      |
| new_status      | TEXT        | New status                           |
| performed_by    | UUID        | User who performed action            |
| performed_at    | TIMESTAMPTZ | When action occurred                 |
| notes           | TEXT        | Action notes                         |
| metadata        | JSONB       | Additional context                   |

> ⚠️ **CRITICAL**: The canonical table name is `withdrawal_audit_logs` (PLURAL).
> A compatibility view `withdrawal_audit_log` (singular) exists for backwards compatibility.
> All new code MUST use the plural form.

## RPC Functions

### `cancel_withdrawal_by_admin(p_request_id UUID, p_reason TEXT)`

Cancels a pending/approved/processing withdrawal request.

**Security**: SECURITY DEFINER with admin role check
**Idempotency**: Safe to call multiple times (checks current status)

```sql
-- Writes to:
-- 1. withdrawal_requests (status update)
-- 2. withdrawal_audit_logs (audit trail)

-- Atomicity: Single transaction
-- Returns: JSON with success status and message
```

### `delete_withdrawal(p_request_id UUID, p_reason TEXT, p_hard_delete BOOLEAN DEFAULT FALSE)`

Deletes a withdrawal request (soft delete by default, hard delete if flag is set).

**Security**: SECURITY DEFINER with admin role check
**Soft delete**: Sets deleted_at timestamp, preserves audit trail
**Hard delete**: Permanently removes request and audit trail (GDPR compliance)

## Invariants

1. **Audit Trail Completeness**: Every status change MUST create an audit log entry
2. **No Orphan Audits**: Every audit log MUST reference a valid withdrawal_requests row (or be cascade-deleted)
3. **Terminal State Immutability**: Completed/rejected/cancelled requests cannot transition to other states
4. **Amount Conservation**: Withdrawal amount cannot change after creation
5. **Position Validation**: Cannot withdraw more than current position balance

## Frontend Cache Invalidation

After any withdrawal operation, invalidate:

```typescript
queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
queryClient.invalidateQueries({ queryKey: ['investor-positions'] });
queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
```

## Error Handling

| Error Code | Description | Resolution |
|-----------|-------------|------------|
| `INSUFFICIENT_BALANCE` | Position balance too low | Check current balance |
| `INVALID_STATE_TRANSITION` | Invalid status change | Check current status |
| `WITHDRAWAL_NOT_FOUND` | Request doesn't exist | Verify withdrawal ID |
| `UNAUTHORIZED` | Not admin or wrong investor | Check permissions |

## Migration Safety

### Forbidden Patterns

The following patterns are checked by `scripts/check-migrations.sh`:

- `withdrawal_audit_log[^s]` - Must use plural `withdrawal_audit_logs`
- `FROM withdrawal_audit_log[^s]` - Query must use plural table
- `INTO withdrawal_audit_log[^s]` - Insert must use plural table

### Fresh DB Verification

Run `scripts/db-smoke-test.sh` to verify:

1. `withdrawal_audit_logs` table exists
2. `withdrawal_audit_log` view exists (compatibility)
3. All withdrawal RPC functions exist
4. Integrity views return 0 mismatches

## Testing Checklist

### Manual QA

- [ ] Create withdrawal request as investor
- [ ] Approve request as admin
- [ ] Reject request as admin
- [ ] Cancel pending request
- [ ] Cancel approved request
- [ ] Complete processing flow
- [ ] Verify audit trail entries
- [ ] Verify position updates after completion

### Database Assertions

After each operation, verify:

```sql
-- No orphan audit logs
SELECT COUNT(*) FROM withdrawal_audit_logs wal
WHERE NOT EXISTS (
  SELECT 1 FROM withdrawal_requests wr 
  WHERE wr.id = wal.withdrawal_id
);
-- Expected: 0

-- Audit trail completeness
SELECT wr.id, wr.status, COUNT(wal.id) as audit_count
FROM withdrawal_requests wr
LEFT JOIN withdrawal_audit_logs wal ON wal.withdrawal_id = wr.id
GROUP BY wr.id, wr.status
HAVING COUNT(wal.id) = 0;
-- Expected: 0 rows (every request has at least 1 audit entry)
```
