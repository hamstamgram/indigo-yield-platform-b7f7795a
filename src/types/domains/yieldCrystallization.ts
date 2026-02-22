/**
 * Yield Crystallization Domain Types
 * Types for yield crystallization on capital events
 */

/**
 * Visibility scope for yield events
 */
export type YieldVisibilityScope = "admin_only" | "investor_visible";

/**
 * Trigger type for yield crystallization
 */
export type YieldTriggerType = "deposit" | "withdrawal" | "month_end" | "manual";

/**
 * Yield event record
 */
export interface YieldEvent {
  id: string;
  investor_id: string;
  fund_id: string;
  event_date: string;
  created_at: string;

  // Trigger context
  trigger_type: YieldTriggerType;
  trigger_transaction_id: string | null;

  // AUM snapshot - strings for NUMERIC(28,10) precision
  fund_aum_before: string;
  fund_aum_after: string;

  // Investor position snapshot - strings for precision
  investor_balance: string;
  investor_share_pct: string;

  // Yield calculation - strings for NUMERIC(28,10) precision
  fund_yield_pct: string;
  gross_yield_amount: string;

  // Fee deductions - strings for NUMERIC(28,10) precision
  fee_pct: string;
  fee_amount: string;
  net_yield_amount: string;

  // Period tracking
  period_start: string;
  period_end: string;
  days_in_period: number;

  made_visible_at: string | null;
  made_visible_by: string | null;

  // Audit
  reference_id: string;
  is_voided: boolean;
  voided_at: string | null;
  voided_by: string | null;
  created_by: string | null;
}

/**
 * Fund yield snapshot record
 */
export interface FundYieldSnapshot {
  id: string;
  fund_id: string;
  snapshot_date: string;

  // AUM values - strings for NUMERIC(28,10) precision
  opening_aum: string;

  // Calculated yield - strings for NUMERIC(28,10) precision
  gross_yield_pct: string;
  gross_yield_amount: string;

  // Period info
  period_start: string;
  period_end: string;
  days_in_period: number;

  // Trigger
  trigger_type: YieldTriggerType;
  trigger_reference: string | null;

  // Audit
  is_voided: boolean;
  created_at: string;
  created_by: string | null;
}

/**
 * Result of crystallization operation
 */
export interface CrystallizationResult {
  success: boolean;
  error?: string;
  skipped?: boolean;
  reason?: string;
  snapshot_id?: string;
  event_id?: string;
  fund_id?: string;
  trigger_date?: string;
  trigger_type?: string;
  period_start?: string;
  /** Previous / opening AUM - string for NUMERIC(28,10) precision */
  previous_aum?: string;
  opening_aum?: string;
  /** Current / closing AUM - string for NUMERIC(28,10) precision */
  current_aum?: string;
  /** Fund yield percentage - string for decimal precision */
  fund_yield_pct?: string;
  /** Gross yield - string for NUMERIC(28,10) precision */
  gross_yield?: string | number;
  investors_processed?: number;
  yield_tx_count?: number;
  /** Total yield distributed - string for NUMERIC(28,10) precision */
  total_yield_distributed?: string;
  allocated_sum?: string;
  remainder?: string;
}

/**
 * Result of finalization operation
 */
export interface FinalizationResult {
  success: boolean;
  fund_id: string;
  period_start: string;
  period_end: string;
  events_made_visible: number;
  /** Total yield finalized - string for NUMERIC(28,10) precision */
  total_yield_finalized: string;
}

/**
 * Aggregated yield summary for an investor
 */
export interface InvestorYieldAggregate {
  investor_id: string;
  /** Total gross yield - string for NUMERIC(28,10) precision */
  total_gross_yield: string;
  /** Total fees - string for NUMERIC(28,10) precision */
  total_fees: string;
  /** Total net yield - string for NUMERIC(28,10) precision */
  total_net_yield: string;
  crystallization_count: number;
}

/**
 * Pending yield events summary
 */
export interface PendingYieldSummary {
  count: number;
  /** Total yield - string for NUMERIC(28,10) precision */
  totalYield: string;
}
