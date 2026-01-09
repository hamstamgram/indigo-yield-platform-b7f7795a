# RPC Function Quick Reference

This file lists all RPC functions with their parameter and return types.
Auto-extracted from `/src/integrations/supabase/types.ts`.

## Withdrawal Functions

### approve_withdrawal
- **Args**: `{ p_request_id: string, p_approved_amount?: number, p_admin_notes?: string }`
- **Returns**: `boolean`
- **Usage**: Approve a withdrawal request

### cancel_withdrawal_by_admin
- **Args**: `{ p_request_id: string, p_reason: string, p_admin_notes?: string }`
- **Returns**: `boolean`
- **Usage**: Cancel a withdrawal (admin only)

### complete_withdrawal
- **Args**: `{ p_request_id: string, p_closing_aum: number, p_transaction_hash?: string, p_admin_notes?: string }`
- **Returns**: `boolean`
- **Usage**: Mark withdrawal as completed

### create_withdrawal_request
- **Args**: `{ p_investor_id: string, p_fund_id: string, p_amount: number, p_type?: string, p_notes?: string }`
- **Returns**: `string` (withdrawal request ID)
- **Usage**: Create new withdrawal request

### delete_withdrawal
- **Args**: `{ p_withdrawal_id: string, p_reason: string, p_hard_delete?: boolean }`
- **Returns**: `boolean`
- **Usage**: Delete/cancel a withdrawal

### reject_withdrawal
- **Args**: `{ p_request_id: string, p_reason: string, p_admin_notes?: string }`
- **Returns**: `boolean`
- **Usage**: Reject a withdrawal request

### route_withdrawal_to_fees
- **Args**: `{ p_request_id: string, p_reason?: string }`
- **Returns**: `boolean`
- **Usage**: Route withdrawal to fees account

### start_processing_withdrawal
- **Args**: `{ p_request_id: string, p_processed_amount?: number, p_tx_hash?: string, p_settlement_date?: string, p_admin_notes?: string }`
- **Returns**: `boolean`
- **Usage**: Start processing a withdrawal

### update_withdrawal
- **Args**: `{ p_withdrawal_id: string, p_requested_amount?: number, p_withdrawal_type?: string, p_notes?: string, p_reason: string }`
- **Returns**: `boolean`
- **Usage**: Update withdrawal details

## Snapshot Functions

### generate_fund_period_snapshot
- **Args**: `{ p_fund_id: string, p_period_id: string, p_admin_id?: string }`
- **Returns**: `string` (snapshot ID)
- **Usage**: Generate period snapshot for ownership tracking

### lock_fund_period_snapshot
- **Args**: `{ p_fund_id: string, p_period_id: string, p_admin_id: string }`
- **Returns**: `boolean`
- **Usage**: Lock a period snapshot

### unlock_fund_period_snapshot
- **Args**: `{ p_fund_id: string, p_period_id: string, p_admin_id: string, p_reason: string }`
- **Returns**: `boolean`
- **Usage**: Unlock a period snapshot (super admin only)

### is_period_locked
- **Args**: `{ p_fund_id: string, p_period_id: string }`
- **Returns**: `boolean`
- **Usage**: Check if period is locked

### get_period_ownership
- **Args**: `{ p_fund_id: string, p_period_id: string }`
- **Returns**: `Json` (array of ownership data)
- **Usage**: Get ownership percentages for a period

## Admin Functions

### is_super_admin
- **Args**: `never` (no parameters)
- **Returns**: `boolean`
- **Usage**: Check if current user is super admin

### is_admin
- **Args**: `never` (no parameters)
- **Returns**: `boolean`
- **Usage**: Check if current user is admin

### get_user_admin_status
- **Args**: `{ user_id: string }`
- **Returns**: `boolean`
- **Usage**: Get admin status for specific user

### update_admin_role
- **Args**: `{ p_user_id: string, p_is_admin: boolean, p_reason: string }`
- **Returns**: `boolean`
- **Usage**: Update user's admin role

### create_admin_invite
- **Args**: `{ p_email: string, p_role?: string }`
- **Returns**: `string` (invite code)
- **Usage**: Create admin invitation

