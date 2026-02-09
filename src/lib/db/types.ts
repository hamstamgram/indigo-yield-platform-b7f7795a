import type { Database } from "@/integrations/supabase/types";
import { TableName } from "@/contracts/dbSchema";

export type { TableName };

// =============================================================================
// PROTECTED TABLES (Must use canonical RPC, not direct mutations)
// =============================================================================

/**
 * Tables that MUST NOT be mutated directly via .insert()/.update()/.delete()
 * These tables require crystallization and audit through canonical RPCs.
 */
export const PROTECTED_TABLES = [
  "transactions_v2",
  "yield_distributions",
  "fund_daily_aum",
  "yield_allocations",
  "fee_allocations",
  "ib_allocations",
] as const;

export type ProtectedTable = (typeof PROTECTED_TABLES)[number];

/** Check if a table is protected (requires RPC mutations) */
export function isProtectedTable(table: string): table is ProtectedTable {
  return (PROTECTED_TABLES as readonly string[]).includes(table);
}

// =============================================================================
// TYPES
// =============================================================================

export type Tables = Database["public"]["Tables"];
export type TableRow<T extends TableName> = T extends keyof Tables ? Tables[T]["Row"] : never;

export interface DBResult<T> {
  data: T | null;
  error: DBError | null;
  success: boolean;
}

export interface DBError {
  message: string;
  code: string;
  userMessage: string;
  originalError?: unknown;
}
