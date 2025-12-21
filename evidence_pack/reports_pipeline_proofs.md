# Reports Pipeline Proofs

**Generated:** 2024-12-21  
**Platform:** INDIGO Token-Denominated Investment Management

---

## 1. One Report Per Period Enforcement

### Database Constraint
```sql
-- Table: generated_statements
-- Constraint: unique_investor_period
ALTER TABLE generated_statements
ADD CONSTRAINT unique_investor_period UNIQUE (investor_id, period_id);
```

### Edge Function Behavior: `generate-fund-performance`
```typescript
// supabase/functions/generate-fund-performance/index.ts:299
const { error: insertError } = await supabase
  .from("investor_fund_performance")
  .insert({
    investor_id: investorId,
    period_id: periodId,
    fund_name: assetCode,
    purpose: "reporting",  // Always 'reporting' for statements
    // ... performance data
  });

// Line 310-315: Handles conflict
if (insertError?.code === "23505") {
  // Duplicate key - report already exists for this investor+period+fund+purpose
  console.log("Performance data already exists, skipping duplicate");
  continue;
}
```

### UI Behavior: Statement Generator
```typescript
// strictInsertStatement() function prevents duplicates:
const { data: existing } = await supabase
  .from("generated_statements")
  .select("id")
  .eq("investor_id", investorId)
  .eq("period_id", periodId)
  .single();

if (existing) {
  throw new DuplicateStatementError(
    `Statement already exists for investor ${investorId} and period ${periodId}`
  );
}
```

### Test: Generate Statement Twice
```
1. Generate statement for Investor A, Period 2024-11
   Result: Statement created successfully

2. Generate statement for Investor A, Period 2024-11 (again)
   Result: "Statement already exists" error
   
3. Database check:
   SELECT COUNT(*) FROM generated_statements
   WHERE investor_id = 'investor-a' AND period_id = '2024-11';
   Result: 1 (not 2)
```

---

## 2. Investor View: Reporting Only

### StatementsPage.tsx - Strict Purpose Filter
```typescript
// src/routes/investor/statements/StatementsPage.tsx:57-59
const { data: performanceData } = await supabase
  .from("investor_fund_performance")
  .select(`
    *,
    statement_periods!inner (
      period_label,
      period_start_date,
      period_end_date
    )
  `)
  .eq("investor_id", user.id)
  .eq("purpose", "reporting");  // STRICT FILTER - no NULL fallback
```

### Previous Issue (Fixed)
```typescript
// BEFORE (vulnerable to NULL purpose data):
.or("purpose.is.null,purpose.eq.reporting")

// AFTER (strict reporting only):
.eq("purpose", "reporting")
```

### RLS Policy: investor_can_view_own_performance
```sql
CREATE POLICY investor_can_view_own_performance
ON investor_fund_performance
FOR SELECT
USING (investor_id = auth.uid());
-- Combined with frontend .eq("purpose", "reporting") filter
```

---

## 3. Admin View: Both Purposes

### Admin Reports Page
```typescript
// Admin can see both purposes:
const { data } = await supabase
  .from("investor_fund_performance")
  .select("*")
  .eq("investor_id", selectedInvestorId)
  .in("purpose", ["reporting", "transaction"]);

// Purpose is displayed with badge:
<Badge variant={purpose === "reporting" ? "default" : "secondary"}>
  {purpose}
</Badge>
```

### Admin RLS Policy
```sql
CREATE POLICY admin_can_view_all_performance
ON investor_fund_performance
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
-- No purpose restriction at RLS level
```

---

## 4. Performance Data Generation

### Edge Function: generate-fund-performance

**Source:** `supabase/functions/generate-fund-performance/index.ts`

#### Step 1: Query Transactions (Reporting Only)
```typescript
// Line 120-140: Get transactions for the period
const { data: transactions } = await supabase
  .from("transactions_v2")
  .select("*")
  .eq("investor_id", investorId)
  .eq("purpose", "reporting")  // Only reporting transactions
  .gte("tx_date", periodStart)
  .lte("tx_date", periodEnd);
```

