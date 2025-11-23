/**
 * Report Types
 * Type definitions for the reporting system
 */

// Report Types
export type ReportType =
  | "portfolio_summary"
  | "transaction_history"
  | "tax_summary"
  | "performance_analysis"
  | "holdings_detail"
  | "monthly_statement"
  | "capital_gains"
  | "income_statement"
  | "custom";

// Report Formats
export type ReportFormat = "pdf" | "excel" | "csv" | "json";

// Report Status
export type ReportStatus = "pending" | "queued" | "processing" | "completed" | "failed" | "cancelled";

// Report Frequency (for schedules)
export type ReportFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "custom";

// Delivery Method
export type DeliveryMethod = "email" | "download" | "storage";

// Report Filters
export interface ReportFilters {
  dateRangeStart?: string;
  dateRangeEnd?: string;
  assetCodes?: string[];
  transactionTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  status?: string[];
  tags?: string[];
  [key: string]: unknown;
}

// Report Parameters
export interface ReportParameters {
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeDetailedTransactions?: boolean;
  groupBy?: "asset" | "type" | "date" | "category";
  sortBy?: "date" | "amount" | "asset" | "type";
  sortOrder?: "asc" | "desc";
  confidential?: boolean;
  watermark?: string;
  pageSize?: "letter" | "a4" | "legal";
  orientation?: "portrait" | "landscape";
  [key: string]: unknown;
}

// Report Definition (configuration for each report type)
export interface ReportDefinition {
  id: string;
  reportType: ReportType;
  name: string;
  description: string | null;
  templateConfig: Record<string, unknown>;
  defaultFilters: ReportFilters;
  availableFormats: ReportFormat[];
  isAdminOnly: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Generate Report Request
export interface GenerateReportRequest {
  reportType: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
  parameters?: ReportParameters;
  reportDefinitionId?: string;
  scheduleId?: string;
  deliveryMethod?: DeliveryMethod;
}

// Generate Report Response
export interface GenerateReportResponse {
  success: boolean;
  reportId?: string;
  status?: ReportStatus;
  estimatedCompletionSeconds?: number;
  error?: string;
}

// Generated Report (stored report instance)
export interface GeneratedReport {
  id: string;
  reportDefinitionId: string | null;
  reportType: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  generatedForUserId: string | null;
  generatedByUserId: string | null;
  parameters: ReportParameters;
  filters: ReportFilters;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  storagePath: string | null;
  fileSizeBytes: number | null;
  pageCount: number | null;
  downloadUrl: string | null;
  downloadUrlExpiresAt: string | null;
  downloadCount: number;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  processingDurationMs: number | null;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
  scheduleId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Download Report Request
export interface DownloadReportRequest {
  reportId: string;
}

// Download Report Response
export interface DownloadReportResponse {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: string;
  fileName?: string;
  fileSizeBytes?: number;
  error?: string;
}

// Report Schedule (automated report generation)
export interface ReportSchedule {
  id: string;
  reportDefinitionId: string;
  name: string;
  description: string | null;
  frequency: ReportFrequency;
  dayOfWeek: number | null; // 0-6 (Sunday-Saturday)
  dayOfMonth: number | null; // 1-31
  timeOfDay: string; // HH:MM format
  timezone: string;
  recipientUserIds: string[];
  recipientEmails: string[];
  deliveryMethod: DeliveryMethod[];
  parameters: ReportParameters;
  filters: ReportFilters;
  formats: ReportFormat[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastRunStatus: string | null;
  runCount: number;
  failureCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Report Statistics
export interface ReportStatistics {
  reportType: ReportType;
  totalGenerated: number;
  successCount: number;
  failureCount: number;
  avgProcessingTimeMs: number;
  totalDownloads: number;
  lastGeneratedAt: string | null;
}

// Excel Report Generator Types

// Report Styles (for Excel formatting)
export interface ReportStyles {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headerColor?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

// Holding Data
export interface HoldingData {
  assetCode: string;
  assetName: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  allocationPercentage: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercentage: number;
}

// Transaction Data
export interface TransactionData {
  date: Date | string;
  type: string;
  assetCode: string;
  amount: number;
  value: number;
  status: string;
  note?: string;
  txHash?: string;
}

// Performance Period
export interface PerformancePeriod {
  period: string;
  beginValue: number;
  endValue: number;
  netCashFlow: number;
  return: number;
  returnPercentage: number;
}

// Report Data (complete report structure)
export interface ReportData {
  title: string;
  subtitle?: string;
  reportPeriod: string;
  generatedDate: Date;
  confidential?: boolean;
  investor?: {
    name: string;
    accountNumber?: string;
  };
  summary: {
    beginningBalance?: number;
    totalDeposits?: number;
    totalWithdrawals?: number;
    netIncome?: number;
    totalFees?: number;
    endingBalance?: number;
    totalValue?: number;
    totalReturn?: number;
    returnPercentage?: number;
    mtdReturn?: number;
    qtdReturn?: number;
    ytdReturn?: number;
    itdReturn?: number;
  };
  holdings?: HoldingData[];
  transactions?: TransactionData[];
  performance?: {
    periods: PerformancePeriod[];
  };
  fees?: any[];
}
