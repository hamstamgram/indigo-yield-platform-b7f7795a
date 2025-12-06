# Investor Audit System - Complete Guide

**Date**: October 7, 2025
**Version**: 1.0.0
**Status**: ✅ Ready for Deployment

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Audit Components](#audit-components)
3. [Database Views](#database-views)
4. [Audit Functions](#audit-functions)
5. [API Endpoints](#api-endpoints)
6. [Common Queries](#common-queries)
7. [Dashboard Integration](#dashboard-integration)
8. [Compliance Reports](#compliance-reports)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Investor Audit System provides comprehensive monitoring, validation, and reporting for all investor data on the Indigo Yield Platform.

### Key Features

✅ **Real-time Data Integrity Checks**
- Orphaned records detection
- Data anomaly identification
- Relationship validation

✅ **Financial Reconciliation**
- Portfolio vs. transaction verification
- Position vs. portfolio validation
- Automatic discrepancy detection

✅ **Compliance Monitoring**
- KYC status tracking
- Document verification status
- Regulatory compliance checks

✅ **Activity Tracking**
- Investor activity levels
- Dormant account detection
- Transaction patterns

✅ **Audit Reports**
- Platform-wide audits
- Individual investor audits
- Exportable reports

---

## Audit Components

### 1. Database Views (Real-time)

| View Name | Purpose | Update Frequency |
|-----------|---------|------------------|
| `investor_audit_overview` | Complete investor summary | Real-time |
| `financial_reconciliation` | Financial validation | Real-time |
| `compliance_status` | Regulatory compliance | Real-time |
| `data_integrity_anomalies` | Data quality issues | Real-time |
| `data_integrity_orphans` | Orphaned records | Real-time |
| `investor_activity_summary` | Activity metrics | Real-time |

### 2. Audit Functions

| Function | Purpose | Usage |
|----------|---------|-------|
| `generate_investor_audit_report()` | Comprehensive JSON report | Admin dashboard |
| `validate_investor_data()` | Single investor validation | Data entry/update |

### 3. API Endpoint

**Edge Function**: `/functions/v1/investor-audit`

---

## Database Views

### 1. Investor Audit Overview

**View**: `investor_audit_overview`

**Purpose**: Complete 360° view of each investor

**Columns**:
```sql
SELECT
  investor_id,
  email,
  full_name,
  investor_status,
  kyc_status,

  -- Portfolio
  total_invested,
  current_value,
  total_return,
  realized_gains,
  unrealized_gains,

  -- Activity
  total_transactions,
  completed_transactions,
  pending_transactions,
  failed_transactions,

  -- Financial Totals
  total_deposits,
  total_withdrawals,
  total_dividends,
  total_fees,

  -- Data Quality Flags
  has_portfolio_issue,
  has_kyc_issue,
  has_profile_issue,
  has_reconciliation_issue

FROM investor_audit_overview;
```

**Use Cases**:
- Admin dashboard overview
- Investor search and filtering
- Data quality monitoring
- Quick health checks

---

### 2. Financial Reconciliation

**View**: `financial_reconciliation`

**Purpose**: Verify portfolio values match transaction history

**Key Columns**:
```sql
SELECT
  investor_id,
  email,

  -- Portfolio Values
  portfolio_total_invested,
  portfolio_current_value,

  -- Calculated Values
  calculated_deposits,
  calculated_withdrawals,
  calculated_net_invested,

  -- Discrepancies
  invested_discrepancy,
  unrealized_gains_discrepancy,
  reconciliation_status  -- 'OK' or 'MISMATCH'

FROM financial_reconciliation;
```

**Use Cases**:
- Monthly reconciliation
- Audit trails
- Identifying calculation errors
- Compliance reporting

**Example: Find Mismatches**
```sql
SELECT * FROM financial_reconciliation
WHERE reconciliation_status = 'MISMATCH'
ORDER BY invested_discrepancy DESC;
```

---

### 3. Compliance Status

**View**: `compliance_status`

**Purpose**: Track regulatory and compliance requirements

**Key Columns**:
```sql
SELECT
  investor_id,
  email,
  kyc_compliance_status,      -- COMPLIANT, PENDING, EXPIRED, etc.
  document_compliance_status,  -- COMPLIANT, PENDING, NO_DOCUMENTS
  profile_completeness,        -- COMPLETE, PARTIAL, INCOMPLETE
  activity_status,             -- ACTIVE, DORMANT, INACTIVE
  investment_category,         -- HIGH_VALUE, MEDIUM_VALUE, etc.

  -- Risk Flags
  has_pending_withdrawals,
  has_multiple_failed_transactions

FROM compliance_status;
```

**Use Cases**:
- Regulatory audits
- KYC compliance monitoring
- Risk assessment
- Customer onboarding tracking

**Example: Non-Compliant Investors**
```sql
SELECT * FROM compliance_status
WHERE kyc_compliance_status != 'COMPLIANT'
   OR document_compliance_status != 'COMPLIANT'
ORDER BY total_invested DESC;
```

---

### 4. Data Integrity Anomalies

**View**: `data_integrity_anomalies`

**Purpose**: Identify data quality issues automatically

**Detected Anomalies**:
- ❌ Negative portfolio values
- ❌ Negative investment amounts
- ❌ Unrealistic returns (>1000%)
- ❌ Unrealistic losses (<-100%)
- ❌ Invalid position quantities (≤0)

**Example: View All Anomalies**
```sql
SELECT
  anomaly_type,
  investor_id,
  email,
  full_name,
  anomalous_value,
  description
FROM data_integrity_anomalies
ORDER BY anomaly_type;
```

---

### 5. Investor Activity Summary

**View**: `investor_activity_summary`

**Purpose**: Track investor engagement and activity

**Activity Levels**:
- **ACTIVE**: Transaction in last 30 days
- **MODERATE**: Transaction in last 90 days
- **LOW**: Transaction in last 365 days
- **DORMANT**: No recent transactions

**Example: Find Dormant High-Value Investors**
```sql
SELECT
  email,
  full_name,
  current_value,
  days_since_last_transaction,
  activity_level
FROM investor_activity_summary
WHERE activity_level = 'DORMANT'
  AND current_value > 100000
ORDER BY current_value DESC;
```

---

## Audit Functions

### 1. Generate Investor Audit Report

**Function**: `generate_investor_audit_report(p_investor_id UUID DEFAULT NULL)`

**Purpose**: Generate comprehensive JSON audit report

**Parameters**:
- `p_investor_id`: UUID (optional)
  - If NULL: Platform-wide report
  - If provided: Single investor report

**Returns**: JSONB with complete audit data

**Example: Platform-Wide Report**
```sql
SELECT generate_investor_audit_report();
```

**Output Structure**:
```json
{
  "generated_at": "2025-10-07T10:30:00Z",
  "report_type": "PLATFORM_WIDE",
  "summary": {
    "total_investors": 1247,
    "active_investors": 1180,
    "kyc_approved": 1150,
    "total_aum": 10523450.50,
    "total_invested": 9875000.00
  },
  "data_quality": {
    "orphaned_records": 0,
    "anomalies": 3,
    "reconciliation_issues": 2
  },
  "compliance": {
    "kyc_compliant": 1150,
    "document_compliant": 1200,
    "profile_complete": 1180
  },
  "financial": {
    "total_deposits": 12500000.00,
    "total_withdrawals": 2625000.00,
    "total_dividends": 450000.00,
    "total_fees": 125000.00
  },
  "issues": {
    "portfolio_issues": 1,
    "kyc_issues": 97,
    "profile_issues": 67,
    "reconciliation_issues": 2
  }
}
```

**Example: Single Investor Report**
```sql
SELECT generate_investor_audit_report('123e4567-e89b-12d3-a456-426614174000'::UUID);
```

---

### 2. Validate Investor Data

**Function**: `validate_investor_data(p_investor_id UUID)`

**Purpose**: Validate all data for a single investor

**Returns**: JSONB with validation results

**Example**:
```sql
SELECT validate_investor_data('123e4567-e89b-12d3-a456-426614174000'::UUID);
```

**Output Structure**:
```json
{
  "investor_id": "123e4567-e89b-12d3-a456-426614174000",
  "valid": false,
  "errors": [
    {
      "field": "total_invested",
      "issue": "Portfolio total_invested (10000) does not match transaction sum (9500). Discrepancy: 500"
    },
    {
      "field": "kyc_status",
      "issue": "KYC has expired"
    }
  ],
  "warnings": [
    {
      "field": "documents",
      "issue": "No verified documents on file"
    }
  ],
  "validated_at": "2025-10-07T10:30:00Z"
}
```

---

## API Endpoints

### Investor Audit API

**Endpoint**: `GET /functions/v1/investor-audit`

**Authentication**: Required (Admin only)

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `report_type` | string | No | overview, reconciliation, compliance, anomalies, activity, full_report |
| `investor_id` | UUID | No | Specific investor (omit for all) |
| `format` | string | No | json (default) or summary |

---

### Report Types

#### 1. Overview Report

**Request**:
```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=overview' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

**Response**:
```json
{
  "success": true,
  "report_type": "overview",
  "data": [ /* Array of investor_audit_overview records */ ],
  "generated_at": "2025-10-07T10:30:00Z"
}
```

#### 2. Reconciliation Report

**Request**:
```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=reconciliation' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

**Response**:
```json
{
  "success": true,
  "report_type": "reconciliation",
  "data": {
    "reconciliation_data": [ /* Array of records */ ],
    "summary": {
      "total_investors": 1247,
      "mismatches": 2,
      "total_discrepancy": 1250.50
    }
  }
}
```

#### 3. Compliance Report

**Request**:
```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=compliance' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

#### 4. Anomalies Report

**Request**:
```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=anomalies' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

#### 5. Activity Report

**Request**:
```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=activity' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

#### 6. Full Report

**Request**:
```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=full_report' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

---

### Single Investor Audit

**Request**:
```bash
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=full_report&investor_id=123e4567-e89b-12d3-a456-426614174000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

---

## Common Queries

### Query 1: Investors with Issues

```sql
SELECT
  email,
  full_name,
  CASE WHEN has_portfolio_issue THEN 'Portfolio Issue' END as issue_1,
  CASE WHEN has_kyc_issue THEN 'KYC Issue' END as issue_2,
  CASE WHEN has_profile_issue THEN 'Profile Issue' END as issue_3,
  CASE WHEN has_reconciliation_issue THEN 'Reconciliation Issue' END as issue_4
FROM investor_audit_overview
WHERE has_portfolio_issue = true
   OR has_kyc_issue = true
   OR has_profile_issue = true
   OR has_reconciliation_issue = true;
```

### Query 2: High-Value Investors Needing KYC

```sql
SELECT
  email,
  full_name,
  kyc_status,
  total_invested,
  current_value
FROM investor_audit_overview
WHERE kyc_status != 'approved'
  AND current_value > 100000
ORDER BY current_value DESC;
```

### Query 3: Pending Withdrawals

```sql
SELECT
  i.email,
  i.full_name,
  wr.amount,
  wr.requested_at,
  EXTRACT(DAY FROM NOW() - wr.requested_at) as days_pending
FROM withdrawal_requests wr
JOIN investors i ON i.id = wr.investor_id
WHERE wr.status = 'pending'
ORDER BY wr.requested_at;
```

### Query 4: Dormant High-Value Accounts

```sql
SELECT
  email,
  full_name,
  current_value,
  last_transaction_date,
  days_since_last_transaction
FROM investor_activity_summary
WHERE activity_level = 'DORMANT'
  AND current_value > 50000
ORDER BY current_value DESC;
```

### Query 5: Failed Transactions Summary

```sql
SELECT
  i.email,
  i.full_name,
  COUNT(*) as failed_count,
  SUM(t.amount) as failed_amount,
  MAX(t.created_at) as last_failed
FROM transactions t
JOIN investors i ON i.id = t.investor_id
WHERE t.status = 'failed'
GROUP BY i.id, i.email, i.full_name
HAVING COUNT(*) > 1
ORDER BY failed_count DESC;
```

---

## Dashboard Integration

### React Component Example

```typescript
// components/AuditDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AuditDashboard() {
  // Fetch audit overview
  const { data: auditData } = useQuery({
    queryKey: ['audit-overview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('investor_audit_overview')
        .select('*')
        .order('onboarded_at', { ascending: false });
      return data;
    }
  });

  // Fetch anomalies
  const { data: anomalies } = useQuery({
    queryKey: ['anomalies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('data_integrity_anomalies')
        .select('*');
      return data;
    }
  });

  return (
    <div>
      <h1>Investor Audit Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Investors"
          value={auditData?.length || 0}
        />
        <StatCard
          title="Data Anomalies"
          value={anomalies?.length || 0}
          variant={anomalies?.length > 0 ? 'warning' : 'success'}
        />
        {/* More stats... */}
      </div>
    </div>
  );
}
```

---

## Compliance Reports

### Monthly Compliance Report

Run this at month-end:

```sql
-- 1. Generate full platform report
SELECT generate_investor_audit_report() AS monthly_report;

-- 2. Export to JSON file (via admin dashboard)

-- 3. Check all compliance items
SELECT
  COUNT(*) FILTER (WHERE kyc_compliance_status = 'COMPLIANT') as kyc_ok,
  COUNT(*) FILTER (WHERE document_compliance_status = 'COMPLIANT') as docs_ok,
  COUNT(*) FILTER (WHERE profile_completeness = 'COMPLETE') as profile_ok,
  COUNT(*) as total
FROM compliance_status;

-- 4. Identify non-compliant investors
SELECT * FROM compliance_status
WHERE kyc_compliance_status != 'COMPLIANT'
   OR document_compliance_status != 'COMPLIANT';
```

---

## Troubleshooting

### Issue: Reconciliation Mismatch

**Symptom**: `reconciliation_status = 'MISMATCH'`

**Diagnosis**:
```sql
SELECT
  email,
  portfolio_total_invested,
  calculated_net_invested,
  invested_discrepancy
FROM financial_reconciliation
WHERE investor_id = 'YOUR_INVESTOR_ID';
```

**Possible Causes**:
1. Missing transaction records
2. Transaction status incorrect
3. Manual portfolio adjustment needed
4. Data migration issue

**Fix**:
```sql
-- Review transactions
SELECT * FROM transactions
WHERE investor_id = 'YOUR_INVESTOR_ID'
ORDER BY created_at;

-- Update portfolio if needed (with audit log)
UPDATE portfolios
SET total_invested = (calculated_value)
WHERE investor_id = 'YOUR_INVESTOR_ID';
```

---

### Issue: Data Anomaly Detected

**Symptom**: Records in `data_integrity_anomalies`

**Diagnosis**:
```sql
SELECT * FROM data_integrity_anomalies
WHERE investor_id = 'YOUR_INVESTOR_ID';
```

**Fix by Anomaly Type**:

1. **Negative Portfolio Value**:
   - Check recent transactions
   - Verify pricing data
   - Review withdrawal processing

2. **Unrealistic Returns**:
   - Verify cost basis
   - Check price feed accuracy
   - Review position calculations

3. **Invalid Quantities**:
   - Check transaction history
   - Verify position updates
   - Reprocess if needed

---

## Deployment

### 1. Run Migration

```bash
# Apply the audit system migration
supabase db push migrations/20251007_investor_audit_system.sql
```

### 2. Deploy Edge Function

```bash
supabase functions deploy investor-audit \
  --project-ref nkfimvovosdehmyyjubn
```

### 3. Test

```bash
# Test full report
curl -X GET \
  'https://nkfimvovosdehmyyjubn.supabase.co/functions/v1/investor-audit?report_type=full_report' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

---

## Best Practices

1. **Daily**: Run anomaly check
2. **Weekly**: Review compliance status
3. **Monthly**: Full reconciliation
4. **Quarterly**: Comprehensive audit report
5. **Always**: Validate before major transactions

---

## Summary

The Investor Audit System provides:

✅ 6 Real-time database views
✅ 2 Audit functions
✅ 1 REST API endpoint
✅ Complete data integrity checks
✅ Financial reconciliation
✅ Compliance monitoring
✅ Activity tracking
✅ Automated anomaly detection

**All data updates in real-time. No scheduled jobs required.**

---

**Last Updated**: October 7, 2025
**Version**: 1.0.0
**Status**: Production Ready
