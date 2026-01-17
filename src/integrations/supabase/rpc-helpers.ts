/**
 * Typed RPC Helper Utilities
 *
 * This file provides type-safe wrappers for Supabase RPC function calls.
 * All return types are automatically inferred from the Database schema.
 *
 * NOTE: This is a legacy wrapper that internally uses the canonical RPC gateway.
 * For new code, prefer importing { rpc } from "@/lib/rpc" directly.
 */

import type { Database } from "./types";
import { rpc } from "@/lib/rpc";

// Extract RPC function types from Database schema
type RpcFunctions = Database["public"]["Functions"];

// Type helper to extract Args and Returns from RPC function definition
type RpcArgs<T extends keyof RpcFunctions> = RpcFunctions[T]["Args"];
type RpcReturns<T extends keyof RpcFunctions> = RpcFunctions[T]["Returns"];

/**
 * Type-safe RPC call wrapper
 *
 * Usage:
 * ```typescript
 * const { data, error } = await callRpc("create_withdrawal_request", {
 *   p_investor_id: investorId,
 *   p_fund_id: fundId,
 *   p_amount: amount,
 *   p_type: "partial"
 * });
 * // data is automatically typed as string (the return type from types.ts)
 * ```
 */
export async function callRpc<T extends keyof RpcFunctions>(
  functionName: T,
  args: RpcArgs<T>
): Promise<{ data: RpcReturns<T> | null; error: any }> {
  const result = await rpc.call(functionName, args as any);
  return {
    data: result.data as RpcReturns<T> | null,
    error: result.error,
  };
}

/**
 * Type-safe RPC call wrapper that throws on error
 *
 * Usage:
 * ```typescript
 * const data = await callRpcOrThrow("approve_withdrawal", {
 *   p_request_id: withdrawalId,
 *   p_approved_amount: amount
 * });
 * // data is automatically typed as boolean
 * ```
 */
export async function callRpcOrThrow<T extends keyof RpcFunctions>(
  functionName: T,
  args: RpcArgs<T>
): Promise<RpcReturns<T>> {
  const result = await rpc.call(functionName, args as any);

  if (result.error) {
    throw new Error(`RPC ${String(functionName)} failed: ${result.error.message}`);
  }

  return result.data as RpcReturns<T>;
}

/**
 * Type definitions for commonly used RPC functions
 * These can be imported directly for better IDE support
 */

// Withdrawal-related RPC types
export type CreateWithdrawalArgs = RpcArgs<"create_withdrawal_request">;
export type CreateWithdrawalReturn = RpcReturns<"create_withdrawal_request">; // string

export type ApproveWithdrawalArgs = RpcArgs<"approve_withdrawal">;
export type ApproveWithdrawalReturn = RpcReturns<"approve_withdrawal">; // boolean

export type RejectWithdrawalArgs = RpcArgs<"reject_withdrawal">;
export type RejectWithdrawalReturn = RpcReturns<"reject_withdrawal">; // boolean

export type CompleteWithdrawalArgs = RpcArgs<"complete_withdrawal">;
export type CompleteWithdrawalReturn = RpcReturns<"complete_withdrawal">; // boolean

// Admin-related RPC types
export type IsSuperAdminReturn = RpcReturns<"is_super_admin">; // boolean
export type GetUserAdminStatusArgs = RpcArgs<"get_user_admin_status">;
export type GetUserAdminStatusReturn = RpcReturns<"get_user_admin_status">; // boolean

// Snapshot-related RPC types
export type GenerateSnapshotArgs = RpcArgs<"generate_fund_period_snapshot">;
export type GenerateSnapshotReturn = RpcReturns<"generate_fund_period_snapshot">; // string

export type LockSnapshotArgs = RpcArgs<"lock_fund_period_snapshot">;
export type LockSnapshotReturn = RpcReturns<"lock_fund_period_snapshot">; // boolean

export type IsPeriodLockedArgs = RpcArgs<"is_period_locked">;
export type IsPeriodLockedReturn = RpcReturns<"is_period_locked">; // boolean

// Yield-related RPC types
export type FinalizeMonthYieldArgs = RpcArgs<"finalize_month_yield">;
export type FinalizeMonthYieldReturn = RpcReturns<"finalize_month_yield">; // Json

/**
 * Re-export Database type for convenience
 */
export type { Database };
