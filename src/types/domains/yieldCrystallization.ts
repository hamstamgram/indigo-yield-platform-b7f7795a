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
  
  // AUM snapshot
  fund_aum_before: number;
  fund_aum_after: number;
  
  // Investor position snapshot
  investor_balance: number;
  investor_share_pct: number;
  
  // Yield calculation
  fund_yield_pct: number;
  gross_yield_amount: number;
  
  // Fee deductions
  fee_pct: number;
  fee_amount: number;
  net_yield_amount: number;
  
  // Period tracking
  period_start: string;
  period_end: string;
  days_in_period: number;
  
  // Visibility control
  visibility_scope: YieldVisibilityScope;
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
  
  // AUM values
  opening_aum: number;
  closing_aum: number;
  
  // Calculated yield
  gross_yield_pct: number;
  gross_yield_amount: number;
  
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
  skipped?: boolean;
  reason?: string;
  snapshot_id?: string;
  fund_id?: string;
  trigger_date?: string;
  trigger_type?: string;
  period_start?: string;
  previous_aum?: number;
  current_aum?: number;
  fund_yield_pct?: number;
  gross_yield?: number;
  investors_processed?: number;
  total_yield_distributed?: number;
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
  total_yield_finalized: number;
}

/**
 * Aggregated yield summary for an investor
 */
export interface InvestorYieldAggregate {
  investor_id: string;
  total_gross_yield: number;
  total_fees: number;
  total_net_yield: number;
  crystallization_count: number;
}

/**
 * Pending yield events summary
 */
export interface PendingYieldSummary {
  count: number;
  totalYield: number;
}
