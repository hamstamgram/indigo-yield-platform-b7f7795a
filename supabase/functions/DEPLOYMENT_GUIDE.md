# Edge Functions Deployment Guide

This guide covers the deployment and configuration of all Supabase Edge Functions for the Indigo Yield Platform.

## Prerequisites

1. **Supabase CLI** installed and authenticated
   ```bash
   npm install -g supabase
   supabase login
   ```

2. **Docker** running (for local testing)

3. **Supabase Project** linked
   ```bash
   supabase link --project-ref your-project-ref
   ```

## Environment Variables

Before deploying, set up the following environment variables in your Supabase project:

```bash
# Core Settings
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration
ENABLE_EMAIL_NOTIFICATIONS=true

# Webhook Signatures
STRIPE_WEBHOOK_SECRET=whsec_...
PLAID_WEBHOOK_SECRET=...
COINBASE_WEBHOOK_SECRET=...
CIRCLE_WEBHOOK_SECRET=...

# Development Only
ALLOW_UNSIGNED_WEBHOOKS=false  # Set to true only in development
```

Set environment variables using:
```bash
supabase secrets set VARIABLE_NAME=value
```

## Edge Functions Overview

### Priority 1: Core Functions

#### 1. generate-report
**Purpose**: Async report generation with PDF/Excel/CSV/JSON support
**Path**: `supabase/functions/generate-report`
**Deploy**: `supabase functions deploy generate-report`

**Features**:
- Async report processing
- Multiple format support (PDF, Excel, CSV, JSON)
- Cloud storage upload
- Database tracking
- Comprehensive error handling

**Usage**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportId: 'uuid',
    reportType: 'portfolio_summary',
    format: 'pdf',
    filters: { dateRangeStart: '2025-01-01', dateRangeEnd: '2025-01-31' }
  })
});
```

---

### Priority 2: Transaction Functions

#### 2. process-deposit
**Purpose**: Handle deposit requests with crypto payment integration
**Path**: `supabase/functions/process-deposit`
**Deploy**: `supabase functions deploy process-deposit`

**Features**:
- Multiple payment methods (bank transfer, crypto, wire)
- Crypto payment address generation
- Bank transfer instructions
- KYC verification checks
- Minimum deposit validation
- Email notifications

**Usage**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/process-deposit`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    investorId: 'uuid',
    amount: 10000,
    currency: 'USD',
    paymentMethod: 'crypto',
    cryptoAssetId: 'uuid'
  })
});
```

#### 3. process-withdrawal
**Purpose**: Handle withdrawal requests with compliance checks
**Path**: `supabase/functions/process-withdrawal`
**Deploy**: `supabase functions deploy process-withdrawal`

**Features**:
- Comprehensive compliance checks
- Balance validation
- Daily/monthly limits
- AML screening
- Suspicious activity detection
- Manual review flagging
- Admin notifications

**Usage**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/process-withdrawal`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    investorId: 'uuid',
    amount: 5000,
    currency: 'USD',
    withdrawalMethod: 'bank_transfer',
    bankAccountId: 'uuid'
  })
});
```

---

### Priority 3: Analytics & Reporting

#### 4. calculate-performance
**Purpose**: Calculate MTD, QTD, YTD, ITD metrics
**Path**: `supabase/functions/calculate-performance`
**Deploy**: `supabase functions deploy calculate-performance`

**Features**:
- Modified Dietz return calculation
- Time-weighted returns
- Money-weighted returns
- Benchmark comparisons (S&P 500, NASDAQ, Bonds)
- Historical performance tracking

**Usage**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-performance`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    investorId: 'uuid',
    asOfDate: '2025-01-31',
    includeBenchmarks: true
  })
});
```

#### 5. generate-tax-documents
**Purpose**: Generate 1099 forms and tax reports
**Path**: `supabase/functions/generate-tax-documents`
**Deploy**: `supabase functions deploy generate-tax-documents`

**Features**:
- Form 1099-DIV generation
- Form 1099-INT generation
- Form 1099-B generation
- Tax summary reports
- PDF generation
- Secure storage

**Usage**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-tax-documents`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    investorId: 'uuid',
    taxYear: 2024,
    documentType: '1099-DIV',
    format: 'pdf'
  })
});
```

---

### Priority 4: Compliance & Security

#### 6. run-compliance-checks
**Purpose**: KYC/AML verification and compliance monitoring
**Path**: `supabase/functions/run-compliance-checks`
**Deploy**: `supabase functions deploy run-compliance-checks`

**Features**:
- KYC verification
- AML screening
- Sanctions list checking (OFAC, UN, EU)
- PEP (Politically Exposed Person) screening
- Adverse media checks
- Risk scoring
- Manual review workflows

**Usage**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/run-compliance-checks`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    investorId: 'uuid',
    checkType: 'full',
    forceRefresh: true
  })
});
```

---

### Priority 5: Integration Functions

#### 7. process-webhooks
**Purpose**: Handle webhooks from third-party services
**Path**: `supabase/functions/process-webhooks`
**Deploy**: `supabase functions deploy process-webhooks`

**Supported Providers**:
- Stripe (payments, subscriptions)
- Plaid (bank connections, transactions)
- Coinbase (crypto payments)
- Circle (USDC payments)
- DocuSign (document signing)
- Twilio (SMS, calls)
- SendGrid (email delivery)

**Usage**:
```bash
# Webhook URLs for each provider:
https://your-project.supabase.co/functions/v1/process-webhooks/stripe
https://your-project.supabase.co/functions/v1/process-webhooks/plaid
https://your-project.supabase.co/functions/v1/process-webhooks/coinbase
https://your-project.supabase.co/functions/v1/process-webhooks/circle
https://your-project.supabase.co/functions/v1/process-webhooks/docusign
https://your-project.supabase.co/functions/v1/process-webhooks/twilio
https://your-project.supabase.co/functions/v1/process-webhooks/sendgrid
```

---

## Deployment Steps

### Step 1: Deploy Individual Functions

Deploy each function individually:

```bash
# Deploy all new functions
supabase functions deploy generate-report
supabase functions deploy process-deposit
supabase functions deploy process-withdrawal
supabase functions deploy calculate-performance
supabase functions deploy generate-tax-documents
supabase functions deploy run-compliance-checks
supabase functions deploy process-webhooks
```

### Step 2: Deploy All Functions at Once

Or deploy all functions at once:

```bash
supabase functions deploy
```

### Step 3: Verify Deployments

Check function status:

```bash
supabase functions list
```

### Step 4: Test Functions

Test each function locally before production:

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve generate-report

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-report' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"reportId":"test","reportType":"portfolio_summary","format":"json"}'
```

