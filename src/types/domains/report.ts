/**
 * Report Domain Types
 * Comprehensive types for the reporting system
 */

// Report Types
export type ReportType =
  | "performance"
  | "transactions"
  | "custom"
  | "monthly"
  | "annual"
  | "portfolio_summary"
  | "transaction_history"
  | "tax_summary"
  | "performance_analysis"
  | "holdings_detail"
  | "monthly_statement"
  | "capital_gains"
  | "income_statement";

// Report Formats
export type ReportFormat = "pdf" | "excel" | "csv" | "json";

// Report Status
export type ReportStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

// Report Frequency (for schedules)
export type ReportFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "custom";

// Delivery Method
export type DeliveryMethod = "email" | "download" | "storage";

// Report Filters (alias for backward compatibility)
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

// Backward compat alias
export type ReportFilter = ReportFilters;

// Report Parameters (alias for backward compatibility)
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

// Backward compat alias
export type ReportParameter = ReportParameters;

// Report Definition (configuration for each report type)
export interface ReportDefinition {
  id: string;
  reportType: ReportType;
  name: string;
  description: string | null;
  templateConfig: Record<string, unknown>;
  defaultFilters: ReportFilter;
  availableFormats: ReportFormat[];
  isAdminOnly: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Base Report interface
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  description?: string;
  generated_at: string;
  date_range: {
    start: string;
    end: string;
  };
  format: ReportFormat;
  status: ReportStatus;
  url?: string;
  metadata?: Record<string, unknown>;
  user_id: string;
}

// Generate Report Request
export interface GenerateReportRequest {
  reportType: ReportType | string;
  format: ReportFormat;
  filters?: ReportFilter;
  parameters?: ReportParameter;
  reportDefinitionId?: string;
  scheduleId?: string;
  deliveryMethod?: DeliveryMethod;
  userId?: string;
  reportId?: string;
}

// Generate Report Response
export interface GenerateReportResponse {
  success: boolean;
  reportId?: string;
  status?: ReportStatus;
  estimatedCompletionSeconds?: number;
  data?: Blob | Uint8Array;
  filename?: string;
  error?: string;
}

// Generated Report (stored report instance)
export interface GeneratedReport {
  id: string;
  reportDefinitionId: string | null;
  reportType: ReportType;
  reportName: string;
  format: ReportFormat;
  status: ReportStatus;
  generatedForUserId: string | null;
  generatedByUserId: string | null;
  parameters: ReportParameter;
  filters: ReportFilter;
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

// Download Report Request/Response
export interface DownloadReportRequest {
  reportId: string;
}

export interface DownloadReportResponse {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: string;
  fileName?: string;
  fileSizeBytes?: number;
  error?: string;
  data?: Uint8Array;
  contentType?: string;
}

// Report Schedule (automated report generation)
export interface ReportSchedule {
  id: string;
  reportDefinitionId: string;
  name: string;
  description: string | null;
  frequency: ReportFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  timezone: string;
  recipientUserIds: string[];
  recipientEmails: string[];
  deliveryMethod: DeliveryMethod[];
  parameters: ReportParameter;
  filters: ReportFilter;
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
  /** Quantity - string for NUMERIC precision */
  quantity: string;
  /** Current price - string for NUMERIC(38,18) precision */
  currentPrice: string;
  /** Current value - string for NUMERIC(38,18) precision */
  currentValue: string;
  /** Allocation percentage - string for decimal precision */
  allocationPercentage: string;
  /** cost basis - string for NUMERIC(38,18) precision */
  costBasis: string;
  /** Unrealized gain - string for NUMERIC(38,18) precision */
  unrealizedGain: string;
  /** Unrealized gain percentage - string for decimal precision */
  unrealizedGainPercentage: string;
}

// Transaction Data
export interface TransactionData {
  date: Date | string;
  type: string;
  assetCode: string;
  /** Transaction amount - string for NUMERIC(38,18) precision */
  amount: string;
  /** Transaction value - string for NUMERIC(38,18) precision */
  value: string;
  is_voided: boolean;
  note?: string;
  txHash?: string;
  // Computed display field - derived from is_voided
  status?: string;
}

// Performance Period
export interface PerformancePeriod {
  period: string;
  /** Beginning value - string for NUMERIC(38,18) precision */
  beginValue: string;
  /** Ending value - string for NUMERIC(38,18) precision */
  endValue: string;
  /** Net cash flow - string for NUMERIC(38,18) precision */
  netCashFlow: string;
  /** Return amount - string for NUMERIC(38,18) precision */
  return: string;
  /** Return percentage - string for decimal precision */
  returnPercentage: string;
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
    /** Beginning balance - string for NUMERIC(38,18) precision */
    beginningBalance?: string;
    /** Total deposits - string for NUMERIC(38,18) precision */
    totalDeposits?: string;
    /** Total withdrawals - string for NUMERIC(38,18) precision */
    totalWithdrawals?: string;
    /** Net income - string for NUMERIC(38,18) precision */
    netIncome?: string;
    /** Total fees - string for NUMERIC(38,18) precision */
    totalFees?: string;
    /** Ending balance - string for NUMERIC(38,18) precision */
    endingBalance?: string;
    /** Total value - string for NUMERIC(38,18) precision */
    totalValue?: string;
    /** Total return - string for NUMERIC(38,18) precision */
    totalReturn?: string;
    /** Return percentage - string for decimal precision */
    returnPercentage?: string;
    /** MTD return - string for decimal precision */
    mtdReturn?: string;
    /** QTD return - string for decimal precision */
    qtdReturn?: string;
    /** YTD return - string for decimal precision */
    ytdReturn?: string;
    /** ITD return - string for decimal precision */
    itdReturn?: string;
  };
  holdings?: HoldingData[];
  transactions?: TransactionData[];
  performance?: {
    periods: PerformancePeriod[];
  };
  fees?: Array<{
    type: string;
    /** Fee amount - string for NUMERIC(38,18) precision */
    amount: string;
    description?: string;
  }>;
}

// ============================================================================
// Investor Report Types (for PDF generation)
// ============================================================================

export interface InvestorFund {
  name: string;
  currency: string;
  // Beginning Balance
  begin_balance_mtd: string;
  begin_balance_qtd: string;
  begin_balance_ytd: string;
  begin_balance_itd: string;
  // Additions
  additions_mtd: string;
  additions_qtd: string;
  additions_ytd: string;
  additions_itd: string;
  // Redemptions
  redemptions_mtd: string;
  redemptions_qtd: string;
  redemptions_ytd: string;
  redemptions_itd: string;
  // Net Income
  net_income_mtd: string;
  net_income_qtd: string;
  net_income_ytd: string;
  net_income_itd: string;
  // Ending Balance
  ending_balance_mtd: string;
  ending_balance_qtd: string;
  ending_balance_ytd: string;
  ending_balance_itd: string;
  // Rate of Return
  return_rate_mtd: string;
  return_rate_qtd: string;
  return_rate_ytd: string;
  return_rate_itd: string;
}

export interface InvestorData {
  name: string;
  reportDate: string;
  funds: InvestorFund[];
}
