import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// TYPES
// =============================================================================

export type RPCFunctions = Database["public"]["Functions"];
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
