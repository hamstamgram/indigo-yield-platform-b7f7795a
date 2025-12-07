# Reports System - Quick Start Guide

## Overview

Production-ready report generation system for Indigo Yield Platform supporting PDF, Excel, CSV, and JSON formats.

## Quick Start

### 1. Generate a PDF Report

```typescript
import { ReportsApi } from '@/services/api/reportsApi';

// Generate and download immediately
const result = await ReportsApi.generateReportNow({
  reportType: 'portfolio_performance',
  format: 'pdf',
  filters: {
    dateRangeStart: '2024-01-01',
    dateRangeEnd: '2024-12-31',
  },
  parameters: {
    includeCharts: true,
    includeTransactions: true,
    confidential: false,
  },
});

if (result.success && result.data) {
  const blob = new Blob([result.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename || 'report.pdf';
  link.click();
}
```

### 2. Queue a Report for Background Generation

```typescript
const response = await ReportsApi.generateReport({
  reportType: 'monthly_statement',
  format: 'excel',
  filters: { period: 'mtd' },
  deliveryMethod: ['email', 'storage'],
  recipientEmails: ['investor@example.com'],
});

if (response.success) {
  console.log('Report queued:', response.reportId);
}
```

### 3. List User's Reports

```typescript
const reports = await ReportsApi.getUserReports({
  status: 'completed',
  limit: 20,
});

reports.forEach((report) => {
  console.log(`${report.reportType} - ${report.status}`);
});
```

### 4. Download an Existing Report

```typescript
const download = await ReportsApi.downloadReport({
  reportId: 'report-uuid-here',
});

if (download.success && download.downloadUrl) {
  window.open(download.downloadUrl, '_blank');
}
```

## React Component Usage

### Report Builder Component

```tsx
import { ReportBuilder } from '@/components/reports';

function ReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Generate Reports</h1>
      <ReportBuilder
        defaultReportType="portfolio_performance"
        onReportGenerated={(reportId) => {
          console.log('Report generated:', reportId);
          // Navigate to report history or show notification
        }}
      />
    </div>
  );
}
```

### Report History Component

```tsx
import { ReportHistory } from '@/components/reports';

function ReportsHistoryPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Report History</h1>
      <ReportHistory />
    </div>
  );
}
```

## Direct Report Generation

### Generate PDF Directly

```typescript
import { generatePDFReport } from '@/lib/reports';
import { ReportEngine } from '@/lib/reports';

// Fetch data
const reportData = await ReportEngine.fetchReportData(
  'portfolio_performance',
  {
    dateRangeStart: '2024-01-01',
    dateRangeEnd: '2024-12-31',
  },
  { includeCharts: true },
  userId
);

// Generate PDF
const result = await generatePDFReport(reportData, {
  includeCharts: true,
  confidential: false,
});

if (result.success) {
  // result.data contains Uint8Array
  // result.filename contains suggested filename
  console.log(`Generated ${result.pageCount} page PDF`);
}
```

### Generate Excel Directly

```typescript
import { generateExcelReport } from '@/lib/reports';

const result = await generateExcelReport(reportData, {
  includeCharts: true,
});

if (result.success) {
  console.log(`Generated ${result.sheetCount} sheet workbook`);
}
```

## Report Types

### Investor Reports
- `portfolio_performance` - Comprehensive portfolio analysis
- `transaction_history` - Detailed transaction ledger
- `tax_report` - 1099 tax documentation
- `monthly_statement` - Professional monthly statement
- `annual_summary` - Year-end summary
- `custom_date_range` - Flexible date range report

### Admin Reports (Requires Admin Access)
- `aum_report` - Assets Under Management
- `investor_activity` - Investor engagement metrics
- `transaction_volume` - Transaction analysis
- `fund_performance` - Multi-fund performance
- `fee_analysis` - Fee breakdown and analysis
- `audit_trail` - Complete system audit log

## Scheduled Reports

### Create a Monthly Report Schedule

```typescript
await ReportsApi.createReportSchedule({
  reportDefinitionId: 'def-uuid',
  name: 'Monthly Performance Report',
  description: 'Automated monthly performance summary',
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

### Update Schedule

```typescript
await ReportsApi.updateReportSchedule('schedule-uuid', {
  isActive: false, // Pause schedule
  recipientEmails: ['new-email@example.com'],
});
```

## Database Queries

### Get All Completed Reports

```sql
SELECT
  id,
  report_type,
  format,
  created_at,
  file_size_bytes,
  download_count
FROM generated_reports
WHERE status = 'completed'
  AND generated_for_user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Get Report Statistics

```sql
SELECT * FROM get_report_statistics(
  p_user_id := 'user-uuid',
  p_days_back := 30
);
```

### Clean Up Old Reports

```sql
SELECT * FROM cleanup_expired_reports(
  p_retention_days := 90
);
```

## Error Handling

```typescript
try {
  const result = await ReportsApi.generateReportNow({
    reportType: 'portfolio_performance',
    format: 'pdf',
  });

  if (!result.success) {
    console.error('Generation failed:', result.error);
    // Show user-friendly error message
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Handle network or system errors
}
```

## Performance Tips

1. **Use appropriate formats**:
   - PDF for professional presentations
   - Excel for data analysis
   - CSV for simple exports
   - JSON for API integration

2. **Limit date ranges**:
   - Large date ranges increase generation time
   - Use pagination for transaction-heavy reports

3. **Queue long reports**:
   - Reports > 1000 transactions should be queued
   - Use `generateReport()` instead of `generateReportNow()`

4. **Cache report data**:
   - Report definitions are cached for 1 hour
   - Reuse fetched data when generating multiple formats

## Security Best Practices

1. **Access Control**:
   - Admin reports are automatically restricted
   - RLS policies enforce user data isolation

2. **Download Links**:
   - Links expire after 1 hour
   - Generate new links for each download session

3. **Audit Logging**:
   - All report access is logged
   - Include user ID, action, and timestamp

4. **Confidential Data**:
   - Use `confidential: true` for sensitive reports
   - Adds watermark and restricts sharing

## Testing

```typescript
// Test report generation
import { describe, it, expect } from 'vitest';

describe('Report Generation', () => {
  it('should generate PDF report', async () => {
    const result = await generatePDFReport(mockReportData);
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.pageCount).toBeGreaterThan(0);
  });

  it('should validate report request', () => {
    const validation = ReportEngine.validateRequest({
      reportType: 'portfolio_performance',
      format: 'pdf',
    });
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
```

## Troubleshooting

### Report Generation Fails

Check error details:
```typescript
const report = await ReportsApi.getReport('report-uuid');
if (report.status === 'failed') {
  console.error('Error:', report.errorMessage);
  console.error('Details:', report.errorDetails);
}
```

### Missing Data

Verify data exists:
```typescript
const data = await ReportEngine.fetchReportData(
  reportType,
  filters,
  parameters,
  userId
);
console.log('Data fetched:', {
  holdings: data.holdings?.length,
  transactions: data.transactions?.length,
});
```

## Support

- Documentation: `/REPORTS_SYSTEM_GUIDE.md`
- API Reference: See main guide
- Component Props: Check TypeScript definitions
- Database Schema: See migration file

## License

Proprietary - Indigo Yield Platform
