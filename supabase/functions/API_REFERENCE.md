# Edge Functions API Reference

Complete API reference for all Supabase Edge Functions.

## Base URL

```
Production: https://your-project-ref.supabase.co/functions/v1
Local: http://localhost:54321/functions/v1
```

## Authentication

All endpoints (except webhooks) require JWT authentication:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

Get JWT token from Supabase Auth:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## generate-report

Generate async reports in multiple formats.

### Endpoint
```
POST /generate-report
```

### Request Body
```typescript
interface GenerateReportRequest {
  reportId: string;              // UUID of report record
  reportType: string;            // Type: portfolio_summary, transaction_history, etc.
  format: string;                // pdf, excel, csv, json
  filters?: {
    dateRangeStart?: string;     // ISO 8601 date
    dateRangeEnd?: string;       // ISO 8601 date
    [key: string]: any;
  };
  parameters?: Record<string, any>;
}
```

### Response
```typescript
interface GenerateReportResponse {
  success: boolean;
  reportId: string;
  storagePath: string;
  downloadUrl: string;           // Signed URL valid for 7 days
  fileSize: number;              // Bytes
  processingDuration: number;    // Milliseconds
}
```

### Example
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-report' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportId": "550e8400-e29b-41d4-a716-446655440000",
    "reportType": "portfolio_summary",
    "format": "pdf",
    "filters": {
      "dateRangeStart": "2025-01-01",
      "dateRangeEnd": "2025-01-31"
    }
  }'
```

### Status Codes
- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized
- `500` - Server error

---

## process-deposit

Handle deposit requests with payment integration.

### Endpoint
```
POST /process-deposit
```

### Request Body
```typescript
interface DepositRequest {
  investorId: string;            // UUID
  amount: number;                // USD amount
  currency: string;              // USD, EUR, etc.
  paymentMethod: 'bank_transfer' | 'crypto' | 'wire';
  cryptoAssetId?: string;        // Required for crypto deposits
  bankAccountId?: string;        // Required for bank transfers
  metadata?: Record<string, any>;
}
```

### Response
```typescript
interface DepositResponse {
  success: boolean;
  depositId: string;
  status: 'pending' | 'processing';
  amount: number;
  currency: string;
  paymentMethod: string;
  message: string;
  // For crypto deposits
  cryptoPayment?: {
    address: string;
    network: string;
    expectedAmount: number;
    expiresAt: string;
    paymentId: string;
  };
  // For bank transfers
  bankTransfer?: {
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    reference: string;
    instructions: string[];
  };
}
```

### Example
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/process-deposit' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "investorId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 10000,
    "currency": "USD",
    "paymentMethod": "crypto",
    "cryptoAssetId": "660e8400-e29b-41d4-a716-446655440000"
  }'
```

### Validation Rules
- Minimum deposit: $1,000
- KYC must be approved
- Account must be active

### Status Codes
- `200` - Success
- `400` - Validation error
- `401` - Unauthorized
- `403` - KYC not approved

---

## process-withdrawal

Handle withdrawal requests with compliance checks.

### Endpoint
```
POST /process-withdrawal
```

### Request Body
```typescript
interface WithdrawalRequest {
  investorId: string;
  amount: number;
  currency: string;
  withdrawalMethod: 'bank_transfer' | 'crypto' | 'wire';
  cryptoAssetId?: string;
  cryptoAddress?: string;
  bankAccountId?: string;
  reason?: string;
  metadata?: Record<string, any>;
}
```

### Response
```typescript
interface WithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  status: 'pending' | 'pending_review';
  amount: number;
  currency: string;
  withdrawalMethod: string;
  requiresManualReview: boolean;
  message: string;
  estimatedProcessingTime: string;
}
```

### Example
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/process-withdrawal' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "investorId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 5000,
    "currency": "USD",
    "withdrawalMethod": "bank_transfer",
    "bankAccountId": "770e8400-e29b-41d4-a716-446655440000"
  }'
```

### Compliance Checks
- Daily limit: $50,000
- Monthly limit: $200,000
- Large withdrawal threshold: $25,000 (requires review)
- AML status check
- Suspicious activity detection
- Minimum holding period: 7 days

### Status Codes
- `200` - Success
- `400` - Validation error (insufficient balance, limits exceeded)
- `401` - Unauthorized
- `403` - Compliance check failed

---

## calculate-performance

Calculate investment performance metrics.

### Endpoint
```
POST /calculate-performance
```

### Request Body
```typescript
interface PerformanceRequest {
  investorId: string;
  asOfDate?: string;            // ISO 8601 date (defaults to today)
  includeBenchmarks?: boolean;  // Include benchmark comparisons
}
```

### Response
```typescript
interface PerformanceResponse {
  success: boolean;
  investorId: string;
  asOfDate: string;
  metrics: {
    mtd: PerformanceData;
    qtd: PerformanceData;
    ytd: PerformanceData;
    itd: PerformanceData;
    benchmarks?: BenchmarkData;
  };
}

