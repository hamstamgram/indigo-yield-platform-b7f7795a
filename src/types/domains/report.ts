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
export type ReportStatus = "pending" | "queued" | "processing" | "completed" | "failed" | "cancelled";

// Report Frequency (for schedules)
export type ReportFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "custom";

// Delivery Method
export type DeliveryMethod = "email" | "download" | "storage";

// Report Filters
export interface ReportFilter {
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
export interface ReportParameter {
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
  metadata?: Record<string, any>;
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
  data?: Blob | Buffer;
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

// CDN URLs for fund icons
export const FUND_ICONS: Record<string, string> = {
  "BTC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  "ETH YIELD FUND": "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  "USDC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  "USDT YIELD FUND": "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  "SOL YIELD FUND": "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  "EURC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
  "XAUT YIELD FUND": "https://storage.mlcdn.com/account_image/855106/eX8YQ2JiQtWXocPigWGSwju5WPTsGq01eOKmTx5p.png",
  "XRP YIELD FUND": "https://storage.mlcdn.com/account_image/855106/mlmOJ9qsJ3LDZaVyWnIqhffzzem0vIts6bourbHO.png",
};

export const LOGO_URL = "https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg";

export const SOCIAL_ICONS = {
  linkedin: "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png",
  instagram: "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png",
  twitter: "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png",
};

/**
 * Returns color based on value - red for negative, green for positive
 */
export const getValueColor = (value: string): string => {
  if (value.startsWith('-') || value.startsWith('(')) {
    return '#dc2626'; // Red
  }
  return '#16a34a'; // Green
};
