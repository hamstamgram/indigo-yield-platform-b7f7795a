/**
 * Report Engine Service - Phase 1 Stub Implementation
 *
 * This is a stub implementation for MVP deployment.
 * Full report engine with PDF generation will be implemented in Phase 2.
 *
 * @module reportEngine
 */

export interface ReportConfig {
  type: "performance" | "transactions" | "custom" | "monthly" | "annual";
  dateRange: {
    start: Date;
    end: Date;
  };
  investorId?: string;
  fundId?: string;
  format?: "json" | "csv" | "pdf";
  filters?: Record<string, any>;
}

export interface ReportData {
  id: string;
  title: string;
  type: string;
  generated_at: Date;
  date_range: {
    start: Date;
    end: Date;
  };
  data: any;
  format: "json" | "csv" | "pdf";
  metadata?: Record<string, any>;
}

export interface ReportSchedule {
  id: string;
  config: ReportConfig;
  schedule: string; // Cron expression
  enabled: boolean;
  last_run?: Date;
  next_run?: Date;
}

/**
 * Generate report based on configuration
 *
 * @param config - Report configuration
 * @returns Promise<ReportData>
 *
 * @example
 * const report = await generateReport({
 *   type: 'performance',
 *   dateRange: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
 *   investorId: 'uuid',
 *   format: 'json'
 * });
 */
export async function generateReport(config: ReportConfig): Promise<ReportData> {
  console.warn("[Report Engine] Stub implementation - Phase 2 feature");

  const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Return stub data structure
  return {
    id: reportId,
    title: `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report`,
    type: config.type,
    generated_at: new Date(),
    date_range: config.dateRange,
    data: {
      message: "Custom reports coming soon in Phase 2",
      note: "This is a stub implementation for MVP deployment",
      config: config,
      features_coming_soon: [
        "SQL query builder for custom reports",
        "Chart.js integration for visualizations",
        "PDF generation with jsPDF/PDFKit",
        "Scheduled report generation",
        "Email delivery of reports",
        "Report templates",
        "Export to Excel/CSV",
      ],
    },
    format: config.format || "json",
    metadata: {
      stub: true,
      phase: "1 - MVP",
      implementation_status: "pending",
    },
  };
}

/**
 * Export report to specified format
 *
 * @param reportData - Generated report data
 * @param format - Export format (csv, pdf, json)
 * @returns Promise<Blob>
 */
export async function exportReport(
  reportData: ReportData,
  format: "csv" | "pdf" | "json" = "json"
): Promise<Blob> {
  console.warn("[Report Engine] Export stub - Phase 2 feature");

  if (format === "json") {
    const jsonString = JSON.stringify(reportData, null, 2);
    return new Blob([jsonString], { type: "application/json" });
  }

  if (format === "csv") {
    // Stub CSV export
    const csv = [
      "Report Type,Generated At,Status",
      `${reportData.type},${reportData.generated_at.toISOString()},Stub Implementation`,
    ].join("\n");
    return new Blob([csv], { type: "text/csv" });
  }

  if (format === "pdf") {
    // Stub PDF - would require PDFKit or jsPDF
    const pdfStub = "PDF generation coming in Phase 2. Install PDFKit or jsPDF.";
    return new Blob([pdfStub], { type: "text/plain" });
  }

  throw new Error(`Unsupported export format: ${format}`);
}

/**
 * Schedule report generation
 *
 * @param config - Report configuration
 * @param schedule - Cron expression for scheduling
 * @returns Promise<ReportSchedule>
 *
 * @example
 * const scheduled = await scheduleReport(config, '0 0 1 * *'); // Monthly on 1st
 */
export async function scheduleReport(
  config: ReportConfig,
  schedule: string
): Promise<ReportSchedule> {
  console.warn("[Report Engine] Scheduling stub - Phase 2 feature");

  return {
    id: `schedule_${Date.now()}`,
    config,
    schedule,
    enabled: false, // Disabled in stub
    metadata: {
      note: "Report scheduling will be implemented in Phase 2 using Supabase Edge Functions or cron jobs",
    },
  } as ReportSchedule;
}

/**
 * Get available report templates
 *
 * @returns Promise<Array<{id: string, name: string, description: string}>>
 */
export async function getReportTemplates(): Promise<
  Array<{ id: string; name: string; description: string; type: string }>
> {
  console.warn("[Report Engine] Templates stub - Phase 2 feature");

  return [
    {
      id: "performance_summary",
      name: "Performance Summary",
      description: "Portfolio performance overview with key metrics",
      type: "performance",
    },
    {
      id: "transaction_history",
      name: "Transaction History",
      description: "Detailed transaction log with filters",
      type: "transactions",
    },
    {
      id: "monthly_statement",
      name: "Monthly Statement",
      description: "Comprehensive monthly account statement",
      type: "monthly",
    },
    {
      id: "annual_tax_report",
      name: "Annual Tax Report",
      description: "Tax-ready annual summary of gains/losses",
      type: "annual",
    },
  ];
}

/**
 * Validate report configuration
 *
 * @param config - Report configuration to validate
 * @returns {valid: boolean, errors: string[]}
 */
export function validateReportConfig(config: ReportConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.type) {
    errors.push("Report type is required");
  }

  if (!config.dateRange || !config.dateRange.start || !config.dateRange.end) {
    errors.push("Date range with start and end dates is required");
  }

  if (config.dateRange && config.dateRange.start > config.dateRange.end) {
    errors.push("Start date must be before end date");
  }

  const validTypes = ["performance", "transactions", "custom", "monthly", "annual"];
  if (config.type && !validTypes.includes(config.type)) {
    errors.push(`Invalid report type. Must be one of: ${validTypes.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Default export
export default {
  generateReport,
  exportReport,
  scheduleReport,
  getReportTemplates,
  validateReportConfig,
};