interface PerformanceData {
  returnPercent: number;
  returnDollar: number;
  startValue: number;
  endValue: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netDeposits: number;
  startDate: string;
  endDate: string;
}

interface BenchmarkData {
  sp500: { mtd: number; qtd: number; ytd: number; itd: number };
  nasdaq: { mtd: number; qtd: number; ytd: number; itd: number };
  bonds: { mtd: number; qtd: number; ytd: number; itd: number };
}
```

### Example
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/calculate-performance' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "investorId": "550e8400-e29b-41d4-a716-446655440000",
    "asOfDate": "2025-01-31",
    "includeBenchmarks": true
  }'
```

### Calculation Method
- Uses Modified Dietz method for return calculation
- Accounts for timing and size of cash flows
- Stored in performance_history table

### Status Codes
- `200` - Success
- `400` - No transactions found
- `401` - Unauthorized

---

## generate-tax-documents

Generate tax forms and reports.

### Endpoint
```
POST /generate-tax-documents
```

### Request Body
```typescript
interface TaxDocumentRequest {
  investorId: string;
  taxYear: number;
  documentType: '1099-DIV' | '1099-INT' | '1099-B' | 'tax_summary';
  format?: 'pdf' | 'json';
}
```

### Response
```typescript
interface TaxDocumentResponse {
  success: boolean;
  documentId: string;
  documentType: string;
  taxYear: number;
  format: string;
  downloadUrl?: string;        // PDF download URL
  data?: any;                  // JSON data (if format=json)
}
```

### Example
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-tax-documents' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "investorId": "550e8400-e29b-41d4-a716-446655440000",
    "taxYear": 2024,
    "documentType": "1099-DIV",
    "format": "pdf"
  }'
```

### Document Types

**1099-DIV**
- Ordinary dividends
- Qualified dividends
- Capital gain distributions

**1099-INT**
- Interest income
- Early withdrawal penalty
- Tax-exempt interest

**1099-B**
- Proceeds from sales
- Cost basis
- Short-term/long-term gains

**tax_summary**
- Comprehensive tax summary
- All income types
- Estimated tax liability

### Status Codes
- `200` - Success
- `400` - Invalid tax year
- `401` - Unauthorized

---

## run-compliance-checks

Run KYC/AML compliance checks.

### Endpoint
```
POST /run-compliance-checks
```

### Authorization
**Admin only** - Regular users cannot access this endpoint

### Request Body
```typescript
interface ComplianceCheckRequest {
  investorId: string;
  checkType: 'kyc' | 'aml' | 'sanctions' | 'pep' | 'adverse_media' | 'full';
  forceRefresh?: boolean;      // Skip 24-hour cache
}
```

### Response
```typescript
interface ComplianceCheckResponse {
  success: boolean;
  result: {
    checkId: string;
    investorId: string;
    checkType: string;
    status: 'passed' | 'failed' | 'needs_review' | 'pending';
    checks: CheckResult[];
    riskScore: number;           // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    requiresManualReview: boolean;
    timestamp: string;
    summary: string;
  };
  cached: boolean;               // Whether result was cached
}

interface CheckResult {
  checkName: string;
  passed: boolean;
  riskScore: number;
  details: any;
  message: string;
}
```

### Example
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/run-compliance-checks' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "investorId": "550e8400-e29b-41d4-a716-446655440000",
    "checkType": "full",
    "forceRefresh": true
  }'
```

### Check Types

**KYC (Know Your Customer)**
- Identity verification
- Age verification
- Address verification
- Accredited investor status

**AML (Anti-Money Laundering)**
- Transaction pattern analysis
- Structuring detection
- Rapid fund movement
- Large cash transactions

**Sanctions**
- OFAC sanctions list
- UN sanctions list
- EU sanctions list

**PEP (Politically Exposed Person)**
- PEP database screening

**Adverse Media**
- Media monitoring check

### Risk Scoring
- 0-24: Low risk
- 25-49: Medium risk
- 50-100: High risk

