import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// TYPES
// =============================================================================

export type RPCFunctions = Database["public"]["Functions"] & {
  get_funds_daily_flows: {
    Args: { p_date: string };
    Returns: unknown;
  };
  get_paged_audit_logs: {
    Args: {
      p_limit?: number;
      p_offset?: number;
      p_entity?: string;
      p_action?: string;
      p_actor_id?: string;
    };
    Returns: any[];
  };
  get_paged_notifications: {
    Args: {
      p_user_id: string;
      p_limit?: number;
      p_offset?: number;
    };
    Returns: any[];
  };
  get_paged_investor_summaries: {
    Args: {
      p_limit?: number;
      p_offset?: number;
      p_status?: string;
    };
    Returns: any[];
  };
  get_admin_stats: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  get_platform_flow_metrics: {
    Args: { p_days?: number };
    Returns: unknown;
  };
  purge_fund_hard: {
    Args: { p_fund_id: string };
    Returns: unknown;
  };
  get_period_delivery_stats: {
    Args: { p_period_id: string };
    Returns: unknown;
  };
  get_all_investors_summary: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  // Explicitly add functions that need type enforcement
  unvoid_transaction: {
    Args: { p_transaction_id: string; p_admin_id: string; p_reason: string };
    Returns: unknown;
  };
  unvoid_transactions_bulk: {
    Args: { p_transaction_ids: string[]; p_admin_id: string; p_reason: string };
    Returns: unknown;
  };
  void_transactions_bulk: {
    Args: { p_transaction_ids: string[]; p_admin_id: string; p_reason: string };
    Returns: unknown;
  };
};

export type RPCFunctionName = keyof RPCFunctions;

export interface RPCResult<T> {
  data: T | null;
  error: RPCError | null;
  success: boolean;
}

export interface RPCError {
  message: string;
  code: string;
  userMessage: string;
  originalError?: unknown;
}
