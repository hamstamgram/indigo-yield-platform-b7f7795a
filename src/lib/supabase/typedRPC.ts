/**
 * Typed RPC Helper for Supabase
 *
 * This utility provides type-safe RPC function calls to eliminate `as any` casts.
 * Includes runtime validation for enum parameters to prevent database errors.
 *
 * NOTE: This is a legacy wrapper that internally uses the canonical RPC gateway.
 * For new code, prefer importing { rpc } from "@/lib/rpc/index" directly.
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

import type { Database } from "@/integrations/supabase/types";
import { rpc } from "@/lib/rpc/index";

// Extract RPC function types from Database
type RPCFunctions = Database["public"]["Functions"];

// Type-safe RPC caller with runtime enum validation
// Uses 'as any' for functions not in the type registry (e.g., newly added RPCs)
export async function callRPC<T extends keyof RPCFunctions>(
  functionName: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: Error | null;
}> {
  const result = await rpc.call(functionName as any, args);

  return {
    data: result.data,
    error: result.error ? new Error(result.error.message) : null,
  };
}

// Type-safe RPC caller with no arguments (for functions that take no params)
// Uses 'as any' for functions not in the type registry (e.g., newly added RPCs)
export async function callRPCNoArgs<T extends keyof RPCFunctions>(
  functionName: T
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: Error | null;
}> {
  const result = await rpc.callNoArgs(functionName as any);

  return {
    data: result.data,
    error: result.error ? new Error(result.error.message) : null,
  };
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
 * ```
 */

// Export type helpers for advanced usage
export type RPCFunctionNames = keyof RPCFunctions;
export type RPCArgs<T extends RPCFunctionNames> = RPCFunctions[T]["Args"];
export type RPCReturn<T extends RPCFunctionNames> = RPCFunctions[T]["Returns"];
