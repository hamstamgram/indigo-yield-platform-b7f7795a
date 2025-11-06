// @ts-nocheck
/**
 * Comprehensive Type Definitions for Report Generation System
 * Indigo Yield Platform
 */

import { Database } from '@/integrations/supabase/types';

// Extract database types
export type ReportType = Database['public']['Enums']['report_type'];
export type ReportFormat = Database['public']['Enums']['report_format'];
export type ReportStatus = Database['public']['Enums']['report_status'];
export type ReportScheduleFrequency = Database['public']['Enums']['report_schedule_frequency'];

// Database row types
export type ReportDefinitionRow = Database['public']['Tables']['report_definitions']['Row'];
export type GeneratedReportRow = Database['public']['Tables']['generated_reports']['Row'];
export type ReportScheduleRow = Database['public']['Tables']['report_schedules']['Row'];
export type ReportAccessLogRow = Database['public']['Tables']['report_access_logs']['Row'];
export type ReportShareRow = Database['public']['Tables']['report_shares']['Row'];

// ============================================================================
// Report Configuration Types
// ============================================================================

export interface ReportDefinition {
  id: string;
  reportType: ReportType;
  name: string;
  description: string | null;
  templateConfig: ReportTemplateConfig;
  defaultFilters: ReportFilters;
  availableFormats: ReportFormat[];
  isAdminOnly: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplateConfig {
  sections: ReportSection[];
  charts?: ChartConfig[];
  tables?: TableConfig[];
  styles?: ReportStyles;
  metadata?: Record<string, any>;
}

export type ReportSection =
  | 'cover'
  | 'executive_summary'
  | 'summary'
  | 'holdings'
  | 'performance'
  | 'transactions'
  | 'charts'
  | 'disclosures'
  | 'allocation'
  | 'performance_trend'
  | 'capital_gains'
  | 'income'
  | 'cost_basis'
  | 'trend_analysis'
  | 'fund_breakdown'
  | 'investor_breakdown'
  | 'new_investors'
  | 'activity_breakdown'
  | 'engagement'
  | 'volume_charts'
  | 'breakdown_by_type'
  | 'breakdown_by_asset'
  | 'kyc_status'
  | 'aml_alerts'
  | 'pending_verifications'
  | 'fund_comparison'
  | 'performance_attribution'
  | 'risk_metrics'
  | 'fee_breakdown'
  | 'investor_analysis'
  | 'trends'
  | 'events'
  | 'user_actions'
  | 'system_events';

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  title: string;
  dataSource: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  options?: Record<string, any>;
}

export interface TableConfig {
  title: string;
  columns: TableColumn[];
  dataSource: string;
  sorting?: boolean;
  pagination?: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime';
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  format?: string;
}

export interface ReportStyles {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: number;
  headerColor?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

// ============================================================================
// Report Filters and Parameters
// ============================================================================

export interface ReportFilters {
  // Date range
  dateRangeStart?: string | Date;
  dateRangeEnd?: string | Date;
  period?: 'mtd' | 'qtd' | 'ytd' | 'itd' | 'custom';

  // Entity filters
  investorIds?: string[];
  fundIds?: string[];
  assetCodes?: string[];
  portfolioIds?: string[];

  // Transaction filters
  transactionTypes?: string[];
  transactionStatuses?: string[];
  minAmount?: number;
  maxAmount?: number;

  // Performance filters
  minReturn?: number;
  maxReturn?: number;
  benchmarkId?: string;

  // Compliance filters
  kycStatus?: string[];
  amlStatus?: string[];
  verificationStatus?: string[];

  // Pagination
  limit?: number;
  offset?: number;
  page?: number;

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Custom filters
  [key: string]: any;
}

export interface ReportParameters {
  // Display options
  includeCharts?: boolean;
  includeTransactions?: boolean;
  includeDisclosures?: boolean;
  includeTaxDetails?: boolean;
  includePerformanceAttribution?: boolean;

  // Grouping options
  groupBy?: 'asset' | 'fund' | 'investor' | 'type' | 'month' | 'quarter' | 'year';
  aggregateBy?: 'sum' | 'avg' | 'min' | 'max' | 'count';

  // Formatting options
  currency?: 'USD' | 'EUR' | 'GBP';
  locale?: string;
  dateFormat?: string;
  numberFormat?: string;

  // Content options
  detailLevel?: 'summary' | 'standard' | 'detailed';
  confidential?: boolean;
  watermark?: boolean;

  // Custom parameters
  [key: string]: any;
}

// ============================================================================
// Generated Report Types
// ============================================================================

export interface GeneratedReport {
  id: string;
  reportDefinitionId: string | null;
  reportType: ReportType;
  format: ReportFormat;
  status: ReportStatus;

  // User context
  generatedForUserId: string | null;
  generatedByUserId: string | null;

  // Report parameters
  parameters: ReportParameters;
  filters: ReportFilters;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;

  // Storage and metadata
  storagePath: string | null;
  fileSizeBytes: number | null;
  pageCount: number | null;

  // Download tracking
  downloadUrl: string | null;
  downloadUrlExpiresAt: string | null;
  downloadCount: number;

  // Processing info
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  processingDurationMs: number | null;
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;

  // Scheduling context
  scheduleId: string | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Report Schedule Types
// ============================================================================

export interface ReportSchedule {
  id: string;
  reportDefinitionId: string;

  // Schedule configuration
  name: string;
  description: string | null;
  frequency: ReportScheduleFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  timezone: string;

  // Recipients and delivery
  recipientUserIds: string[];
  recipientEmails: string[];
  deliveryMethod: ('email' | 'storage' | 'sftp')[];

