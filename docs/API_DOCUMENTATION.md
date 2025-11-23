# Indigo Yield Platform - API Documentation

**Version:** 1.0.0
**Last Updated:** November 22, 2025
**Base URL:** `https://your-project-ref.supabase.co/functions/v1`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Core API Endpoints](#core-api-endpoints)
6. [Financial Operations](#financial-operations)
7. [Reporting & Analytics](#reporting--analytics)
8. [Admin Operations](#admin-operations)
9. [Security & MFA](#security--mfa)
10. [Webhooks](#webhooks)
11. [OpenAPI Specification](#openapi-specification)

---

## Overview

The Indigo Yield Platform API is built on **Supabase Edge Functions** (Deno runtime) providing:
- RESTful architecture
- JWT-based authentication
- Automatic rate limiting
- Real-time data via Supabase Realtime
- ACID-compliant financial transactions

### Technology Stack

- **Runtime**: Deno on Supabase Edge Functions
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (JWT)
- **Storage**: Supabase Storage
- **Validation**: Zod
- **Financial Calculations**: Decimal.js

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1` |
| Staging | `https://staging-ref.supabase.co/functions/v1` |
| Local | `http://localhost:54321/functions/v1` |

---

## Authentication

### Overview

All API endpoints (except webhooks) require JWT authentication via Supabase Auth.

### Getting a Token

**Client-Side (JavaScript):**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
});

// Get access token
const token = data.session?.access_token;
```

**HTTP Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Lifecycle

- **Expiration**: 1 hour (3600 seconds)
- **Refresh**: Automatic via Supabase client
- **Revocation**: Immediate via logout or admin action

### Authorization Levels

| Role | Description | Capabilities |
|------|-------------|--------------|
| `investor` | Regular investor account | View portfolio, transactions, statements |
| `admin` | Platform administrator | Full system access, user management |
| `super_admin` | Super administrator | All admin capabilities + system configuration |

**Role Check Example:**
```typescript
// Check user role
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin, is_super_admin')
  .eq('id', user.id)
  .single();

if (profile.is_admin) {
  // Admin operations
}
```

---

## Rate Limiting

### Rate Limit Policies

| Endpoint Category | Limit | Window | Headers |
|------------------|-------|--------|---------|
| Authentication | 5 requests | 15 minutes | `X-RateLimit-*` |
| Standard API | 100 requests | 15 minutes | `X-RateLimit-*` |
| Financial Transactions | 10 requests | 1 hour | `X-RateLimit-*` |
| Withdrawals | 3 requests | 24 hours | `X-RateLimit-*` |
| Admin Operations | 200 requests | 15 minutes | `X-RateLimit-*` |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1732322400
Retry-After: 900
```

### Rate Limit Exceeded Response

**Status Code**: `429 Too Many Requests`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": 900,
    "limit": 100,
    "remaining": 0,
    "resetAt": "2025-11-22T10:00:00Z"
  }
}
```

### Handling Rate Limits

```typescript
async function apiRequestWithRetry(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');

    console.log(`Rate limited. Retrying in ${retryAfter} seconds...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

    return apiRequestWithRetry(url, options);
  }

  return response;
}
```

---

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: any;          // Additional context
    timestamp: string;      // ISO 8601 timestamp
    requestId?: string;     // For support inquiries
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `204` | No Content | Request successful, no content to return |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (e.g., duplicate) |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |
| `503` | Service Unavailable | Temporary service disruption |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INSUFFICIENT_BALANCE` | 400 | Not enough funds |
| `KYC_REQUIRED` | 403 | KYC verification required |
| `ACCOUNT_SUSPENDED` | 403 | Account suspended |
| `DUPLICATE_TRANSACTION` | 409 | Transaction already exists |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Responses

**Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "amount": "Amount must be greater than 0",
      "email": "Invalid email format"
    },
    "timestamp": "2025-11-22T10:30:00Z"
  }
}
```

**Authorization Error:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this resource",
    "timestamp": "2025-11-22T10:30:00Z"
  }
}
```

**Server Error:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req_abc123xyz",
    "timestamp": "2025-11-22T10:30:00Z"
  }
}
```

---

## Core API Endpoints

### Portfolio API

Get comprehensive portfolio information for an investor.

**Endpoint:** `GET /portfolio-api`

**Query Parameters:**
- `investorId` (required): UUID of the investor

**Response:**
```typescript
interface PortfolioResponse {
  success: boolean;
  data: {
    investor: {
      id: string;
      name: string;
      email: string;
      status: 'active' | 'pending' | 'suspended';
      kycStatus: 'approved' | 'pending' | 'rejected';
      joinedAt: string;
    };
    portfolios: Array<{
      id: string;
      name: string;
      type: 'crypto' | 'real_estate' | 'mixed';
      totalValue: number;
      currentBalance: number;
      totalDeposits: number;
      totalWithdrawals: number;
      totalDividends: number;
      roi: number;
      yieldRate: number;
      performance: {
        daily: number;
        weekly: number;
        monthly: number;
        yearly: number;
        ytd: number;
        allTime: number;
      };
      assets: Array<{
        id: string;
        name: string;
        symbol: string;
        quantity: number;
        avgCost: number;
        currentPrice: number;
        totalValue: number;
        allocation: number; // Percentage
        pnl: number;
        pnlPercent: number;
      }>;
    }>;
    transactions: Array<{
      id: string;
      type: 'deposit' | 'withdrawal' | 'dividend' | 'fee';
      amount: number;
      currency: string;
      status: 'pending' | 'completed' | 'failed';
      createdAt: string;
      completedAt: string | null;
      description: string;
    }>;
    summary: {
      totalValue: number;
      totalDeposits: number;
      totalWithdrawals: number;
      netInvestment: number;
      totalReturns: number;
      roiPercent: number;
      averageYield: number;
    };
  };
}
```

**Example Request:**
```bash
curl -X GET 'https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1/portfolio-api?investorId=550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

### Calculate Performance

Calculate portfolio performance metrics over specified period.

**Endpoint:** `POST /calculate-performance`

**Request Body:**
```typescript
interface PerformanceRequest {
  portfolioId: string;
  startDate: string;     // ISO 8601 date
  endDate: string;       // ISO 8601 date
  includeAssetBreakdown?: boolean;
}
```

**Response:**
```typescript
interface PerformanceResponse {
  success: boolean;
  data: {
    portfolioId: string;
    period: {
      start: string;
      end: string;
      days: number;
    };
    performance: {
      absoluteReturn: number;
      percentReturn: number;
      annualizedReturn: number;
      volatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
    benchmarks: {
      sp500: number;
      bitcoin: number;
      gold: number;
    };
    assetBreakdown?: Array<{
      assetId: string;
      name: string;
      return: number;
      contribution: number;
    }>;
  };
}
```

**Example Request:**
```bash
curl -X POST 'https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1/calculate-performance' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "portfolioId": "550e8400-e29b-41d4-a716-446655440000",
    "startDate": "2025-01-01",
    "endDate": "2025-11-22",
    "includeAssetBreakdown": true
  }'
```

---

### Calculate Yield

Calculate yield metrics for portfolios.

**Endpoint:** `POST /calculate-yield`

**Request Body:**
```typescript
interface YieldRequest {
  portfolioId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}
```

**Response:**
```typescript
interface YieldResponse {
  success: boolean;
  data: {
    portfolioId: string;
    yieldMetrics: {
      currentYield: number;           // Current yield rate
      averageYield: number;           // Historical average
      yieldTrend: 'increasing' | 'decreasing' | 'stable';
      yieldHistory: Array<{
        date: string;
        yield: number;
      }>;
    };
    dividends: {
      totalDividends: number;
      lastDividend: {
        amount: number;
        date: string;
        type: string;
      };
      nextProjectedDividend: {
        amount: number;
        estimatedDate: string;
      };
    };
  };
}
```

---

## Financial Operations

### Process Deposit

Initiate a deposit transaction.

**Endpoint:** `POST /process-deposit`

**Request Body:**
```typescript
interface DepositRequest {
  investorId: string;
  amount: number;                // Minimum $1,000
  currency: string;              // USD, EUR, etc.
  paymentMethod: 'bank_transfer' | 'crypto' | 'wire';
  cryptoAssetId?: string;        // Required for crypto
  bankAccountId?: string;        // Required for bank transfer
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
interface DepositResponse {
  success: boolean;
  depositId: string;
  status: 'pending' | 'processing';
  amount: number;
  currency: string;
  paymentMethod: string;
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
    reference: string;
    instructions: string[];
  };
}
```

**Validation Rules:**
- Minimum deposit: $1,000
- KYC must be approved
- Account must be active

**Example Request:**
```bash
curl -X POST 'https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1/process-deposit' \
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

---

### Process Withdrawal

Request a withdrawal from portfolio.

**Endpoint:** `POST /process-withdrawal`

**Request Body:**
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

**Response:**
```typescript
interface WithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  status: 'pending' | 'pending_review' | 'approved' | 'rejected';
  amount: number;
  fee: number;
  netAmount: number;
  requiresManualReview: boolean;
  estimatedCompletionDate: string;
  message: string;
}
```

**Validation Rules:**
- Minimum withdrawal: $100
- Maximum withdrawal: Available balance
- Withdrawal fee: 0.5% (minimum $10)
- Processing time: 3-5 business days

**Example Request:**
```bash
curl -X POST 'https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1/process-withdrawal' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "investorId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 5000,
    "currency": "USD",
    "withdrawalMethod": "bank_transfer",
    "bankAccountId": "770e8400-e29b-41d4-a716-446655440000",
    "reason": "Personal expenses"
  }'
```

---

## Reporting & Analytics

### Generate Report

Generate reports in multiple formats (PDF, Excel, CSV, JSON).

**Endpoint:** `POST /generate-report`

**Request Body:**
```typescript
interface GenerateReportRequest {
  reportType: 'portfolio_summary' | 'transaction_history' | 'tax_summary' | 'performance_report';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  investorId?: string;          // For investor-specific reports
  filters?: {
    dateRangeStart?: string;
    dateRangeEnd?: string;
    portfolioId?: string;
    includeCharts?: boolean;
  };
  parameters?: Record<string, any>;
}
```

**Response:**
```typescript
interface GenerateReportResponse {
  success: boolean;
  reportId: string;
  storagePath: string;
  downloadUrl: string;           // Signed URL, valid for 7 days
  fileSize: number;              // Bytes
  format: string;
  expiresAt: string;
  processingDuration: number;    // Milliseconds
}
```

**Example Request:**
```bash
curl -X POST 'https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1/generate-report' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportType": "portfolio_summary",
    "format": "pdf",
    "investorId": "550e8400-e29b-41d4-a716-446655440000",
    "filters": {
      "dateRangeStart": "2025-01-01",
      "dateRangeEnd": "2025-11-22",
      "includeCharts": true
    }
  }'
```

---

### Generate Tax Documents

Generate tax documents (1099, etc.) for investors.

**Endpoint:** `POST /generate-tax-documents`

**Request Body:**
```typescript
interface TaxDocumentRequest {
  investorId: string;
  taxYear: number;              // e.g., 2025
  documentType: '1099-DIV' | '1099-INT' | 'tax_summary';
  format: 'pdf' | 'json';
}
```

**Response:**
```typescript
interface TaxDocumentResponse {
  success: boolean;
  documentId: string;
  documentType: string;
  taxYear: number;
  downloadUrl: string;
  fileSize: number;
  generatedAt: string;
}
```

---

### Excel Export

Export data to Excel format.

**Endpoint:** `POST /excel_export`

**Request Body:**
```typescript
interface ExcelExportRequest {
  exportType: 'transactions' | 'portfolios' | 'investors' | 'custom';
  investorId?: string;
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: string[];
  };
  columns?: string[];           // Custom column selection
  includeFormatting?: boolean;  // Excel styling
}
```

**Response:**
```typescript
interface ExcelExportResponse {
  success: boolean;
  downloadUrl: string;
  fileSize: number;
  recordCount: number;
  expiresAt: string;
}
```

---

### Excel Import

Import bulk data from Excel files.

**Endpoint:** `POST /excel_import`

**Request:** Multipart form-data

**Form Fields:**
- `file`: Excel file (.xlsx)
- `importType`: `investors` | `transactions` | `portfolios`
- `validateOnly`: `true` | `false` (dry run)

**Response:**
```typescript
interface ExcelImportResponse {
  success: boolean;
  importId: string;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    imported: number;
  };
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  validationReport?: {
    downloadUrl: string;
  };
}
```

---

## Admin Operations

### Admin User Management

Manage user accounts (admin only).

**Endpoint:** `POST /admin-user-management`

**Request Body:**
```typescript
interface AdminUserManagementRequest {
  action: 'create' | 'update' | 'suspend' | 'activate' | 'delete';
  userId?: string;              // Required for update/suspend/activate/delete
  userData?: {
    email: string;
    name: string;
    role: 'investor' | 'admin';
    isAdmin?: boolean;
    metadata?: Record<string, any>;
  };
}
```

**Response:**
```typescript
interface AdminUserManagementResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}
```

---

### Investor Audit

Perform compliance audit on investor account (admin only).

**Endpoint:** `POST /investor-audit`

**Request Body:**
```typescript
interface InvestorAuditRequest {
  investorId: string;
  auditType: 'kyc' | 'aml' | 'transaction' | 'comprehensive';
  includeHistory?: boolean;
}
```

**Response:**
```typescript
interface InvestorAuditResponse {
  success: boolean;
  audit: {
    investorId: string;
    auditType: string;
    status: 'passed' | 'flagged' | 'failed';
    score: number;              // 0-100
    findings: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }>;
    kycStatus: {
      verified: boolean;
      documents: string[];
      verifiedAt: string | null;
    };
    amlStatus: {
      passed: boolean;
      riskScore: number;
      flags: string[];
    };
    complianceIssues: string[];
  };
  auditId: string;
  auditedAt: string;
  auditedBy: string;
}
```

---

### Run Compliance Checks

Execute automated compliance checks (admin only).

**Endpoint:** `POST /run-compliance-checks`

**Request Body:**
```typescript
interface ComplianceCheckRequest {
  checkType: 'all' | 'kyc' | 'aml' | 'transaction_monitoring';
  investorId?: string;          // Specific investor or all
  severity?: 'all' | 'high' | 'critical';
}
```

**Response:**
```typescript
interface ComplianceCheckResponse {
  success: boolean;
  summary: {
    totalChecked: number;
    passed: number;
    flagged: number;
    failed: number;
  };
  flaggedInvestors: Array<{
    investorId: string;
    name: string;
    issues: string[];
    severity: string;
  }>;
  recommendations: string[];
}
```

---

## Security & MFA

### MFA - Initiate TOTP

Initiate TOTP (Time-based One-Time Password) setup.

**Endpoint:** `POST /mfa-totp-initiate`

**Response:**
```typescript
interface MFAInitiateResponse {
  success: boolean;
  secret: string;               // Base32 encoded secret
  qrCode: string;              // Data URL for QR code
  backupCodes: string[];       // 10 backup codes
  message: string;
}
```

**Example Request:**
```bash
curl -X POST 'https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1/mfa-totp-initiate' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

### MFA - Verify TOTP

Verify TOTP code to complete MFA setup.

**Endpoint:** `POST /mfa-totp-verify`

**Request Body:**
```typescript
interface MFAVerifyRequest {
  token: string;                // 6-digit TOTP code
  secret: string;               // Secret from initiate step
}
```

**Response:**
```typescript
interface MFAVerifyResponse {
  success: boolean;
  verified: boolean;
  message: string;
}
```

---

### MFA - Check Status

Check MFA status for current user.

**Endpoint:** `GET /mfa-totp-status`

**Response:**
```typescript
interface MFAStatusResponse {
  success: boolean;
  mfaEnabled: boolean;
  totpEnabled: boolean;
  backupCodesRemaining: number;
  lastVerified: string | null;
}
```

---

### MFA - Disable

Disable MFA for current user.

**Endpoint:** `POST /mfa-totp-disable`

**Request Body:**
```typescript
interface MFADisableRequest {
  token: string;                // Current TOTP code for verification
}
```

**Response:**
```typescript
interface MFADisableResponse {
  success: boolean;
  message: string;
}
```

---

## Webhooks

### Process Webhooks

Handle incoming webhooks from payment providers, KYC services, etc.

**Endpoint:** `POST /process-webhooks`

**No authentication required** (verified via webhook signature)

**Request Headers:**
```
X-Webhook-Signature: sha256=abc123...
X-Webhook-Id: wh_abc123
X-Webhook-Timestamp: 1732322400
```

**Request Body:**
```typescript
interface WebhookEvent {
  id: string;
  type: string;                 // e.g., 'payment.completed'
  created: number;              // Unix timestamp
  data: {
    object: Record<string, any>;
  };
}
```

**Response:**
```typescript
interface WebhookResponse {
  received: boolean;
  processed: boolean;
  eventId: string;
}
```

**Supported Webhook Types:**
- `payment.completed` - Payment successfully processed
- `payment.failed` - Payment failed
- `kyc.approved` - KYC verification approved
- `kyc.rejected` - KYC verification rejected
- `withdrawal.approved` - Withdrawal approved
- `withdrawal.rejected` - Withdrawal rejected

---

## OpenAPI Specification

### Full OpenAPI 3.1 Spec

**File:** `/docs/openapi.yaml`

```yaml
openapi: 3.1.0
info:
  title: Indigo Yield Platform API
  description: Complete API for the Indigo Yield investment platform
  version: 1.0.0
  contact:
    name: API Support
    email: api@indigoyield.com
  license:
    name: Proprietary

servers:
  - url: https://mdngruhkxlrsgwwlfqru.supabase.co/functions/v1
    description: Production
  - url: https://staging-ref.supabase.co/functions/v1
    description: Staging
  - url: http://localhost:54321/functions/v1
    description: Local development

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token from Supabase Auth

  schemas:
    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: VALIDATION_ERROR
        message:
          type: string
          example: Invalid request parameters
        details:
          type: object
        timestamp:
          type: string
          format: date-time
        requestId:
          type: string

    Portfolio:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        type:
          type: string
          enum: [crypto, real_estate, mixed]
        totalValue:
          type: number
          format: double
        currentBalance:
          type: number
        roi:
          type: number
        yieldRate:
          type: number

    Transaction:
      type: object
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
          enum: [deposit, withdrawal, dividend, fee]
        amount:
          type: number
        currency:
          type: string
        status:
          type: string
          enum: [pending, completed, failed]
        createdAt:
          type: string
          format: date-time

paths:
  /portfolio-api:
    get:
      summary: Get Portfolio Information
      description: Retrieve comprehensive portfolio data for an investor
      tags:
        - Portfolio
      parameters:
        - name: investorId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /process-deposit:
    post:
      summary: Process Deposit
      description: Initiate a deposit transaction
      tags:
        - Financial Operations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - investorId
                - amount
                - currency
                - paymentMethod
              properties:
                investorId:
                  type: string
                  format: uuid
                amount:
                  type: number
                  minimum: 1000
                currency:
                  type: string
                  default: USD
                paymentMethod:
                  type: string
                  enum: [bank_transfer, crypto, wire]
      responses:
        '200':
          description: Deposit initiated successfully
        '400':
          description: Validation error
        '403':
          description: KYC not approved

  /process-withdrawal:
    post:
      summary: Process Withdrawal
      description: Request withdrawal from portfolio
      tags:
        - Financial Operations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - investorId
                - amount
                - withdrawalMethod
              properties:
                investorId:
                  type: string
                  format: uuid
                amount:
                  type: number
                  minimum: 100
                withdrawalMethod:
                  type: string
                  enum: [bank_transfer, crypto, wire]
      responses:
        '200':
          description: Withdrawal request created

  /generate-report:
    post:
      summary: Generate Report
      description: Generate reports in multiple formats
      tags:
        - Reporting
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - reportType
                - format
              properties:
                reportType:
                  type: string
                  enum: [portfolio_summary, transaction_history, tax_summary]
                format:
                  type: string
                  enum: [pdf, excel, csv, json]
      responses:
        '200':
          description: Report generated successfully

  /mfa-totp-initiate:
    post:
      summary: Initiate MFA Setup
      description: Start TOTP-based MFA setup
      tags:
        - Security
      responses:
        '200':
          description: MFA setup initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  secret:
                    type: string
                  qrCode:
                    type: string
                  backupCodes:
                    type: array
                    items:
                      type: string

tags:
  - name: Portfolio
    description: Portfolio management operations
  - name: Financial Operations
    description: Deposits, withdrawals, and transactions
  - name: Reporting
    description: Report generation and analytics
  - name: Security
    description: MFA and security operations
  - name: Admin
    description: Administrative operations (admin only)
```

---

## SDK Examples

### TypeScript/JavaScript SDK

```typescript
import { createClient } from '@supabase/supabase-js';

class IndigoYieldAPI {
  private supabase;
  private baseUrl: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.baseUrl = `${supabaseUrl}/functions/v1`;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const { data: { session } } = await this.supabase.auth.getSession();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  }

  // Portfolio operations
  async getPortfolio(investorId: string) {
    return this.request(`/portfolio-api?investorId=${investorId}`);
  }

  // Financial operations
  async deposit(params: DepositRequest) {
    return this.request('/process-deposit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async withdraw(params: WithdrawalRequest) {
    return this.request('/process-withdrawal', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Reporting
  async generateReport(params: GenerateReportRequest) {
    return this.request('/generate-report', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // MFA
  async initiateMFA() {
    return this.request('/mfa-totp-initiate', { method: 'POST' });
  }

  async verifyMFA(token: string, secret: string) {
    return this.request('/mfa-totp-verify', {
      method: 'POST',
      body: JSON.stringify({ token, secret }),
    });
  }
}

// Usage
const api = new IndigoYieldAPI(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const portfolio = await api.getPortfolio(investorId);
```

---

## Related Documentation

- [Authentication Guide](./AUTHENTICATION.md)
- [Rate Limiting Details](./RATE_LIMITING.md)
- [Webhook Integration](./WEBHOOKS.md)
- [Error Handling Best Practices](./ERROR_HANDLING.md)
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)

---

**Last Updated:** November 22, 2025
**Maintained By:** Engineering Team
**Version:** 1.0.0

For questions or API support, please contact api@indigoyield.com or refer to [CONTRIBUTING.md](../CONTRIBUTING.md).
