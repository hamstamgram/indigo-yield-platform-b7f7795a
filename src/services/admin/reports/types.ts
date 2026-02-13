/**
 * Report Types
 */

export interface InvestorReportAsset {
  asset_code: string;
  opening_balance: string;
  closing_balance: string;
  additions: string;
  withdrawals: string;
  yield_earned: string;
  report_id: string;
  // Full performance data
  mtd_beginning_balance: string;
  mtd_additions: string;
  mtd_redemptions: string;
  mtd_net_income: string;
  mtd_ending_balance: string;
  mtd_rate_of_return: string;
  qtd_beginning_balance: string;
  qtd_additions: string;
  qtd_redemptions: string;
  qtd_net_income: string;
  qtd_ending_balance: string;
  qtd_rate_of_return: string;
  ytd_beginning_balance: string;
  ytd_additions: string;
  ytd_redemptions: string;
  ytd_net_income: string;
  ytd_ending_balance: string;
  ytd_rate_of_return: string;
  itd_beginning_balance: string;
  itd_additions: string;
  itd_redemptions: string;
  itd_net_income: string;
  itd_ending_balance: string;
  itd_rate_of_return: string;
}

export interface InvestorReportEmail {
  email: string;
  is_primary: boolean;
  verified: boolean;
}

export type DeliveryStatus = "missing" | "generated" | "sent" | "failed";

export interface InvestorReportSummary {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  investor_emails: InvestorReportEmail[];
  assets: InvestorReportAsset[];
  total_value: string;
  total_yield: string;
  has_reports: boolean;
  report_count: number;
  delivery_status: DeliveryStatus;
  sent_at: string | null;
  statement_id: string | null;
}

export interface InvestorPerformanceReport {
  id: string;
  fund_name: string;
  period_end_date?: string;
  year?: number;
  month?: number;
  created_at: string;
}

export interface PerformanceReportDetail {
  id: string;
  asset_code: string;
  report_month: string | null;
  created_at: string;
  updated_at: string | null;
}
