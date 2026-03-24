/**
 * Dashboard Domain Types
 * Types for dashboard widgets and data
 */

export interface FundWithAUM {
  id: string;
  name: string;
  asset: string;
  /** Current AUM - may come as number from DB */
  currentAUM: string | number;
}

export interface ActivityItem {
  id: string;
  type: "deposit" | "withdrawal" | "yield" | "user" | "report" | "transaction" | "adjustment";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    /** Activity amount - string for NUMERIC(38,18) precision */
    amount?: string;
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
  /** Total AUM - string for NUMERIC(38,18) precision */
  aum: string;
  /** Total inflows - string for NUMERIC(38,18) precision */
  inflows: string;
  /** Total outflows - string for NUMERIC(38,18) precision */
  outflows: string;
  /** Net new money - string for NUMERIC(38,18) precision */
  net_new_money: string;
  /** Management fees accrued - DEPRECATED: Always 0 per CFO policy - do not display */
  mgmt_fees_accrued: string;
  /** Performance fees accrued - string for NUMERIC(38,18) precision */
  perf_fees_accrued: string;
  lp_count: number;
  active_lp_count: number;
  /** Churn rate - string for decimal precision */
  churn_rate: string;
  period_start: string;
  period_end: string;
}
