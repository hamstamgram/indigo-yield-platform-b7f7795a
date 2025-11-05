# Monthly Statements - Quick Start Guide

## 5-Minute Setup

### 1. Run Database Migration
```bash
npx supabase db push
```

### 2. Create Your First Period
```typescript
import { statementsApi } from '@/services/api/statementsApi';

const { data, error } = await statementsApi.createPeriod({
  year: 2025,
  month: 10,
  period_name: 'October 2025',
  period_end_date: '2025-10-31',
});
```

### 3. Input Performance Data
```typescript
const { data, error } = await statementsApi.savePerformanceData(
  periodId,
  userId,
  'BTC YIELD FUND',
  {
    mtd_beginning_balance: '10000.00',
    mtd_additions: '1000.00',
    mtd_redemptions: '0.00',
    mtd_net_income: '250.00',
    mtd_ending_balance: '11250.00',
    mtd_rate_of_return: '2.50',

    qtd_beginning_balance: '9000.00',
    qtd_additions: '2000.00',
    qtd_redemptions: '0.00',
    qtd_net_income: '1250.00',
    qtd_ending_balance: '11250.00',
    qtd_rate_of_return: '13.89',

    // ... YTD and ITD fields
  }
);
```

### 4. Generate Statements
```typescript
const { data, error } = await statementsApi.generateAll(periodId);
console.log(`Generated ${data.success} statements`);
```

### 5. Preview
```typescript
const { data: html, error } = await statementsApi.previewStatement(
  periodId,
  userId
);
// Display HTML in iframe or new window
```

### 6. Send
```typescript
const { data, error } = await statementsApi.sendAll(periodId);
console.log(`Sent ${data.success} emails`);
```

## Common Operations

### Get All Periods
```typescript
const { data: periods } = await statementsApi.getPeriods();
```

### Get Investors for Period
```typescript
const { data: investors } = await statementsApi.getPeriodInvestors(periodId);
```

### Get Period Summary
```typescript
const { data: summary } = await statementsApi.getPeriodSummary(periodId);
// { total_investors, statements_generated, statements_sent }
```

### Finalize Period (Lock from Edits)
```typescript
await statementsApi.finalize(periodId);
```

## Database Queries

### Check Statement Status
```sql
SELECT
  p.period_name,
  prof.full_name,
  CASE
    WHEN gs.id IS NULL THEN 'Not Generated'
    WHEN sed.status = 'SENT' THEN 'Sent'
    ELSE 'Generated'
  END as status
FROM statement_periods p
CROSS JOIN profiles prof
LEFT JOIN generated_statements gs
  ON gs.period_id = p.id AND gs.user_id = prof.id
LEFT JOIN statement_email_delivery sed
  ON sed.statement_id = gs.id
WHERE p.id = 'your-period-id'
ORDER BY prof.full_name;
```

### View Failed Deliveries
```sql
SELECT
  prof.full_name,
  prof.email,
  sed.error_message,
  sed.retry_count
FROM statement_email_delivery sed
JOIN profiles prof ON prof.id = sed.user_id
WHERE sed.status = 'FAILED'
  AND sed.period_id = 'your-period-id';
```

## React Component Usage

### In Your Admin Dashboard
```typescript
import { MonthlyStatementManager } from '@/components/admin/MonthlyStatementManager';

export function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <MonthlyStatementManager />
    </div>
  );
}
```

### Data Input Form
```typescript
import { InvestorDataInput } from '@/components/admin/InvestorDataInput';

export function InvestorPage() {
  return (
    <InvestorDataInput
      periodId={selectedPeriod.id}
      investorId={selectedInvestor.id}
      investorName={selectedInvestor.name}
      onSave={() => {
        console.log('Data saved!');
        // Refresh statements list
      }}
    />
  );
}
```

## Email Template Customization

### Update Brand Colors
```typescript
// In monthlyEmailGenerator.ts

// Header background
const HEADER_BG = '#1e293b'; // Your brand color

// Positive values
const POSITIVE_COLOR = '#16a34a';

// Negative values
const NEGATIVE_COLOR = '#dc2626';
```

### Update Fund Icons
```typescript
const FUND_ICONS: Record<string, string> = {
  'BTC YIELD FUND': 'https://your-cdn.com/btc-icon.png',
  'ETH YIELD FUND': 'https://your-cdn.com/eth-icon.png',
  // ... other funds
};
```

## Troubleshooting

### Statement Generation Fails
```typescript
// Check if performance data exists
const { data } = await statementsApi.getPerformanceData(periodId, userId);
console.log('Performance data:', data);
```

### Email Not Sending
```sql
-- Check delivery status
SELECT status, error_message, retry_count
FROM statement_email_delivery
WHERE statement_id = 'your-statement-id';
```

### Preview Not Loading
```typescript
// Regenerate statement
const { data } = await statementsApi.generateStatement(periodId, userId);
console.log('Statement ID:', data.statement_id);
```

## Best Practices

✅ **Always preview** statements before sending
✅ **Test with staging data** first
✅ **Send during business hours**
✅ **Monitor delivery** for first 30 minutes
✅ **Save data frequently** (per fund)
✅ **Use consistent decimals** (2-8 places)

## Need Help?

📖 [Complete Documentation](./MONTHLY_STATEMENTS_GUIDE.md)
🐛 [Report Issue](https://github.com/your-repo/issues)
💬 [Contact Support](mailto:support@indigofund.com)

---

**Quick Reference Card**

| Action | Command |
|--------|---------|
| Create Period | `statementsApi.createPeriod(data)` |
| Save Data | `statementsApi.savePerformanceData(...)` |
| Generate All | `statementsApi.generateAll(periodId)` |
| Preview | `statementsApi.previewStatement(...)` |
| Send All | `statementsApi.sendAll(periodId)` |
| Get Periods | `statementsApi.getPeriods()` |
| Get Investors | `statementsApi.getPeriodInvestors(periodId)` |

---

**Last Updated:** November 3, 2025