### Status Codes
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized
- `403` - Admin access required

---

## process-webhooks

Handle third-party webhooks.

### Endpoints
```
POST /process-webhooks/stripe
POST /process-webhooks/plaid
POST /process-webhooks/coinbase
POST /process-webhooks/circle
POST /process-webhooks/docusign
POST /process-webhooks/twilio
POST /process-webhooks/sendgrid
```

### Authentication
Uses signature verification (no JWT required)

### Stripe Events
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.succeeded`
- `charge.refunded`
- `customer.subscription.*`

### Plaid Events
- `DEFAULT_UPDATE` - New transactions
- `TRANSACTIONS_REMOVED` - Deleted transactions
- `ITEM_LOGIN_REQUIRED` - Reauth needed
- `ERROR` - Error occurred

### Coinbase Events
- `charge:confirmed` - Payment confirmed
- `charge:failed` - Payment failed
- `charge:pending` - Payment pending

### Circle Events
- `transfer.confirmed` - USDC transfer confirmed
- `transfer.failed` - USDC transfer failed

### DocuSign Events
- `envelope-completed` - Document signed
- `envelope-declined` - Document declined
- `envelope-voided` - Document voided

### Twilio Events
- `delivered` - SMS delivered
- `failed` - SMS failed
- `undelivered` - SMS undelivered

### SendGrid Events
- `delivered` - Email delivered
- `bounce` - Email bounced
- `dropped` - Email dropped
- `open` - Email opened
- `click` - Link clicked

### Example (Stripe)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/process-webhooks/stripe' \
  -H 'stripe-signature: t=1234567890,v1=signature_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_123",
        "metadata": {
          "transaction_id": "550e8400-e29b-41d4-a716-446655440000"
        }
      }
    }
  }'
```

### Status Codes
- `200` - Webhook received and processed
- `400` - Invalid signature or payload

---

## Error Responses

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: string;              // Human-readable error message
  code?: string;              // Error code (optional)
  details?: any;              // Additional details (optional)
}
```

### Common Error Codes

| Code | Description | Status |
|------|-------------|--------|
| `unauthorized` | Missing or invalid authentication | 401 |
| `forbidden` | Insufficient permissions | 403 |
| `not_found` | Resource not found | 404 |
| `validation_error` | Invalid request parameters | 400 |
| `kyc_required` | KYC approval required | 403 |
| `insufficient_balance` | Insufficient funds | 400 |
| `limit_exceeded` | Transaction limit exceeded | 400 |
| `compliance_failed` | Compliance check failed | 403 |
| `server_error` | Internal server error | 500 |

---

## Rate Limits

### Default Limits
- 100 requests per minute per IP
- 1000 requests per hour per user

### Exceeded Response
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

Status: `429 Too Many Requests`

---

## Webhooks Setup

### Configure Webhook URLs

Register these URLs with third-party services:

```
Stripe: https://your-project.supabase.co/functions/v1/process-webhooks/stripe
Plaid: https://your-project.supabase.co/functions/v1/process-webhooks/plaid
Coinbase: https://your-project.supabase.co/functions/v1/process-webhooks/coinbase
Circle: https://your-project.supabase.co/functions/v1/process-webhooks/circle
DocuSign: https://your-project.supabase.co/functions/v1/process-webhooks/docusign
Twilio: https://your-project.supabase.co/functions/v1/process-webhooks/twilio
SendGrid: https://your-project.supabase.co/functions/v1/process-webhooks/sendgrid
```

### Set Webhook Secrets

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set PLAID_WEBHOOK_SECRET=...
supabase secrets set COINBASE_WEBHOOK_SECRET=...
supabase secrets set CIRCLE_WEBHOOK_SECRET=...
```

---

## Testing

### Test Authentication

```bash
# Get auth token
TOKEN=$(curl -X POST 'https://your-project.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.access_token')

# Use token
curl -X POST 'https://your-project.supabase.co/functions/v1/calculate-performance' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"investorId":"uuid"}'
```

### Test Locally

```bash
# Start local Supabase
supabase start

# Serve function
supabase functions serve calculate-performance

# Test
curl -X POST 'http://localhost:54321/functions/v1/calculate-performance' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"investorId":"uuid"}'
```

---

## Support

For API issues:
1. Check function logs: `supabase functions logs <function-name>`
2. Review error response details
3. Verify authentication and parameters
4. Contact support with request ID

---

## Version

API Version: 1.0.0
Last Updated: 2025-01-04
