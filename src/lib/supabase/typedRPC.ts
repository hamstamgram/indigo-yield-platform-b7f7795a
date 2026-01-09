/**
 * Typed RPC Helper for Supabase
 *
 * This utility provides type-safe RPC function calls to eliminate `as any` casts.
 *
 * Usage:
 * ```typescript
 * import { callRPC } from '@/lib/supabase/typedRPC';
 *
 * // Before (with as any):
 * const { data, error } = await (supabase.rpc as any)("get_funds_with_aum");
 *
 * // After (type-safe):
 * const { data, error } = await callRPC("get_funds_with_aum");
 * ```
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Extract RPC function types from Database
type RPCFunctions = Database['public']['Functions'];

// Type-safe RPC caller
export async function callRPC<T extends keyof RPCFunctions>(
  functionName: T,
  args: RPCFunctions[T]['Args']
): Promise<{
  data: RPCFunctions[T]['Returns'] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc(functionName, args);

    if (error) {
      return { data: null, error };
    }

    return { data: data as RPCFunctions[T]['Returns'], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// Type-safe RPC caller with no arguments (for functions that take no params)
export async function callRPCNoArgs<T extends keyof RPCFunctions>(
  functionName: T
): Promise<{
  data: RPCFunctions[T]['Returns'] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc(functionName);

    if (error) {
      return { data: null, error };
    }

    return { data: data as RPCFunctions[T]['Returns'], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Examples of usage:
 *
 * 1. RPC with arguments:
 * ```typescript
 * const { data, error } = await callRPC("adjust_investor_position", {
 *   p_investor_id: investorId,
 *   p_fund_id: fundId,
 *   p_adjustment_amount: amount,
 *   p_notes: "Manual adjustment"
 * });
 * ```
 *
 * 2. RPC without arguments:
 * ```typescript
 * const { data, error } = await callRPCNoArgs("get_funds_with_aum");
 * ```
 *
 * 3. With error handling:
 * ```typescript
 * const { data, error } = await callRPC("void_yield_distribution", {
 *   p_distribution_id: distributionId
 * });
 *
 * if (error) {
 *   console.error("RPC call failed:", error);
 *   throw error;
 * }
 *
 * // data is properly typed here!
 * console.log("Success:", data);
 * ```
 */

// Export type helpers for advanced usage
export type RPCFunctionNames = keyof RPCFunctions;
export type RPCArgs<T extends RPCFunctionNames> = RPCFunctions[T]['Args'];
export type RPCReturn<T extends RPCFunctionNames> = RPCFunctions[T]['Returns'];
