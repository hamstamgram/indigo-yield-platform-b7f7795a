import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// TYPES
// =============================================================================

import { RPC_FUNCTIONS } from "@/contracts/rpcSignatures";

// =============================================================================
// TYPES
// =============================================================================

export type RPCFunctions = Database["public"]["Functions"] & {
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
};

export type RPCFunctionName = keyof RPCFunctions | (typeof RPC_FUNCTIONS)[number];

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
