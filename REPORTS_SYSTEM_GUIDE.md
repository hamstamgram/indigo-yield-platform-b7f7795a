# Comprehensive Report Generation System Guide

## Overview

The Indigo Yield Platform Report Generation System is a production-ready, enterprise-grade solution for creating professional investment reports in multiple formats (PDF, Excel, CSV, JSON).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Report Types](#report-types)
3. [Installation & Setup](#installation--setup)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Frontend Components](#frontend-components)
7. [Report Templates](#report-templates)
8. [Scheduled Reports](#scheduled-reports)
9. [Security & Compliance](#security--compliance)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ReportBuilder│  │ReportHistory │  │ReportPreview │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ API Calls
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Service Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ReportsApi (reportsApi.ts)               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Report Engine
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Report Generation                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ReportEngine │  │ PDFGenerator │  │ExcelGenerator│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Data Fetching
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │ Edge Function│  │   Storage    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Multi-Format Support**: PDF, Excel, CSV, JSON
- **Professional Templates**: Pre-built templates for all report types
- **Scheduled Generation**: Automated daily/weekly/monthly reports
- **Secure Storage**: Encrypted storage with expiring download links
- **Audit Trail**: Complete logging of all report access
- **Performance Optimized**: Streaming for large reports, parallel processing

---

## Report Types

### Investor Reports

#### 1. Portfolio Performance Report
**Purpose**: Comprehensive portfolio performance analysis

**Sections**:
- Account Summary (beginning/ending balance, returns)
- Holdings Breakdown (allocation, gains/losses)
- Performance Charts (time-weighted returns, allocation pie chart)
- Period Comparisons (MTD, QTD, YTD, ITD)

**Formats**: PDF, Excel, JSON
**Use Case**: Monthly investor reviews, quarterly presentations

#### 2. Transaction History Report
**Purpose**: Detailed transaction ledger

**Sections**:
- All transactions (deposits, withdrawals, interest, fees)
- Summary totals by type
- Running balance calculations

**Formats**: PDF, Excel, CSV, JSON
**Use Case**: Audit trail, tax preparation, reconciliation

#### 3. Tax Report (1099)
**Purpose**: Year-end tax documentation

**Sections**:
- Interest Income (1099-INT data)
- Capital Gains/Losses
- Cost Basis Calculations
- Fee Summary

**Formats**: PDF, Excel
**Use Case**: Annual tax filing

#### 4. Monthly Statement
**Purpose**: Professional monthly account statement

**Sections**:
- Cover Page (branding, account info)
- Summary Page (performance metrics)
- Holdings Page (detailed positions)
- Transaction Page (monthly activity)
- Disclosures Page (legal notices)

**Formats**: PDF
**Use Case**: Monthly investor communications

#### 5. Annual Summary Report
**Purpose**: Comprehensive year-end review

**Sections**:
- Executive Summary
- Yearly Performance Analysis
- Asset Breakdown
- Tax Summary
- Full Transaction History

**Formats**: PDF, Excel
**Use Case**: Year-end investor reports

### Admin Reports

#### 6. AUM (Assets Under Management) Report
**Purpose**: Track total AUM and trends

**Sections**:
- Total AUM by fund
- AUM trends over time
- Investor breakdown
- Asset allocation

**Formats**: PDF, Excel
**Access**: Admin only

#### 7. Investor Activity Report
**Purpose**: Monitor investor engagement

**Sections**:
- New investors
- Deposit/withdrawal activity
- Login frequency
- Portfolio changes

**Formats**: PDF, Excel
**Access**: Admin only

#### 8. Compliance Report
**Purpose**: KYC/AML status tracking

**Sections**:
- KYC Status Summary
- Pending Verifications
- AML Alerts
- Document Expiration Tracking

**Formats**: PDF, Excel
**Access**: Admin only

#### 9. Audit Trail Report
**Purpose**: Complete system audit log

**Sections**:
- All system events
- User actions
- Data modifications
- Access logs

**Formats**: Excel, CSV, JSON
**Access**: Admin only

---

## Installation & Setup

### 1. Database Migration

Run the migration to create all required tables:

```bash
# Using Supabase CLI
supabase db push

# Or apply specific migration
supabase migration up 20251104000000_create_reports_system
```

### 2. Install Dependencies

```bash
pnpm install jspdf jspdf-autotable exceljs
```

### 3. Configure Storage Bucket

Create a storage bucket for reports in Supabase:

```sql
-- Create reports storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false);

-- Set up RLS policies for reports bucket
CREATE POLICY "Users can download their own reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "System can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reports' AND
  auth.uid() IS NOT NULL
);
```

### 4. Environment Variables

Add to `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Database Schema

### Tables

#### `report_definitions`
Stores reusable report templates and configurations.

```sql
CREATE TABLE report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type report_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_config JSONB NOT NULL DEFAULT '{}',
  default_filters JSONB DEFAULT '{}',
  available_formats report_format[] DEFAULT ARRAY['pdf', 'excel']::report_format[],
  is_admin_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(report_type, name)
);
```

#### `generated_reports`
Stores information about generated report instances.

```sql
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID REFERENCES report_definitions(id),
  report_type report_type NOT NULL,
  format report_format NOT NULL,
  status report_status DEFAULT 'queued' NOT NULL,
  generated_for_user_id UUID REFERENCES auth.users(id),
  generated_by_user_id UUID REFERENCES auth.users(id),
  parameters JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,
  storage_path TEXT,
  file_size_bytes BIGINT,
  page_count INTEGER,
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  error_message TEXT,
  error_details JSONB,
  schedule_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### `report_schedules`
Automated report generation schedules.

```sql
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID REFERENCES report_definitions(id),
  name TEXT NOT NULL,
  description TEXT,
  frequency report_schedule_frequency NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',
  recipient_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  recipient_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  delivery_method TEXT[] DEFAULT ARRAY['email', 'storage']::TEXT[],
  parameters JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  formats report_format[] DEFAULT ARRAY['pdf']::report_format[],
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Functions

#### `get_user_reports()`
Retrieves reports for a specific user with filters.

```sql
SELECT * FROM get_user_reports(
  p_user_id := 'user-uuid',
  p_report_type := 'portfolio_performance',
  p_status := 'completed',
  p_limit := 50,
  p_offset := 0
);
```

#### `get_report_statistics()`
Returns aggregated statistics about report generation.

```sql
SELECT * FROM get_report_statistics(
  p_user_id := 'user-uuid',  -- NULL for all users
  p_days_back := 30
);
```

#### `cleanup_expired_reports()`
Removes reports older than retention period.

```sql
SELECT * FROM cleanup_expired_reports(
  p_retention_days := 90
);
```

---

## API Reference

### ReportsApi Service

#### `getReportDefinitions()`
Get available report definitions.

```typescript
const definitions = await ReportsApi.getReportDefinitions(
  includeAdminOnly: boolean = false
);
```

#### `generateReport()`
Queue a report for generation.

```typescript
const response = await ReportsApi.generateReport({
  reportType: 'portfolio_performance',
  format: 'pdf',
  filters: {
    dateRangeStart: '2024-01-01',
    dateRangeEnd: '2024-12-31',
  },
  parameters: {
    includeCharts: true,
    includeTransactions: true,
  },
});
```

#### `generateReportNow()`
Generate and download report immediately (synchronous).

```typescript
const result = await ReportsApi.generateReportNow({
  reportType: 'monthly_statement',
  format: 'pdf',
  filters: { period: 'mtd' },
});

if (result.success && result.data) {
  // Download blob
  const blob = new Blob([result.data], { type: 'application/pdf' });
  // ... create download link
}
```

#### `getUserReports()`
Get user's generated reports with optional filters.

```typescript
const reports = await ReportsApi.getUserReports({
  reportType: 'portfolio_performance',
  status: 'completed',
  limit: 20,
  offset: 0,
});
```

#### `downloadReport()`
Get signed URL for report download.

```typescript
const response = await ReportsApi.downloadReport({
  reportId: 'report-uuid',
});

if (response.success && response.downloadUrl) {
  window.open(response.downloadUrl, '_blank');
}
```

---

## Frontend Components

### ReportBuilder

Main component for configuring and generating reports.

```tsx
import { ReportBuilder } from '@/components/reports/ReportBuilder';

function MyReportsPage() {
  return (
    <ReportBuilder
      defaultReportType="portfolio_performance"
      onReportGenerated={(reportId) => {
        console.log('Report generated:', reportId);
      }}
    />
  );
}
```

### ReportHistory

Component for viewing and managing generated reports.

```tsx
import { ReportHistory } from '@/components/reports/ReportHistory';

function MyReportsPage() {
  return <ReportHistory />;
}
```

---

## Report Templates

### Creating Custom Templates

1. **Define Report Definition**:

```sql
INSERT INTO report_definitions (report_type, name, description, template_config)
VALUES (
  'custom_performance',
  'Custom Performance Report',
  'Customized performance analysis',
  '{"sections": ["summary", "charts", "holdings"], "charts": ["allocation", "performance"]}'
);
```

2. **Implement Data Fetching**:

```typescript
// In reportEngine.ts
private static async fetchCustomPerformanceData(
  userId: string,
  filters: ReportFilters,
  parameters: ReportParameters
): Promise<ReportData> {
  // Fetch required data
  // Transform into ReportData format
  // Return
}
```

3. **Add to Report Type**:

```typescript
// In fetchReportData()
case 'custom_performance':
  return this.fetchCustomPerformanceData(userId, filters, parameters);
```

---

## Scheduled Reports

### Creating a Schedule

```typescript
await ReportsApi.createReportSchedule({
  reportDefinitionId: 'def-uuid',
  name: 'Monthly Performance Report',
  frequency: 'monthly',
  dayOfMonth: 1,
  timeOfDay: '09:00:00',
  timezone: 'America/New_York',
  recipientEmails: ['investor@example.com'],
  deliveryMethod: ['email', 'storage'],
  formats: ['pdf', 'excel'],
  filters: { period: 'mtd' },
  parameters: { includeCharts: true },
  isActive: true,
});
```

### Schedule Frequencies

- **daily**: Runs every day at specified time
- **weekly**: Runs on specified day of week
- **monthly**: Runs on specified day of month
- **quarterly**: Runs first day of each quarter
- **yearly**: Runs first day of year

---

## Security & Compliance

### Access Control

1. **Report Definitions**: Admin-only reports restricted via `is_admin_only` flag
2. **Generated Reports**: Users can only access their own reports via RLS
3. **Storage**: Pre-signed URLs with 1-hour expiration
4. **Audit Logging**: All report access logged in `report_access_logs`

### Data Privacy

- PII redaction options via `confidential` parameter
- Watermarking for confidential reports
- Encrypted storage for sensitive reports

### Compliance Features

- Complete audit trail
- Immutable report records
- Retention policy enforcement
- GDPR-compliant data deletion

---

## Performance Optimization

### Best Practices

1. **Date Range Limits**: Limit custom date ranges to reasonable periods
2. **Pagination**: Use pagination for transaction-heavy reports
3. **Caching**: Report definitions cached for 1 hour
4. **Streaming**: Large Excel reports use streaming writes
5. **Parallel Processing**: Multiple sheets generated in parallel

### Performance Metrics

Expected generation times:

- **PDF Reports**: 5-15 seconds
- **Excel Reports**: 3-10 seconds
- **CSV Reports**: 1-3 seconds
- **JSON Reports**: 1-2 seconds

---

## Troubleshooting

### Common Issues

#### Report Generation Fails

**Symptom**: Report status stuck on 'queued' or 'failed'

**Solutions**:
1. Check error message in `generated_reports.error_message`
2. Verify date ranges are valid
3. Ensure user has required data (transactions, positions)
4. Check Edge Function logs

#### Download Link Expired

**Symptom**: "Download URL expired" error

**Solutions**:
1. Generate new download link via `downloadReport()` API
2. Download links expire after 1 hour
3. Re-generate report if needed

#### Missing Data in Report

**Symptom**: Report shows incomplete data

**Solutions**:
1. Verify date range includes relevant transactions
2. Check if statements exist for the period
3. Ensure positions table is up-to-date
4. Run data validation queries

---

## Support

For issues or questions:
- Email: support@indigo.yield
- Documentation: https://docs.indigo.yield/reports
- GitHub Issues: https://github.com/indigo-yield/platform/issues

---

**Last Updated**: November 4, 2025
**Version**: 1.0.0
