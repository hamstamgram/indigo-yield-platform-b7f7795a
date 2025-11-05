# Supabase Edge Functions

This directory contains all Supabase Edge Functions for the Indigo Yield Platform.

## Quick Start

### Deploy All Functions

```bash
# Make script executable (first time only)
chmod +x deploy-all.sh

# Deploy all functions
./deploy-all.sh
```

### Deploy Individual Function

```bash
supabase functions deploy <function-name>
```

## Available Functions

### Core Functions

#### generate-report
Async report generation with multiple format support (PDF, Excel, CSV, JSON).

**Endpoint**: `/functions/v1/generate-report`
**Auth**: Required
**Role**: Investor, Admin

```typescript
POST /functions/v1/generate-report
{
  "reportId": "uuid",
  "reportType": "portfolio_summary",
  "format": "pdf"
}
```

---

### Transaction Processing

#### process-deposit
Handle deposit requests with crypto payment integration.

**Endpoint**: `/functions/v1/process-deposit`
**Auth**: Required
**Role**: Investor, Admin

```typescript
POST /functions/v1/process-deposit
{
  "investorId": "uuid",
  "amount": 10000,
  "currency": "USD",
  "paymentMethod": "crypto",
  "cryptoAssetId": "uuid"
}
```

#### process-withdrawal
Handle withdrawal requests with compliance checks.

**Endpoint**: `/functions/v1/process-withdrawal`
**Auth**: Required
**Role**: Investor, Admin

```typescript
POST /functions/v1/process-withdrawal
{
  "investorId": "uuid",
  "amount": 5000,
  "currency": "USD",
  "withdrawalMethod": "bank_transfer",
  "bankAccountId": "uuid"
}
```

---

### Analytics & Performance

#### calculate-performance
Calculate MTD, QTD, YTD, ITD metrics.

**Endpoint**: `/functions/v1/calculate-performance`
**Auth**: Required
**Role**: Investor, Admin

```typescript
POST /functions/v1/calculate-performance
{
  "investorId": "uuid",
  "asOfDate": "2025-01-31",
  "includeBenchmarks": true
}
```

#### generate-tax-documents
Generate 1099 forms and tax reports.

**Endpoint**: `/functions/v1/generate-tax-documents`
**Auth**: Required
**Role**: Investor, Admin

```typescript
POST /functions/v1/generate-tax-documents
{
  "investorId": "uuid",
  "taxYear": 2024,
  "documentType": "1099-DIV",
  "format": "pdf"
}
```

---

### Compliance & Security

#### run-compliance-checks
KYC/AML verification and compliance monitoring.

**Endpoint**: `/functions/v1/run-compliance-checks`
**Auth**: Required
**Role**: Admin only

```typescript
POST /functions/v1/run-compliance-checks
{
  "investorId": "uuid",
  "checkType": "full",
  "forceRefresh": true
}
```

---

### Integrations

#### process-webhooks
Handle webhooks from third-party services.

**Endpoints**:
- `/functions/v1/process-webhooks/stripe`
- `/functions/v1/process-webhooks/plaid`
- `/functions/v1/process-webhooks/coinbase`
- `/functions/v1/process-webhooks/circle`
- `/functions/v1/process-webhooks/docusign`
- `/functions/v1/process-webhooks/twilio`
- `/functions/v1/process-webhooks/sendgrid`

**Auth**: Signature verification (no JWT required)

---

## Environment Setup

### Required Environment Variables

```bash
# Core
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Features
ENABLE_EMAIL_NOTIFICATIONS=true

# Webhooks
STRIPE_WEBHOOK_SECRET=whsec_...
PLAID_WEBHOOK_SECRET=...
COINBASE_WEBHOOK_SECRET=...
CIRCLE_WEBHOOK_SECRET=...

# Development
ALLOW_UNSIGNED_WEBHOOKS=false
```

### Set Environment Variables

```bash
supabase secrets set VARIABLE_NAME=value
```

### View Environment Variables

```bash
supabase secrets list
```

---

## Local Development

### Start Local Supabase

```bash
supabase start
```

### Serve Function Locally

```bash
supabase functions serve <function-name>
```

### Test Locally

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/<function-name>' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"key":"value"}'
```

---

## Monitoring

### View Logs

```bash
# View recent logs
supabase functions logs <function-name>

# Tail logs in real-time
supabase functions logs <function-name> --tail
```

### Check Function Status

```bash
supabase functions list
```

---

## Testing

### Unit Tests

Create test files in each function directory:

```typescript
// functions/<function-name>/test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("Function test", () => {
  // Test logic here
});
```

Run tests:

```bash
deno test functions/<function-name>/test.ts
```

### Integration Tests

Use the provided test scripts in `tests/edge-functions/`:

```bash
cd tests/edge-functions
deno run --allow-net test-all-functions.ts
```

---

## Security

### Authentication

All functions (except webhooks) require JWT authentication:

```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader.replace('Bearer ', '');
```

### Authorization

Functions check user roles:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'admin') {
  throw new Error('Unauthorized');
}
```

### Rate Limiting

Implement rate limiting for production:

```typescript
// Check request count from IP
const requestCount = await checkRequestCount(ip);
if (requestCount > limit) {
  return new Response('Too many requests', { status: 429 });
}
```

---

## Troubleshooting

### Common Issues

**Authentication Error (401)**
- Verify JWT token is valid
- Check Authorization header format
- Ensure user has required permissions

**Function Timeout**
- Optimize database queries
- Add indexes to frequently queried columns
- Consider splitting into multiple functions

**CORS Error**
- Check corsHeaders configuration
- Verify allowed origins in production

**Webhook Signature Verification Failed**
- Verify webhook secret is correct
- Check signature header name
- Ensure raw body is used for verification

---

## Documentation

For detailed documentation, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [API_REFERENCE.md](./API_REFERENCE.md) - API endpoint documentation
- Individual function README files in each directory

---

## Architecture

```
supabase/functions/
├── _shared/              # Shared utilities
│   └── cors.ts
├── generate-report/      # Report generation
├── process-deposit/      # Deposit handling
├── process-withdrawal/   # Withdrawal handling
├── calculate-performance/# Performance metrics
├── generate-tax-documents/# Tax forms
├── run-compliance-checks/# KYC/AML
├── process-webhooks/     # Third-party webhooks
├── deploy-all.sh         # Deployment script
├── DEPLOYMENT_GUIDE.md   # Deployment docs
└── README.md            # This file
```

---

## Support

For questions or issues:

1. Check function logs
2. Review deployment guide
3. Test locally before deploying
4. Contact DevOps team

---

## Contributing

When adding new Edge Functions:

1. Create function directory with `index.ts`
2. Add CORS headers
3. Implement authentication
4. Add error handling
5. Write tests
6. Update documentation
7. Add to deployment script

---

## License

Proprietary - Indigo Capital LLC
