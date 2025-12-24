/**
 * PDF Generation Utilities
 * Professional investor statement generation with charts and branding
 */

// Export statement generator (the main one used by admin pages)
export { generatePDF, type StatementData, type FundPerformanceData } from "./statementGenerator";

// Export chart utilities
export { ChartExporter, type ChartExportOptions } from "./chart-export";