---

## Database Requirements

The following tables must exist in your database:

### Core Tables
- `investors` - Investor profiles
- `transactions` - All transactions (deposits, withdrawals, trades)
- `positions` - Current positions
- `position_history` - Historical position snapshots
- `statements` - Monthly statements
- `generated_reports` - Report generation tracking

### Compliance Tables
- `compliance_checks` - Compliance check results
- `kyc_documents` - KYC documentation
- `bank_accounts` - Verified bank accounts

### Integration Tables
- `crypto_payments` - Crypto payment tracking
- `crypto_withdrawals` - Crypto withdrawal tracking
- `bank_withdrawals` - Bank withdrawal tracking
- `webhook_logs` - Webhook receipt logging
- `email_logs` - Email delivery tracking
- `audit_logs` - Audit trail

### Tax Tables
- `tax_documents` - Generated tax documents
- `distributions` - Distribution history
- `trades` - Trade history

### Performance Tables
- `performance_history` - Historical performance metrics
- `benchmark_indices` - Benchmark data

---

## Storage Buckets

Create the following storage buckets:

```sql
-- Reports bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false);

-- Tax documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-documents', 'tax-documents', false);

-- Set up RLS policies for secure access
CREATE POLICY "Investors can view their own reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Security Considerations

### Authentication
- All functions (except webhooks) require authentication
- Admin-only functions check user role
- Investor-scoped functions verify ownership

### Rate Limiting
Consider implementing rate limiting:
```typescript
// Add to function headers
'X-RateLimit-Limit': '100',
'X-RateLimit-Remaining': '99',
```

### CORS Configuration
CORS is configured to allow all origins. In production, restrict to your domain:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## Monitoring & Logging

### View Function Logs
```bash
supabase functions logs generate-report
supabase functions logs process-deposit --tail
```

### Monitor Performance
Check function execution time and error rates in Supabase Dashboard:
- Navigate to Edge Functions
- Select function
- View Logs and Metrics

---

## Troubleshooting

### Common Issues

#### 1. Authentication Error (401)
**Issue**: Missing or invalid authorization header
**Fix**: Ensure JWT token is included in Authorization header

#### 2. Deployment Failed
**Issue**: Docker not running or Supabase CLI not authenticated
**Fix**:
```bash
docker ps  # Verify Docker is running
supabase login  # Re-authenticate
```

#### 3. Function Timeout
**Issue**: Function exceeds execution time limit
**Fix**: Optimize queries, add indexes, or split into multiple functions

#### 4. CORS Error
**Issue**: Browser blocks request due to CORS
**Fix**: Check corsHeaders configuration in function

---

## Performance Optimization

### Best Practices

1. **Database Queries**
   - Use indexes on frequently queried columns
   - Limit result sets with pagination
   - Use select() to fetch only needed columns

2. **Caching**
   - Cache expensive calculations
   - Store computed metrics in database
   - Use Redis for session data

3. **Async Processing**
   - Use queue systems for long-running tasks
   - Return immediately, process in background
   - Update status via database

4. **Error Handling**
   - Always include try-catch blocks
   - Log errors to database
   - Return user-friendly error messages

---

## Production Checklist

Before going live:

- [ ] All functions deployed successfully
- [ ] Environment variables configured
- [ ] Database tables and indexes created
- [ ] Storage buckets created with RLS policies
- [ ] Webhook endpoints registered with providers
- [ ] CORS restricted to production domain
- [ ] Rate limiting implemented
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation updated
- [ ] Team trained on monitoring

---

## Support

For issues or questions:
1. Check function logs: `supabase functions logs <function-name>`
2. Review audit logs in database
3. Check webhook logs for integration issues
4. Monitor error rates in Supabase Dashboard

---

## Version History

**v1.0.0** - 2025-01-04
- Initial deployment of all Edge Functions
- generate-report
- process-deposit
- process-withdrawal
- calculate-performance
- generate-tax-documents
- run-compliance-checks
- process-webhooks
