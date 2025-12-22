# Reports Generation Flow

## Generated: 2024-12-22

## Overview

The reports system generates monthly investor statements with:
- One report per period per investor (enforced)
- Token-denominated values only (no USD)
- Exact HTML template matching design spec
- Email delivery tracking

## One Report Per Period Enforcement

```sql
-- Unique constraint on generated_statements
CREATE UNIQUE INDEX idx_unique_investor_period
ON generated_statements (investor_id, period_id);

-- Query verification
SELECT investor_id, period_id, COUNT(*) 
FROM generated_statements 
GROUP BY investor_id, period_id 
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

## Report Generation Flow

### Step 1: Select Period
- Admin selects statement period from dropdown
- Only closed periods available for report generation

### Step 2: Generate Reports
```typescript
// Generate for all investors in period
const { data, error } = await supabase.rpc('generate_period_statements', {
  p_period_id: periodId
});
```

### Step 3: HTML Generation
```sql
-- For each investor:
-- 1. Fetch investor_fund_performance records
SELECT * FROM investor_fund_performance
WHERE investor_id = $id AND period_id = $period_id AND purpose = 'reporting';

-- 2. Apply HTML template with Montserrat font
-- 3. Store in generated_statements
INSERT INTO generated_statements (investor_id, period_id, html_content, fund_names)
VALUES ($investor_id, $period_id, $html, $fund_names)
ON CONFLICT (investor_id, period_id) DO UPDATE SET html_content = $html;
```

## Template Requirements

| Element | Requirement | Status |
|---------|-------------|--------|
| Font | Montserrat (Google Fonts import) | ✅ |
| Header | #edf0fe background, logo left | ✅ |
| Fund blocks | Card style with icon | ✅ |
| Columns | MTD, QTD, YTD, ITD | ✅ |
| Values | Token units only (BTC, ETH, etc.) | ✅ |
| Colors | Green positive, red negative | ✅ |
| Footer | Disclaimer + social icons | ✅ |

## Data Flow

```
investor_fund_performance (purpose='reporting')
         ↓
   HTML Template Engine
         ↓
   generated_statements
         ↓
   statement_email_delivery (queued)
         ↓
   send-report-mailersend (edge function)
         ↓
   report_delivery_events (audit)
```

## Email Delivery Integration

### Queue Deliveries
```sql
-- RPC to queue deliveries for a period
SELECT queue_statement_deliveries($period_id);

-- Creates records in statement_email_delivery
-- Status: 'queued'
```

### Send via MailerSend
```typescript
// Edge function sends emails
const response = await supabase.functions.invoke('send-report-mailersend', {
  body: { deliveryId }
});
```

### Track Status
```sql
-- Delivery status updates via webhook
UPDATE statement_email_delivery
SET status = $new_status, 
    delivered_at = CASE WHEN $status = 'delivered' THEN NOW() END
WHERE id = $delivery_id;
```

## Regeneration

If report needs regeneration:
1. Admin selects investor and period
2. Clicks "Regenerate Report"
3. System overwrites existing (ON CONFLICT UPDATE)
4. New delivery record created if needed

## Result: ✅ PASS
- One report per period enforced via unique index
- Template matches design spec
- Email delivery tracking operational