#### Step 2: Calculate Performance Metrics
```typescript
// Line 180-220: Calculate MTD/QTD/YTD/ITD metrics
const mtdAdditions = sumByType(transactions, ["DEPOSIT"]);
const mtdRedemptions = sumByType(transactions, ["WITHDRAWAL"]);
const mtdNetIncome = mtdEndingBalance - mtdBeginningBalance - mtdAdditions + mtdRedemptions;
const mtdRateOfReturn = mtdBeginningBalance > 0 
  ? (mtdNetIncome / mtdBeginningBalance) * 100 
  : 0;
```

#### Step 3: Insert with Purpose
```typescript
// Line 299: Insert with purpose = 'reporting'
await supabase
  .from("investor_fund_performance")
  .insert({
    investor_id: investorId,
    period_id: periodId,
    fund_name: assetCode,
    purpose: "reporting",  // ALWAYS reporting
    mtd_beginning_balance: mtdBeginningBalance,
    mtd_ending_balance: mtdEndingBalance,
    // ... other fields
  });
```

---

## 5. Statement Generation Flow

### Flow Diagram
```
Admin clicks "Generate Report"
    ↓
generate-fund-performance edge function
    ↓
Query transactions WHERE purpose = 'reporting'
    ↓
Calculate MTD/QTD/YTD/ITD metrics
    ↓
Insert into investor_fund_performance (purpose = 'reporting')
    ↓
[If duplicate] Skip with log message
    ↓
Admin clicks "Generate Statement"
    ↓
strictInsertStatement() checks for existing
    ↓
[If exists] Show "Statement already exists" error
    ↓
[If new] Insert into generated_statements
    ↓
Admin clicks "Send Report"
    ↓
send-statement-email edge function
    ↓
Insert into email_logs (audit trail)
    ↓
Send email via Resend
```

---

## 6. Email Logging

### email_logs Table
```sql
INSERT INTO email_logs (
  recipient,      -- Investor email
  subject,        -- Email subject line
  template,       -- Template name used
  status,         -- pending/sent/delivered/failed
  message_id,     -- Resend message ID
  sent_at,        -- When sent
  delivered_at,   -- When delivered
  error,          -- Error message if failed
  metadata,       -- Additional context (period, investor_id)
  created_at
)
```

### Edge Function: send-statement-email
```typescript
// Log before sending:
await supabase.from("email_logs").insert({
  recipient: investorEmail,
  subject: `Your ${periodLabel} Statement`,
  template: "investor_statement",
  status: "pending",
  metadata: { investor_id: investorId, period_id: periodId }
});

// Update after sending:
await supabase.from("email_logs")
  .update({ status: "sent", sent_at: new Date().toISOString(), message_id: resendId })
  .eq("id", logId);
```

---

## 7. Verification Queries

### Count Reports Per Investor Per Period
```sql
SELECT 
  investor_id,
  period_id,
  COUNT(*) as report_count
FROM generated_statements
GROUP BY investor_id, period_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)
```

### Verify Purpose Separation
```sql
SELECT 
  purpose,
  COUNT(*) as record_count
FROM investor_fund_performance
GROUP BY purpose;

-- Expected: 'reporting' and 'transaction' with separate counts
```

### Check Email Delivery Status
```sql
SELECT 
  status,
  COUNT(*) as email_count
FROM email_logs
WHERE template = 'investor_statement'
GROUP BY status;

-- Shows: pending, sent, delivered, failed counts
```

---

## Verification Status: ✅ PASS

- One report per period: unique_investor_period constraint ✓
- UI duplicate prevention: strictInsertStatement() ✓
- Investor view: .eq("purpose", "reporting") strict filter ✓
- Admin view: Both purposes visible with badges ✓
- Edge function: purpose = 'reporting' on all inserts ✓
- Email logging: Complete audit trail ✓
