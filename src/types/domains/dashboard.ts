/**
 * Dashboard Domain Types
 * Types for dashboard widgets and data
 */

export interface FundWithAUM {
  id: string;
  name: string;
  asset: string;
  currentAUM: number;
}

export interface ActivityItem {
  id: string;
  type: "deposit" | "withdrawal" | "yield" | "user" | "report" | "transaction";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    amount?: number;
    asset?: string;
    investorName?: string;
  };
}

export interface PendingItem {
  id: string;
  type: "withdrawal" | "report";
  title: string;
  subtitle: string;
  amount?: string;
  timestamp: Date;
  priority: "high" | "medium" | "low";
}

// Admin KPI Dashboard types
export interface AdminKPI {
  aum: number;
  inflows: number;
  outflows: number;
  net_new_money: number;
  mgmt_fees_accrued: number; // DEPRECATED: Always 0 per CFO policy - do not display
  perf_fees_accrued: number;
  lp_count: number;
  active_lp_count: number;
  churn_rate: number;
  period_start: string;
  period_end: string;
}
