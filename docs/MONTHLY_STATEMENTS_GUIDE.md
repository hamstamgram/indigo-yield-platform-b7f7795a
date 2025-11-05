# Monthly Statements System - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Admin Workflow](#admin-workflow)
4. [API Reference](#api-reference)
5. [Email Template Customization](#email-template-customization)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Monthly Statements System allows administrators to generate and send professional HTML email statements to investors showing their fund performance across multiple time periods (MTD, QTD, YTD, ITD).

### Key Features
- ✅ Support for 6 cryptocurrency yield funds (BTC, ETH, SOL, USDT, USDC, EURC)
- ✅ Multiple time period reporting (Month/Quarter/Year/Inception-to-Date)
- ✅ Professional HTML email templates with responsive design
- ✅ Preview before sending
- ✅ Batch generation and sending
- ✅ Delivery tracking
- ✅ Error handling and retry logic

### System Components
1. **Database Tables** - 4 tables for periods, performance, statements, and delivery
2. **API Layer** - Client-side API wrapper using Supabase
3. **HTML Generator** - Creates formatted email statements
4. **Admin UI** - React components for workflow management
5. **Data Input** - Form for entering monthly performance data

---

## Database Setup

### Migration

The database migration creates 4 main tables:

```sql
-- 1. statement_periods: Track monthly reporting periods
-- 2. investor_fund_performance: Store performance data (MTD/QTD/YTD/ITD)
-- 3. generated_statements: Store HTML email content
-- 4. statement_email_delivery: Track email delivery status
```

### Running the Migration

```bash
# Apply the migration to your Supabase database
npx supabase db push
```

**Migration File:** `supabase/migrations/20251103000005_create_monthly_statements.sql`

### Helper Functions

The migration includes several PostgreSQL helper functions:

- `get_fund_currency(fund_name)` - Returns currency symbol
- `get_fund_icon_url(fund_name)` - Returns CDN URL for fund icon
- `format_statement_number(value)` - Formats numbers for display
- `get_value_color(value)` - Returns color for positive/negative values
- `finalize_statement_period()` - Locks period from further edits
- `get_statement_period_summary()` - Returns dashboard statistics

### Row-Level Security (RLS)

All tables have RLS enabled:

- **Admins**: Full access to all data
- **Investors**: Can view their own statements and performance data

---

## Admin Workflow

### Step 1: Create Statement Period

1. Navigate to **Monthly Statements** in admin dashboard
2. Click **Create New Period**
3. Fill in the form:
   - **Year**: e.g., 2025
   - **Month**: e.g., October
   - **Period Name**: e.g., "October 2025"
   - **Period End Date**: Last day of the month
4. Click **Create Period**

**Status Flow:** `DRAFT` → `FINALIZED` → `SENT`

### Step 2: Input Performance Data

For each investor with active positions:

1. Select the period from the **Periods** tab
2. Switch to the **Investors** tab
3. Click on an investor to open the data input form
4. For each fund the investor holds:
   - Select the fund from dropdown
   - Enter data for MTD/QTD/YTD/ITD:
     - Beginning Balance
     - Additions
     - Redemptions
     - Net Income
     - Ending Balance
     - Rate of Return (%)
5. Click **Save Data**
6. Repeat for all funds

**Alternative: Bulk CSV Import** (Future Enhancement)
```csv
investor_email,fund_name,mtd_beginning,mtd_additions,...
investor@example.com,BTC YIELD FUND,10000,1000,...
```

### Step 3: Generate Statements

Once all data is entered:

1. Click **Generate All Statements**
2. Wait for generation to complete
3. Review the summary:
   - ✅ Success count
   - ❌ Failed count (if any)
4. Check individual statements have "Generated" badge

**What Happens:**
- HTML email is generated for each investor
- Fund performance data is formatted
- Statement is saved to `generated_statements` table
- Ready for preview

### Step 4: Preview Statements

Before sending, preview each statement:

1. Click the 👁️ icon next to an investor
2. Review the HTML email in the preview dialog
3. Check:
   - ✅ Investor name and email correct
   - ✅ All funds displayed
   - ✅ Numbers formatted correctly
   - ✅ Colors applied (green/red for positive/negative)
   - ✅ Responsive design works

**Preview includes warning banner:**
> ⚠️ PREVIEW ONLY - This email has not been sent to investors yet

### Step 5: Send Statements

When ready to send:

1. Click **Send All (X)** where X is pending count
2. Confirm the action (cannot be undone)
3. Wait for sending to complete
4. Review results:
   - ✅ Sent count
   - ❌ Failed count (if any)

**What Happens:**
- Statements queued in `statement_email_delivery` table
- Edge Function triggers email delivery (via Resend/SendGrid)
- Status tracked: `QUEUED` → `SENDING` → `SENT` or `FAILED`

### Step 6: Monitor Delivery

Track email delivery status:

1. Check the **Status** column in Investors table
2. Badges indicate:
   - 🟢 **Sent** - Email delivered successfully
   - 🟡 **Generated** - Ready to send
   - ⚪ **Not Generated** - Data missing

**Email Engagement Tracking** (if enabled):
- Opened at timestamp
- Clicked at timestamp

---

## API Reference

### Client-Side API (`statementsApi`)

Import:
```typescript
import { statementsApi } from '@/services/api/statementsApi';
```

### Statement Periods

#### Get All Periods
```typescript
const { data, error } = await statementsApi.getPeriods();
// Returns: StatementPeriodWithStats[]
```

#### Create Period
```typescript
const { data, error } = await statementsApi.createPeriod({
  year: 2025,
  month: 10,
  period_name: 'October 2025',
  period_end_date: '2025-10-31',
  notes: 'Optional notes',
});
```

#### Finalize Period
```typescript
const { data, error } = await statementsApi.finalize(periodId);
// Locks period from further edits
```

### Investors and Performance

#### Get Period Investors
```typescript
const { data, error } = await statementsApi.getPeriodInvestors(periodId);
// Returns: InvestorStatementSummary[]
```

#### Save Performance Data
```typescript
const { data, error } = await statementsApi.savePerformanceData(
  periodId,
  userId,
  fundName,
  {
    mtd_beginning_balance: '10000',
    mtd_additions: '1000',
    mtd_redemptions: '0',
    mtd_net_income: '250',
    mtd_ending_balance: '11250',
    mtd_rate_of_return: '2.5',
    // ... QTD, YTD, ITD fields
  }
);
```

#### Get Performance Data
```typescript
const { data, error } = await statementsApi.getPerformanceData(periodId, userId);
// Returns: InvestorFundPerformance[]
```

### Statement Generation

#### Generate Single Statement
```typescript
const { data, error } = await statementsApi.generateStatement(periodId, userId);
// Returns: { html: string, statement_id: string }
```

#### Generate All Statements
```typescript
const { data, error } = await statementsApi.generateAll(periodId);
// Returns: { success: number, failed: number, errors: string[] }
```

#### Preview Statement
```typescript
const { data, error } = await statementsApi.previewStatement(periodId, userId);
// Returns: HTML string with preview banner
```

### Email Sending

#### Send Single Statement
```typescript
const { data, error } = await statementsApi.sendStatement(periodId, userId);
```

#### Send All Statements
```typescript
const { data, error } = await statementsApi.sendAll(periodId);
// Returns: { success: number, failed: number, errors: string[] }
```

### Response Format

All API methods return:
```typescript
{
  data: T | null,    // Result data
  error: string | null  // Error message
}
```

---

## Email Template Customization

### Template Location
`src/lib/statements/monthlyEmailGenerator.ts`

### Customizable Elements

#### 1. Brand Colors
```typescript
// Header background
background-color: #1e293b; // Slate 800

// Primary text
color: #1e293b; // Slate 800

// Positive values
color: #16a34a; // Green 600

// Negative values
color: #dc2626; // Red 600
```

#### 2. Fund Icons

Update the `FUND_ICONS` mapping:
```typescript
const FUND_ICONS: Record<string, string> = {
  'BTC YIELD FUND': 'https://your-cdn.com/btc-icon.png',
  'ETH YIELD FUND': 'https://your-cdn.com/eth-icon.png',
  // ... other funds
};
```

#### 3. Footer Links

Social media links in footer:
```typescript
// LinkedIn
<a href="https://www.linkedin.com/company/indigo-fund">

// Instagram
<a href="https://www.instagram.com/indigofund">

// X/Twitter
<a href="https://x.com/IndigoFund">
```

#### 4. Typography

Font family (loaded from Google Fonts):
```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap">
```

Change to different font:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
```

Update CSS:
```css
body, table, td, p, h1, h2 {
  font-family: 'Inter', Arial, sans-serif;
}
```

#### 5. Mobile Breakpoints

Responsive design with media queries:
```css
@media (max-width:600px) {
  .mobile-logo { height: 22px !important; }
  .mobile-h1 { font-size: 18px !important; }
  .mobile-table { font-size: 11px !important; }
}

@media (max-width:480px) {
  /* Additional mobile styles */
}
```

### Testing Email Rendering

Test across email clients:
- ✅ Gmail (Desktop & Mobile)
- ✅ Outlook (Desktop & Mobile)
- ✅ Apple Mail
- ✅ Yahoo Mail
- ✅ Thunderbird

Use tools like:
- [Litmus](https://www.litmus.com/)
- [Email on Acid](https://www.emailonacid.com/)
- [Mailtrap](https://mailtrap.io/)

---

## Troubleshooting

### Common Issues

#### Issue: Statement generation fails

**Symptoms:**
- Error message: "No fund performance data found"
- Failed count > 0 after generation

**Solutions:**
1. Verify performance data was entered for all investor funds
2. Check data saved correctly:
   ```sql
   SELECT * FROM investor_fund_performance
   WHERE period_id = 'xxx' AND user_id = 'yyy';
   ```
3. Ensure fund names match exactly (case-sensitive)

#### Issue: Preview shows incorrect data

**Symptoms:**
- Numbers don't match input data
- Wrong investor name/email
- Missing funds

**Solutions:**
1. Refresh the page and try again
2. Check database directly:
   ```sql
   SELECT * FROM generated_statements
   WHERE period_id = 'xxx' AND user_id = 'yyy';
   ```
3. Regenerate the statement

#### Issue: Emails not sending

**Symptoms:**
- Status stuck on "QUEUED"
- No emails received by investors

**Solutions:**
1. Check Edge Function logs:
   ```bash
   npx supabase functions logs email-sender
   ```
2. Verify email service configuration (Resend API key)
3. Check delivery table:
   ```sql
   SELECT * FROM statement_email_delivery
   WHERE status = 'FAILED';
   ```
4. Review error messages in `error_message` column

#### Issue: Email formatting broken

**Symptoms:**
- Layout issues in email client
- Images not loading
- Colors not showing

**Solutions:**
1. Verify CDN URLs are accessible:
   ```bash
   curl https://storage.mlcdn.com/account_image/855106/...
   ```
2. Check inline CSS is correct (no external stylesheets)
3. Test in different email clients
4. Validate HTML with [W3C Validator](https://validator.w3.org/)

#### Issue: Missing investors in period

**Symptoms:**
- Investor not showing in Investors tab
- Empty investors list

**Solutions:**
1. Verify investor has fund performance data:
   ```sql
   SELECT DISTINCT user_id
   FROM investor_fund_performance
   WHERE period_id = 'xxx';
   ```
2. Check investor profile exists and is active
3. Ensure RLS policies allow admin access

### Database Queries

#### View all periods
```sql
SELECT * FROM statement_periods
ORDER BY period_end_date DESC;
```

#### View performance data for investor
```sql
SELECT p.period_name, ifp.*
FROM investor_fund_performance ifp
JOIN statement_periods p ON p.id = ifp.period_id
WHERE ifp.user_id = 'investor-uuid'
ORDER BY p.period_end_date DESC;
```

#### View generated statements
```sql
SELECT p.period_name, prof.full_name, gs.*
FROM generated_statements gs
JOIN statement_periods p ON p.id = gs.period_id
JOIN profiles prof ON prof.id = gs.user_id
ORDER BY gs.generated_at DESC;
```

#### View delivery status
```sql
SELECT
  p.period_name,
  prof.full_name,
  prof.email,
  sed.status,
  sed.sent_at,
  sed.error_message
FROM statement_email_delivery sed
JOIN statement_periods p ON p.id = sed.period_id
JOIN profiles prof ON prof.id = sed.user_id
WHERE sed.status != 'SENT'
ORDER BY sed.queued_at DESC;
```

### Performance Optimization

#### Slow statement generation
- Generate statements in batches (e.g., 10 at a time)
- Add database indexes if needed
- Monitor Supabase performance metrics

#### Large email sizes
- Optimize fund icon file sizes
- Consider linking to web version instead of inline HTML
- Compress HTML (remove whitespace)

### Support and Logs

#### Enable debug logging
```typescript
// In statementsApi.ts
const DEBUG = true;

if (DEBUG) {
  console.log('Statement generation:', data);
}
```

#### Check Supabase logs
1. Go to Supabase Dashboard
2. Navigate to Logs section
3. Filter by:
   - Table: `statement_email_delivery`
   - Status: `FAILED`
   - Time range: Last 24 hours

---

## Best Practices

### Data Entry
- ✅ Enter data for all investors before generating
- ✅ Double-check numbers for accuracy
- ✅ Use consistent decimal precision (2-8 places)
- ✅ Verify rate of return calculations
- ✅ Save data frequently (per fund)

### Statement Generation
- ✅ Preview at least 2-3 statements before sending
- ✅ Test with different fund combinations (1 fund, 6 funds)
- ✅ Check mobile responsive design
- ✅ Verify all colors and formatting

### Email Sending
- ✅ Send test emails to yourself first
- ✅ Use staging environment for testing
- ✅ Send during business hours
- ✅ Monitor delivery status for first 30 minutes
- ✅ Have customer support ready for investor questions

### Security
- ✅ Only admins should access statement generation
- ✅ Use RLS to protect investor data
- ✅ Log all statement generation and sending
- ✅ Encrypt sensitive data in database
- ✅ Use secure email provider (Resend with DKIM/SPF)

---

## Future Enhancements

### Planned Features
1. **Bulk CSV Import** - Upload performance data via spreadsheet
2. **Statement Scheduling** - Auto-send on specific dates
3. **Email Templates** - Multiple template options
4. **PDF Attachments** - Generate PDF version of statement
5. **Historical Comparison** - Show month-over-month trends
6. **Custom Branding** - Per-fund or per-investor customization
7. **Multi-language Support** - Statements in different languages
8. **Automated Reminders** - Notify admins of pending statements

### Integration Opportunities
- **Accounting Software** - Sync with QuickBooks, Xero
- **CRM Systems** - Track investor communications
- **Analytics Platforms** - Dashboard for admin insights
- **Notification Services** - SMS/push notifications for investors

---

## Appendix

### Fund Details

| Fund Name | Currency | Icon URL |
|-----------|----------|----------|
| BTC YIELD FUND | BTC | `https://storage.mlcdn.com/.../8Pf2dtBl6...` |
| ETH YIELD FUND | ETH | `https://storage.mlcdn.com/.../iuulK6xRS...` |
| SOL YIELD FUND | SOL | `https://storage.mlcdn.com/.../14fmAPi88...` |
| USDT YIELD FUND | USDT | `https://storage.mlcdn.com/.../2p3Y0l5lo...` |
| USDC YIELD FUND | USDC | `https://storage.mlcdn.com/.../770YUbYlW...` |
| EURC YIELD FUND | EURC | `https://storage.mlcdn.com/.../kwV87oiC7...` |

### Status Definitions

**Period Status:**
- `DRAFT` - Data entry in progress
- `FINALIZED` - Data locked, ready to send
- `SENT` - All statements sent to investors

**Delivery Status:**
- `QUEUED` - Email queued for sending
- `SENDING` - Email being processed
- `SENT` - Email delivered successfully
- `FAILED` - Delivery failed (see error_message)
- `BOUNCED` - Email bounced (invalid address)

### File Locations

```
src/
├── components/admin/
│   ├── MonthlyStatementManager.tsx    # Main admin UI
│   └── InvestorDataInput.tsx           # Data entry form
├── lib/statements/
│   ├── monthlyEmailGenerator.ts        # HTML generator
│   └── generator.ts                    # Core logic
└── services/api/
    └── statementsApi.ts                # API wrapper

supabase/
└── migrations/
    └── 20251103000005_create_monthly_statements.sql

docs/
└── MONTHLY_STATEMENTS_GUIDE.md         # This file
```

---

## Contact and Support

For questions or issues:

1. **Check this documentation first**
2. **Search existing issues** on GitHub
3. **Create new issue** with:
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Supabase logs (if relevant)

---

**Last Updated:** November 3, 2025
**Version:** 1.0.0
**Maintainer:** Indigo Fund Development Team
