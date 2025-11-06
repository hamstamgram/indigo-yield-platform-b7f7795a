/**
 * Report Domain Types
 * Clean abstractions for reporting functionality
 * 
 * Database Schema:
 * - generated_reports table: id, report_type, format, status, generated_for_user_id, etc.
 * - Uses enums: report_type, report_format, report_status
 */

// Define types directly (these enums don't exist in current database schema)
type ReportType = 'portfolio_statement' | 'performance_report' | 'tax_report' | 'transaction_report' | 'fee_report' | 'custom';

type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

/**
 * Report definition/template
 * Note: This table may not exist in all environments
 */
export interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  report_type: ReportType;
  default_format: ReportFormat;
  template_config: Record<string, any>;
  is_admin_only: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Generated report record from database
 */
export interface GeneratedReport {
  id: string;
  report_definition_id: string | null;
  report_type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  generated_for_user_id: string | null;
  generated_by_user_id: string | null;
  parameters: Record<string, any>;
  filters: Record<string, any>;
  date_range_start: string | null;
  date_range_end: string | null;
  storage_path: string | null;
  download_url: string | null;
  download_url_expires_at: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  error_message: string | null;
  error_details: Record<string, any> | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_duration_ms: number | null;
  download_count: number | null;
  schedule_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request to generate a new report
 */
export interface ReportRequest {
  report_type: ReportType;
  format: ReportFormat;
  parameters?: Record<string, any>;
  filters?: Record<string, any>;
  date_range_start?: string;
  date_range_end?: string;
}

/**
 * Report data structure for rendering
 */
export interface ReportData {
  title: string;
  subtitle?: string;
  generated_at: string;
  period_start?: string;
  period_end?: string;
  sections: ReportSection[];
  metadata?: Record<string, any>;
}

/**
 * Report section (table, chart, summary, text)
 */
export interface ReportSection {
  title: string;
  type: 'table' | 'chart' | 'summary' | 'text' | 'metrics';
  data: any;
  config?: Record<string, any>;
}

/**
 * Report summary metrics
 */
export interface ReportSummary {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Convert database generated_reports row to GeneratedReport type
 */
export function mapDbReportToGeneratedReport(dbReport: any): GeneratedReport {
  return {
    id: dbReport.id,
    report_definition_id: dbReport.report_definition_id || null,
    report_type: dbReport.report_type as ReportType,
    format: dbReport.format as ReportFormat,
    status: dbReport.status as ReportStatus,
    generated_for_user_id: dbReport.generated_for_user_id || null,
    generated_by_user_id: dbReport.generated_by_user_id || null,
    parameters: dbReport.parameters || {},
    filters: dbReport.filters || {},
    date_range_start: dbReport.date_range_start || null,
    date_range_end: dbReport.date_range_end || null,
    storage_path: dbReport.storage_path || dbReport.file_path || null,
    download_url: dbReport.download_url || null,
    download_url_expires_at: dbReport.download_url_expires_at || null,
    file_size_bytes: dbReport.file_size_bytes ? Number(dbReport.file_size_bytes) : null,
    page_count: dbReport.page_count ? Number(dbReport.page_count) : null,
    error_message: dbReport.error_message || null,
    error_details: dbReport.error_details || null,
    processing_started_at: dbReport.processing_started_at || null,
    processing_completed_at: dbReport.processing_completed_at || null,
    processing_duration_ms: dbReport.processing_duration_ms ? Number(dbReport.processing_duration_ms) : null,
    download_count: dbReport.download_count ? Number(dbReport.download_count) : 0,
    schedule_id: dbReport.schedule_id || null,
    created_at: dbReport.created_at,
    updated_at: dbReport.updated_at,
  };
}

/**
 * Check if report is ready for download
 */
export function isReportReady(report: GeneratedReport): boolean {
  return report.status === 'completed' && report.download_url !== null;
}

/**
 * Check if report has failed
 */
export function isReportFailed(report: GeneratedReport): boolean {
  return report.status === 'failed';
}

/**
 * Check if report download URL is expired
 */
export function isReportDownloadExpired(report: GeneratedReport): boolean {
  if (!report.download_url_expires_at) return false;
  return new Date(report.download_url_expires_at) < new Date();
}

/**
 * Format report status for display
 */
export function formatReportStatus(status: ReportStatus): string {
  const statusMap: Record<ReportStatus, string> = {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    expired: 'Expired',
  };
  return statusMap[status] || status;
}

/**
 * Format report type for display
 */
export function formatReportType(type: ReportType): string {
  const typeMap: Record<string, string> = {
    portfolio_statement: 'Portfolio Statement',
    performance_report: 'Performance Report',
    tax_report: 'Tax Report',
    transaction_report: 'Transaction Report',
    fee_report: 'Fee Report',
  };
  return typeMap[type] || type;
}
