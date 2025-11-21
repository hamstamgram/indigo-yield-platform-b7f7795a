// Phase 3 TypeScript Types
// Generated for new database tables and features

export type TicketStatus = "open" | "in_progress" | "waiting_on_lp" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "account" | "portfolio" | "statement" | "technical" | "general";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages_jsonb: TicketMessage[];
  attachments: string[];
  assigned_admin_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  timestamp: string;
  is_admin: boolean;
}

export type NotificationType = "deposit" | "statement" | "performance" | "system" | "support";
export type NotificationPriority = "low" | "medium" | "high";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data_jsonb?: Record<string, any>;
  read_at?: string;
  priority: NotificationPriority;
  created_at: string;
}

export type DocumentType = "statement" | "notice" | "terms" | "tax" | "other";

export interface Document {
  id: string;
  user_id: string;
  fund_id?: string;
  type: DocumentType;
  title: string;
  storage_path: string;
  period_start?: string;
  period_end?: string;
  created_at: string;
  created_by?: string;
  checksum?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_label?: string;
  user_agent?: string;
  ip?: string;
  refresh_token_id?: string;
  created_at: string;
  last_seen_at: string;
  revoked_at?: string;
  revoked_by?: string;
}

export type FundStatus = "active" | "inactive";
export type BenchmarkType = "BTC" | "ETH" | "STABLE" | "CUSTOM";

export interface FundConfiguration {
  id: string;
  code: string;
  name: string;
  currency: string;
  status: FundStatus;
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  inception_date: string;
  benchmark: BenchmarkType;
  fee_version: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

export interface YieldSettings {
  id: string;
  frequency: "daily" | "weekly";
  rate_bps: number;
  effective_from: string;
  created_by?: string;
  created_at: string;
}

export type AccessEvent =
  | "login"
  | "logout"
  | "2fa_setup"
  | "2fa_verify"
  | "session_revoked"
  | "password_change";

export interface AccessLog {
  id: string;
  user_id: string;
  event: AccessEvent;
  ip?: string;
  user_agent?: string;
  device_label?: string;
  success: boolean;
  created_at: string;
}

export type ShareScope = "portfolio" | "documents" | "statement";

export interface SecureShare {
  id: string;
  owner_user_id: string;
  fund_id?: string;
  scope: ShareScope;
  token: string;
  expires_at: string;
  max_views?: number;
  views_count: number;
  revoked_at?: string;
  created_at: string;
  created_by?: string;
}

export interface WebPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  revoked_at?: string;
}

export interface Benchmark {
  id: number;
  symbol: string;
  date: string;
  price_usd: number;
  ret_1d?: number;
  ret_mtd?: number;
  ret_qtd?: number;
  ret_ytd?: number;
  ret_itd?: number;
  created_at: string;
}

export interface BalanceAdjustment {
  id: string;
  user_id: string;
  fund_id?: string;
  amount: number;
  currency: string;
  reason: string;
  notes?: string;
  audit_ref?: string;
  created_at: string;
  created_by: string;
}

export interface FundFeeHistory {
  id: string;
  fund_id: string;
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  effective_from: string;
  created_by: string;
  created_at: string;
}

// Extended user profile with Phase 3 fields
export interface InvestorProfile extends Record<string, any> {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_admin: boolean;
  fee_percentage: number;
  avatar_url?: string;
  totp_enabled: boolean;
  totp_verified: boolean;
  status: "Active" | "Pending" | "Closed";
  created_at: string;
  updated_at: string;
}

// Onboarding wizard types
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingData {
  profile: Partial<InvestorProfile>;
  documents_acknowledged: boolean;
  selected_funds: string[];
  step: number;
}

// Portfolio analytics types
export interface PortfolioAnalytics {
  user_id: string;
  fund_id?: string;
  period: "MTD" | "QTD" | "YTD" | "ITD";
  returns: number[];
  dates: string[];
  benchmark_returns?: number[];
  allocation: AllocationData[];
  performance_metrics: PerformanceMetrics;
}

export interface AllocationData {
  asset: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PerformanceMetrics {
  total_return: number;
  annualized_return: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
}

// Admin KPI Dashboard types
export interface AdminKPI {
  aum: number;
  inflows: number;
  outflows: number;
  net_new_money: number;
  mgmt_fees_accrued: number;
  perf_fees_accrued: number;
  lp_count: number;
  active_lp_count: number;
  churn_rate: number;
  period_start: string;
  period_end: string;
}

// API response types
export interface APIResponse<T> {
  data: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

// Error monitoring types
export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  user_id?: string;
  url?: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  tags?: Record<string, string>;
}

// Share link types
export interface ShareLinkData {
  token: string;
  url: string;
  expires_at: string;
  scope: ShareScope;
  max_views?: number;
}

export interface ShareViewerData {
  portfolio?: PortfolioAnalytics;
  documents?: Document[];
  statement?: Document;
  redacted: boolean;
}

// Theme types
export type ThemeMode = "system" | "light" | "dark";

export interface ThemePreference {
  mode: ThemeMode;
  user_id: string;
  updated_at: string;
}

// i18n types
export interface I18nConfig {
  locale: string;
  fallback_locale: string;
  available_locales: string[];
}

export interface TranslationKeys {
  [key: string]: string | TranslationKeys;
}