## Transaction Functions

### void_transaction
- **Args**: `{ p_transaction_id: string, p_reason: string }`
- **Returns**: `boolean`
- **Usage**: Void a transaction

### update_transaction
- **Args**: `{ p_transaction_id: string, p_amount?: number, p_notes?: string, p_reason: string }`
- **Returns**: `boolean`
- **Usage**: Update transaction details

### get_void_transaction_impact
- **Args**: `{ p_transaction_id: string }`
- **Returns**: `Json`
- **Usage**: Preview impact of voiding transaction

## Yield Functions

### crystallize_yield_before_flow
- **Args**: `{ p_fund_id: string, p_event_ts: string, p_closing_aum: string, p_trigger_type: string, p_trigger_reference?: string, p_purpose: string, p_admin_id?: string }`
- **Returns**: `Json`
- **Usage**: Crystallize yield before capital flow

### crystallize_month_end
- **Args**: `{ p_fund_id: string, p_month_end_date: string, p_closing_aum: string, p_admin_id: string }`
- **Returns**: `Json`
- **Usage**: Crystallize month-end yield

### finalize_month_yield
- **Args**: `{ p_fund_id: string, p_period_year: number, p_period_month: number, p_admin_id: string }`
- **Returns**: `Json`
- **Usage**: Make yield events visible to investors

## Delivery Functions

### get_delivery_stats
- **Args**: `{ p_period_id: string }`
- **Returns**: `Json`
- **Usage**: Get statement delivery statistics

### queue_statement_deliveries
- **Args**: `{ p_period_id: string, p_channel?: string }`
- **Returns**: `Json`
- **Usage**: Queue statements for delivery

### retry_delivery
- **Args**: `{ p_delivery_id: string }`
- **Returns**: `boolean`
- **Usage**: Retry failed delivery

### cancel_delivery
- **Args**: `{ p_delivery_id: string, p_reason: string }`
- **Returns**: `boolean`
- **Usage**: Cancel pending delivery

### mark_sent_manually
- **Args**: `{ p_delivery_id: string, p_notes?: string }`
- **Returns**: `boolean`
- **Usage**: Mark delivery as sent manually

### requeue_stale_sending
- **Args**: `{ p_stale_minutes?: number }`
- **Returns**: `Json`
- **Usage**: Requeue stale sending deliveries

## AUM Functions

### check_aum_reconciliation
- **Args**: `{ p_fund_id: string, p_date: string }`
- **Returns**: `Json`
- **Usage**: Check AUM reconciliation status

### recalculate_fund_aum_for_date
- **Args**: `{ p_fund_id: string, p_date: string }`
- **Returns**: `boolean`
- **Usage**: Recalculate fund AUM for specific date

## Usage Examples

### Example 1: Approve Withdrawal
```typescript
import type { Database } from "@/integrations/supabase/types";

const { data, error } = await supabase
  .rpc('approve_withdrawal', {
    p_request_id: withdrawalId,
    p_approved_amount: amount
  })
  .returns<Database["public"]["Functions"]["approve_withdrawal"]["Returns"]>();

if (data === true) {
  console.log('Withdrawal approved');
}
```

### Example 2: Check Admin Status
```typescript
const { data: isAdmin } = await supabase
  .rpc('is_super_admin')
  .returns<Database["public"]["Functions"]["is_super_admin"]["Returns"]>();

if (isAdmin) {
  // Show admin features
}
```

### Example 3: Generate Snapshot
```typescript
const { data: snapshotId, error } = await supabase
  .rpc('generate_fund_period_snapshot', {
    p_fund_id: fundId,
    p_period_id: periodId,
    p_admin_id: adminId
  })
  .returns<Database["public"]["Functions"]["generate_fund_period_snapshot"]["Returns"]>();

console.log('Created snapshot:', snapshotId);
```

---

**Note**: This is a quick reference. For complete function definitions including all parameters and return type structures, refer to `/src/integrations/supabase/types.ts`.

**Last Updated**: 2026-01-09
