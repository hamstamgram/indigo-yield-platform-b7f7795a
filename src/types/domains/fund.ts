/**
 * Fund Domain Types
 * CANONICAL SOURCE - All fund-related types should be imported from here
 *
 * Database Schema Mapping:
 * - funds table: id, code, name, asset, fund_class, status, inception_date, etc.
 */

import { Database } from "@/integrations/supabase/types";

type DbFund = Database["public"]["Tables"]["funds"]["Row"];
export type FundStatus = Database["public"]["Enums"]["fund_status"];
type BenchmarkType = Database["public"]["Enums"]["benchmark_type"];

/**
 * Core Fund type - the main type for fund data
 * Maps to the funds table with standardized naming
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface Fund {
  id: string;
  code: string;
  name: string;
  fund_class: string;
  asset: string;
  status: FundStatus | null;
  inception_date: string;
  /** @precision NUMERIC(28,10) from database - basis points */
  mgmt_fee_bps: string | null;
  /** @precision NUMERIC(28,10) from database - basis points */
  perf_fee_bps: string | null;
  /** @precision NUMERIC(28,10) from database */
  min_investment: string | null;
  /** @precision NUMERIC(28,10) from database */
  high_water_mark: string | null;
  /** @precision NUMERIC(20,8) from database - minimum withdrawal in fund asset */
  min_withdrawal_amount: string | null;
  lock_period_days?: number | null;
  logo_url?: string | null;
  strategy?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Minimal fund reference for dropdowns/lists
 */
export interface FundRef {
  id: string;
  code: string;
  name: string;
  asset: string;
}

/**
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface FundConfiguration {
  id: string;
  code: string;
  name: string;
  currency: string;
  benchmark: BenchmarkType;
  status: FundStatus;
  /** @precision NUMERIC(28,10) from database - basis points */
  mgmt_fee_bps: string;
  /** @precision NUMERIC(28,10) from database - basis points */
  perf_fee_bps: string;
  inception_date: string;
  effective_from: string;
  fee_version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface FundPerformance {
  fund_id: string;
  nav_date: string;
  /** @precision NUMERIC(28,10) from database */
  nav_per_share: string | null;
  /** @precision NUMERIC(28,10) from database */
  aum: string;
  investor_count: number | null;
  /** @precision NUMERIC(28,10) from database */
  shares_outstanding: string | null;
  /** @precision NUMERIC(28,10) from database */
  gross_return_pct: string | null;
  /** @precision NUMERIC(28,10) from database */
  net_return_pct: string | null;
  /** @precision NUMERIC(28,10) from database */
  fees_accrued: string | null;
  /** @precision NUMERIC(28,10) from database */
  total_inflows: string | null;
  /** @precision NUMERIC(28,10) from database */
  total_outflows: string | null;
}

/**
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface FundKPI {
  fund_id: string;
  fund_code: string;
  fund_name: string;
  /** @precision NUMERIC(28,10) from database */
  aum: string;
  investor_count: number;
  /** @precision NUMERIC(28,10) from database */
  mtd_return: string | null;
  /** @precision NUMERIC(28,10) from database */
  qtd_return: string | null;
  /** @precision NUMERIC(28,10) from database */
  ytd_return: string | null;
  /** @precision NUMERIC(28,10) from database */
  itd_return: string | null;
}

/**
 * Convert database fund row to application Fund type
 * Preserves string representation for financial precision
 */
export function mapDbFundToFund(dbFund: DbFund): Fund {
  return {
    id: dbFund.id,
    code: dbFund.code,
    name: dbFund.name,
    fund_class: dbFund.fund_class,
    asset: dbFund.asset,
    status: dbFund.status,
    inception_date: dbFund.inception_date,
    mgmt_fee_bps: dbFund.mgmt_fee_bps != null ? String(dbFund.mgmt_fee_bps) : null,
    perf_fee_bps: dbFund.perf_fee_bps != null ? String(dbFund.perf_fee_bps) : null,
    min_investment: dbFund.min_investment != null ? String(dbFund.min_investment) : null,
    high_water_mark: dbFund.high_water_mark != null ? String(dbFund.high_water_mark) : null,
    min_withdrawal_amount:
      dbFund.min_withdrawal_amount != null ? String(dbFund.min_withdrawal_amount) : null,
    lock_period_days: dbFund.lock_period_days,
    logo_url: dbFund.logo_url,
    strategy: dbFund.strategy,
    created_at: dbFund.created_at,
    updated_at: dbFund.updated_at,
  };
}

/**
 * Convert Fund to FundRef for minimal data transfer
 */
export function toFundRef(fund: Fund): FundRef {
  return {
    id: fund.id,
    code: fund.code,
    name: fund.name,
    asset: fund.asset,
  };
}

/**
 * Convert application Fund type to database format for insert/update
 * Converts string financial fields back to numbers for DB
 */
export function mapFundToDb(fund: Partial<Fund>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Copy non-financial fields as-is
  const stringFields = [
    "id",
    "code",
    "name",
    "fund_class",
    "asset",
    "status",
    "inception_date",
    "logo_url",
    "strategy",
    "created_at",
    "updated_at",
  ] as const;

  for (const field of stringFields) {
    if (field in fund && fund[field] !== undefined) {
      result[field] = fund[field];
    }
  }

  // Convert string financial fields to numbers for DB
  if ("mgmt_fee_bps" in fund) {
    result.mgmt_fee_bps = fund.mgmt_fee_bps != null ? Number(fund.mgmt_fee_bps) : null;
  }
  if ("perf_fee_bps" in fund) {
    result.perf_fee_bps = fund.perf_fee_bps != null ? Number(fund.perf_fee_bps) : null;
  }
  if ("min_investment" in fund) {
    result.min_investment = fund.min_investment != null ? Number(fund.min_investment) : null;
  }
  if ("high_water_mark" in fund) {
    result.high_water_mark = fund.high_water_mark != null ? Number(fund.high_water_mark) : null;
  }
  if ("lock_period_days" in fund) {
    result.lock_period_days = fund.lock_period_days;
  }

  return result;
}

/**
 * Yield settings for funds
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface YieldSettings {
  id: string;
  frequency: "daily" | "weekly";
  /** @precision NUMERIC(28,10) from database - basis points */
  rate_bps: string;
  effective_from: string;
  created_by?: string;
  created_at: string;
}

/**
 * Fund fee history
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface FundFeeHistory {
  id: string;
  fund_id: string;
  /** @precision NUMERIC(28,10) from database - basis points */
  mgmt_fee_bps: string;
  /** @precision NUMERIC(28,10) from database - basis points */
  perf_fee_bps: string;
  effective_from: string;
  created_by: string;
  created_at: string;
}

/**
 * Benchmark data
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface Benchmark {
  id: number;
  symbol: string;
  date: string;
  /** @precision NUMERIC(28,10) from database */
  price_usd: string;
  /** @precision NUMERIC(28,10) from database */
  ret_1d?: string;
  /** @precision NUMERIC(28,10) from database */
  ret_mtd?: string;
  /** @precision NUMERIC(28,10) from database */
  ret_qtd?: string;
  /** @precision NUMERIC(28,10) from database */
  ret_ytd?: string;
  /** @precision NUMERIC(28,10) from database */
  ret_itd?: string;
  created_at: string;
}

// ============================================================================
// Join Types - Used for typed Supabase query results
// ============================================================================

/**
 * RPC result for deposit with crystallization
 */
export interface DepositCrystallizationResult {
  success: boolean;
  deposit_tx_id: string;
  crystallization?: {
    gross_yield: number;
    net_yield: number;
    investors_affected: number;
  };
}
