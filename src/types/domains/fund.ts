/**
 * Fund Domain Types
 * Clean abstractions for fund-related entities
 */

import { Database } from "@/integrations/supabase/types";

type DbFund = Database["public"]["Tables"]["funds"]["Row"];
type FundStatus = Database["public"]["Enums"]["fund_status"];
type BenchmarkType = Database["public"]["Enums"]["benchmark_type"];

export interface Fund {
  id: string;
  code: string;
  name: string;
  fund_class: string;
  asset: string;
  status: FundStatus;
  inception_date: string;
  mgmt_fee_bps: number | null;
  perf_fee_bps: number | null;
  min_investment: number | null;
  lock_period_days: number | null;
  high_water_mark: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FundConfiguration {
  id: string;
  code: string;
  name: string;
  currency: string;
  benchmark: BenchmarkType;
  status: FundStatus;
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  inception_date: string;
  effective_from: string;
  fee_version: number;
  created_at: string;
  updated_at: string;
}

export interface FundPerformance {
  fund_id: string;
  nav_date: string;
  nav_per_share: number | null;
  aum: number;
  investor_count: number | null;
  shares_outstanding: number | null;
  gross_return_pct: number | null;
  net_return_pct: number | null;
  fees_accrued: number | null;
  total_inflows: number | null;
  total_outflows: number | null;
}

export interface FundKPI {
  fund_id: string;
  fund_code: string;
  fund_name: string;
  aum: number;
  investor_count: number;
  mtd_return: number | null;
  qtd_return: number | null;
  ytd_return: number | null;
  itd_return: number | null;
}

export function mapDbFundToFund(dbFund: DbFund): Fund {
  return {
    id: dbFund.id,
    code: dbFund.code,
    name: dbFund.name,
    fund_class: dbFund.fund_class,
    asset: dbFund.asset,
    status: dbFund.status || "inactive",
    inception_date: dbFund.inception_date,
    mgmt_fee_bps: dbFund.mgmt_fee_bps,
    perf_fee_bps: dbFund.perf_fee_bps,
    min_investment: dbFund.min_investment,
    lock_period_days: dbFund.lock_period_days,
    high_water_mark: dbFund.high_water_mark,
    created_at: dbFund.created_at,
    updated_at: dbFund.updated_at,
  };
}
