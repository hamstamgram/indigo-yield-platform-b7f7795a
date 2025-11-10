# Investment Management UI Documentation
**Created:** 2025-11-10  
**Route:** `/admin/investments`  
**Status:** ✅ COMPLETE

---

## Overview

The Investment Management UI provides a comprehensive interface for creating, approving, and tracking investment transactions. It includes proper validation, authorization, and audit trails for all investment operations.

---

## Features

### 1. **Investment Statistics Dashboard**
- **Total Active Investments**: Sum of all approved investments
- **Pending Approvals**: Investments awaiting admin review
- **Approved Count**: Number of active investments
- **Rejected Count**: Number of rejected/cancelled investments

### 2. **Create Investment**
- Select investor from active investors list
- Select fund from active funds list
- Enter investment amount (validated: positive, max $1B)
- Choose transaction type (initial, additional, redemption)
- Optional reference number (max 100 chars)
- Optional notes (max 1000 chars)
- Automatic status set to "pending" for admin approval

### 3. **Investment Approval Workflow**
- **Review Mode**: View all investment details before decision
- **Approve**: Enter number of shares to allocate based on NAV
- **Reject**: Provide reason for rejection (required)
- Automatic tracking of:
  - Who processed (processed_by)
  - When processed (processed_at)
  - Decision reason (in notes for rejections)

### 4. **Investment Tracking**
- Comprehensive table with filters:
  - Search by investor name, email, or reference number
  - Filter by status (pending, active, rejected, cancelled)
  - Filter by fund
- Display columns:
  - Investor (name + email)
  - Fund (name + code)
  - Amount (formatted currency)
  - Shares (4 decimal places)
  - Transaction type
  - Investment date
  - Status with color-coded badges
  - Action buttons

### 5. **Export Functionality**
- Export button for investment data (coming soon)
- Prepared for CSV/Excel export implementation

---

## Security & Validation

### Client-Side Validation (Zod Schema)
```typescript
- investor_id: UUID validation
- fund_id: UUID validation
- investment_date: Required date
- amount: Positive number, max $1B
- transaction_type: Enum (initial, additional, redemption)
- reference_number: Optional, max 100 chars
- notes: Optional, max 1000 chars
```

### Server-Side Security (RLS Policies)
- ✅ **Admins**: Full CRUD access to all investments
- ✅ **Investors**: 
  - Can create own investments (status auto-set to pending)
  - Can view only own investments
  - Cannot approve or modify after creation
- ✅ **Audit Trail**: All actions tracked with user_id and timestamp

---

## Database Structure

### investments Table
```sql
- id: uuid (primary key)
- investor_id: uuid (references investors)
- fund_id: uuid (references funds)
- investment_date: date
- amount: numeric
- shares: numeric (calculated on approval)
- status: text (pending, active, rejected, cancelled)
- transaction_type: text (initial, additional, redemption)
- reference_number: text (optional)
- notes: text (optional)
- created_by: uuid (who created)
- created_at: timestamp
- updated_at: timestamp
- processed_by: uuid (who approved/rejected)
- processed_at: timestamp (when approved/rejected)
- metadata: jsonb (extensible)
```

---

## Component Architecture

```
AdminInvestmentsPage (Main)
├── InvestmentStats (Dashboard Metrics)
├── Card (Filters & Table Container)
│   ├── Search Input
│   ├── Status Filter
│   ├── Fund Filter
│   └── InvestmentsTable
│       └── InvestmentApprovalDialog
└── CreateInvestmentDialog
```

---

## User Workflows

### Creating an Investment
1. Admin clicks "New Investment"
2. Selects investor from dropdown
3. Selects fund from dropdown
4. Enters amount and date
5. Chooses transaction type
6. Optionally adds reference number and notes
7. Clicks "Create Investment"
8. Investment created with status "pending"

### Approving an Investment
1. Admin sees pending investment in table
2. Clicks "Review" button
3. Reviews investment details in dialog
4. Clicks "Approve" tab
5. Enters number of shares to allocate
6. Clicks "Approve Investment"
7. Investment status changes to "active"
8. Shares allocated to investor
9. Processed_by and processed_at recorded

### Rejecting an Investment
1. Admin sees pending investment in table
2. Clicks "Review" button
3. Reviews investment details in dialog
4. Clicks "Reject" tab
5. Enters rejection reason (required)
6. Clicks "Reject Investment"
7. Investment status changes to "rejected"
8. Rejection reason saved in notes
9. Processed_by and processed_at recorded

---

## Integration Points

### Services Used
- **investmentService**: CRUD operations for investments
- **supabase**: Direct queries for investors and funds lists

### Related Tables
- **investors**: Source of investor data
- **funds**: Source of fund data
- **investment_summary**: View for aggregated statistics

---

## Future Enhancements

### Planned Features
1. **Bulk Import**: Upload CSV of multiple investments
2. **Automated Share Calculation**: Auto-calculate shares based on NAV
3. **Investment History**: Timeline view of all transactions per investor
4. **Document Attachments**: Upload supporting documents
5. **Email Notifications**: Notify investors of approval/rejection
6. **Performance Tracking**: Link to position performance metrics
7. **Redemption Workflow**: Special handling for redemption requests
8. **Investment Limits**: Enforce fund minimum/maximum investment rules

---

## Testing Checklist

### Functional Tests
- ✅ Create investment with valid data
- ✅ Validate required fields
- ✅ Validate amount limits
- ✅ Approve investment with shares
- ✅ Reject investment with reason
- ✅ Filter by status
- ✅ Filter by fund
- ✅ Search by investor name
- ✅ Admin-only access control

### Security Tests
- ✅ Non-admin cannot access page
- ✅ Investor cannot approve own investments
- ✅ RLS policies enforce data isolation
- ✅ Input validation prevents injection
- ✅ Audit trail captures all actions

---

## Error Handling

### Client-Side Errors
- Form validation errors displayed inline
- Network errors shown via toast notifications
- Loading states prevent duplicate submissions

### Server-Side Errors
- Database constraint violations caught and displayed
- Foreign key errors (invalid investor/fund ID)
- Permission errors from RLS policies
- Transaction rollback on approval/rejection failures

---

## Performance Considerations

- Lazy loading of page component
- Efficient queries with joined data (single query)
- Client-side filtering for responsive UX
- Optimistic UI updates on approval/rejection
- Debounced search input (future enhancement)

---

## Documentation References

- [Investment Schema](./SECURITY_AUDIT_REPORT.md#investments-table)
- [RLS Policies](./SECURITY_AUDIT_REPORT.md#rls-policy-coverage)
- [Validation Schema](../src/lib/validations/investment.ts)
- [Service Layer](../src/services/investmentService.ts)

---

## Status: ✅ PRODUCTION READY

All core functionality implemented and tested. Security measures in place. Ready for production use with planned enhancements to be added incrementally.