  // Report parameters
  parameters: ReportParameters;
  filters: ReportFilters;
  formats: ReportFormat[];

  // Schedule state
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

// ============================================================================
// Report Data Types
// ============================================================================

export interface ReportData {
  // Report metadata
  title: string;
  subtitle?: string;
  generatedDate: Date;
  reportPeriod: string;
  confidential?: boolean;

  // Entity information
  investor?: InvestorInfo;
  fund?: FundInfo;
  platform?: PlatformInfo;

  // Summary data
  summary: ReportSummary;

  // Detailed data sections
  holdings?: HoldingData[];
  transactions?: TransactionData[];
  performance?: PerformanceData;
  fees?: FeeData[];
  compliance?: ComplianceData;

  // Charts and visualizations
  charts?: ChartData[];

  // Custom sections
  [key: string]: any;
}

export interface InvestorInfo {
  id: string;
  name: string;
  email: string;
  accountNumber?: string;
  investorType?: string;
  kycStatus?: string;
  amlStatus?: string;
  taxId?: string;
  address?: AddressInfo;
}

export interface FundInfo {
  id: string;
  name: string;
  symbol?: string;
  type: string;
  inceptionDate?: string;
  managementFee?: number;
  performanceFee?: number;
  aum?: number;
}

export interface PlatformInfo {
  name: string;
  logo?: string;
  address?: AddressInfo;
  phone?: string;
  email?: string;
  website?: string;
  regulatoryInfo?: string;
}

export interface AddressInfo {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ReportSummary {
  totalValue?: number;
  totalReturn?: number;
  returnPercentage?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  totalFees?: number;
  netIncome?: number;
  beginningBalance?: number;
  endingBalance?: number;

  // Period-specific returns
  mtdReturn?: number;
  qtdReturn?: number;
  ytdReturn?: number;
  itdReturn?: number;

  // Additional metrics
  [key: string]: any;
}

export interface HoldingData {
  assetCode: string;
  assetName: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercentage: number;
  allocationPercentage: number;
  change24h?: number;
  change24hPercentage?: number;
}

export interface TransactionData {
  id: string;
  date: string;
  type: string;
  assetCode: string;
  amount: number;
  price?: number;
  value: number;
  fee?: number;
  status: string;
  txHash?: string;
  note?: string;
}

export interface PerformanceData {
  periods: PerformancePeriod[];
  attribution?: PerformanceAttribution[];
  benchmarkComparison?: BenchmarkComparison[];
  riskMetrics?: RiskMetrics;
}

export interface PerformancePeriod {
  period: string;
  beginDate: string;
  endDate: string;
  beginValue: number;
  endValue: number;
  netCashFlow: number;
  return: number;
  returnPercentage: number;
  timeWeightedReturn?: number;
  moneyWeightedReturn?: number;
}

export interface PerformanceAttribution {
  assetCode: string;
  assetName: string;
  contributionToReturn: number;
  contributionPercentage: number;
  weight: number;
}

export interface BenchmarkComparison {
  benchmarkName: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  sharpeRatio?: number;
}

export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  maxDrawdown: number;
  beta?: number;
  var95?: number;
  cvar95?: number;
}

export interface FeeData {
  feeType: string;
  period: string;
  amount: number;
  assetCode: string;
  rate: number;
  description?: string;
}

export interface ComplianceData {
  kycStatus: string;
  kycLastUpdated?: string;
  amlStatus: string;
  amlLastCheck?: string;
  riskRating?: string;
  alerts?: ComplianceAlert[];
  documents?: ComplianceDocument[];
}

export interface ComplianceAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  date: string;
  resolved: boolean;
}

export interface ComplianceDocument {
  id: string;
  type: string;
  name: string;
  status: string;
  uploadedAt: string;
  expiresAt?: string;
}

export interface ChartData {
  type: ChartConfig['type'];
  title: string;
  data: any[];
  labels?: string[];
  datasets?: ChartDataset[];
  options?: Record<string, any>;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

// ============================================================================
// Report Generation Request/Response Types
// ============================================================================

export interface GenerateReportRequest {
  reportType: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
  parameters?: ReportParameters;
  reportDefinitionId?: string;
  scheduleId?: string;
  deliveryMethod?: ('email' | 'storage' | 'download')[];
  recipientEmails?: string[];
}

export interface GenerateReportResponse {
  success: boolean;
  reportId?: string;
  status?: ReportStatus;
  message?: string;
  error?: string;
  estimatedCompletionTime?: number;
}

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
}

// ============================================================================
// Report Statistics Types
// ============================================================================

export interface ReportStatistics {
  reportType: ReportType;
  format: ReportFormat;
  totalGenerated: number;
  successful: number;
  failed: number;
  avgProcessingTimeMs: number;
  totalDownloads: number;
  totalFileSizeBytes: number;
}

export interface ReportAccessLog {
  id: string;
  reportId: string;
  userId: string | null;
  action: 'view' | 'download' | 'delete' | 'share';
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ReportShare {
  id: string;
  reportId: string;
  sharedByUserId: string | null;
  shareToken: string;
  expiresAt: string;
  maxDownloads: number | null;
  downloadCount: number;
  passwordHash: string | null;
  isActive: boolean;
  createdAt: string;
  lastAccessedAt: string | null;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ReportValidationResult {
  valid: boolean;
  errors: ReportValidationError[];
  warnings: string[];
}

export interface ReportValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ReportGenerationProgress {
  reportId: string;
  status: ReportStatus;
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

export type ReportPermission = 'generate' | 'view' | 'download' | 'delete' | 'schedule' | 'share';

export interface ReportPermissions {
  canGenerate: boolean;
  canView: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canSchedule: boolean;
  canShare: boolean;
}
