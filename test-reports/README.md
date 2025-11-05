# Report Generation System Testing

## Quick Start

This directory contains comprehensive testing documentation and scripts for the Indigo Yield Platform's report generation system.

### 📁 Contents

- **`report-generation-tests.md`** - Complete test plan with 52+ test cases
- **`automated-test-runner.ts`** - Automated testing script for all report combinations
- **`generated/`** - Output directory for generated test reports (created on first run)

## 🚀 Running Tests

### Prerequisites

```bash
# Ensure dependencies are installed
cd /Users/mama/Desktop/Claude\ code/indigo-yield-platform-v01
pnpm install

# Start development server
pnpm run dev
```

### Automated Testing

```bash
# Test all 52 combinations
ts-node test-reports/automated-test-runner.ts all

# Test specific report type across all formats
ts-node test-reports/automated-test-runner.ts type portfolio_performance

# Test specific format across all report types
ts-node test-reports/automated-test-runner.ts format pdf

# Run performance benchmarks
ts-node test-reports/automated-test-runner.ts benchmark
```

### Manual Testing

1. Navigate to http://localhost:5173/reports/custom
2. Select report type and format
3. Configure parameters
4. Generate and download
5. Verify file integrity and content
6. Record results in `report-generation-tests.md`

## 📊 Test Coverage

### Report Types (13 total)

**Investor Reports:**
- Portfolio Performance
- Transaction History
- Tax Report (1099)
- Monthly Statement
- Annual Summary
- Custom Date Range

**Admin Reports:**
- AUM Report
- Investor Activity
- Transaction Volume
- Compliance Report
- Fund Performance
- Fee Analysis
- Audit Trail

### Formats (4 total)

- **PDF** - Professional reports with jsPDF
- **Excel** - Multi-sheet workbooks with ExcelJS
- **CSV** - Simple data exports
- **JSON** - Structured API-friendly data

### Total Combinations: 52

Plus additional testing for:
- Report scheduling
- Report sharing
- Report history management
- Edge Functions
- Error handling
- Performance benchmarks

## 📝 Test Documentation

### Main Test Document

See `report-generation-tests.md` for:
- Detailed test cases for each combination
- Integration testing scenarios
- Edge Function testing
- Error handling verification
- Performance benchmarks
- Issue tracking templates
- Sign-off procedures

### Test Results Format

```json
{
  "totalTests": 52,
  "passed": 48,
  "failed": 4,
  "skipped": 0,
  "totalDuration": 245000,
  "passRate": 92.31,
  "results": [
    {
      "reportType": "portfolio_performance",
      "format": "pdf",
      "status": "pass",
      "duration": 1850,
      "fileSize": 45123,
      "timestamp": "2025-11-04T12:00:00Z"
    },
    // ... more results
  ]
}
```

## 🔧 Configuration

Edit `automated-test-runner.ts` to customize:

```typescript
const TEST_CONFIG = {
  dateRangeStart: '2024-01-01',
  dateRangeEnd: '2024-12-31',
  timeout: 30000, // 30 seconds
  saveReports: true, // Save generated files
  outputDir: './test-reports/generated',
};
```

## 📈 Performance Targets

### Small Reports (< 100 records)
- PDF: < 2 seconds
- Excel: < 2 seconds
- CSV: < 1 second
- JSON: < 1 second

### Medium Reports (100-1000 records)
- PDF: < 5 seconds
- Excel: < 5 seconds
- CSV: < 2 seconds
- JSON: < 2 seconds

### Large Reports (1000+ records)
- PDF: < 15 seconds (with pagination)
- Excel: < 10 seconds
- CSV: < 5 seconds
- JSON: < 5 seconds

## 🐛 Reporting Issues

Use the issue template in `report-generation-tests.md`:

```markdown
Issue #X
--------
Title: [Brief description]
Report Type: [Type]
Format: [Format]
Severity: [Critical/High/Medium/Low]
Status: [Open/In Progress/Resolved/Closed]

Description: [Detailed description]
Steps to Reproduce: [Steps]
Expected vs Actual: [Details]
Resolution: [Fix details]
```

## 📚 Related Documentation

- `/REPORTS_SYSTEM_GUIDE.md` - Complete system guide
- `/REPORTS_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `/REPORTS_IMPLEMENTATION_SUMMARY.md` - Technical implementation
- `src/lib/reports/README.md` - Developer quick start

## 🔗 Key Files

### Frontend
- `src/components/reports/ReportBuilder.tsx` - Report generation UI
- `src/components/reports/ReportHistory.tsx` - Report management UI
- `src/services/api/reportsApi.ts` - API service layer

### Core Logic
- `src/lib/reports/reportEngine.ts` - Report generation engine
- `src/lib/reports/pdfGenerator.ts` - PDF generation (jsPDF)
- `src/lib/reports/excelGenerator.ts` - Excel generation (ExcelJS)

### Backend
- `supabase/functions/generate-report/index.ts` - Async report generation
- Database tables: `report_definitions`, `generated_reports`, `report_schedules`

## 🎯 Test Execution Checklist

- [ ] Environment setup complete
- [ ] Test data prepared
- [ ] Development server running
- [ ] All 52 core combinations tested
- [ ] Scheduling tests completed
- [ ] Sharing tests completed
- [ ] History management tested
- [ ] Edge Function tests passed
- [ ] Error handling verified
- [ ] Performance benchmarks met
- [ ] Results documented
- [ ] Issues logged and tracked
- [ ] Sign-off obtained

## 📞 Support

For questions or issues:
- Check main documentation: `/REPORTS_SYSTEM_GUIDE.md`
- Review test documentation: `report-generation-tests.md`
- Contact development team

## 📅 Test Schedule

**Initial Testing**: November 4, 2025
**Regression Testing**: Before each release
**Performance Testing**: Monthly
**Full Coverage Testing**: Quarterly

---

**Last Updated**: November 4, 2025
**Version**: 1.0
**Status**: Ready for execution
