/**
 * Strict Database Gateway
 * ========================
 * ALL direct table reads MUST go through this module.
 * Direct supabase.from().select() calls should be avoided elsewhere.
 *
 * Features:
 * - Compile-time type safety via Supabase types
 * - Runtime validation for composite PKs (prevents .select("id") errors)
 * - Column existence validation
 * - Error normalization
 * - Query logging for debugging
 *
 * @example
 * ```typescript
 * import { db } from "@/lib/db";
 *
 * // Safe read with validation
 * const { data, error } = await db.from("investor_positions")
 *   .select("investor_id, fund_id, current_value")
 *   .eq("investor_id", investorId);
 *
 * // Or use helper functions
 * const position = await db.getById("investors", investorId);
 * ```
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  DB_TABLES,
  COMPOSITE_PK_TABLES,
  hasCompositePK,
  getPrimaryKeyColumns,
  type TableName,
} from "@/contracts/dbSchema";
import { getUserFriendlyError } from "@/lib/errors";
import { logError, logWarn, logInfo } from "@/lib/logger";

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
  "fund_aum_events",
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

type Tables = Database["public"]["Tables"];
type TableRow<T extends TableName> = T extends keyof Tables ? Tables[T]["Row"] : never;

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

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate select columns against table schema
 * Warns on potentially problematic selections
 */
function validateSelect(table: TableName, selectStr: string): void {
  // Check for dangerous .select("id") on composite PK tables
  if (hasCompositePK(table)) {
    if (selectStr === "id" || selectStr.includes(", id,") || selectStr.startsWith("id,")) {
      logWarn(`db.select.compositePK`, {
        table,
        select: selectStr,
        message: `Table "${table}" has a composite primary key. Selecting "id" may fail.`,
        suggestion: `Use ${getPrimaryKeyColumns(table).join(", ")} instead.`,
      });
    }
  }

  // Check for * on large tables (performance warning)
  if (selectStr === "*") {
    const largeTables = ["transactions_v2", "yield_distributions", "audit_logs"];
    if (largeTables.includes(table)) {
      logWarn(`db.select.performance`, {
        table,
        message: `Selecting * from large table "${table}". Consider selecting specific columns.`,
      });
    }
  }
}

/**
 * Validate that columns exist in table schema
 */
function validateColumns(table: TableName, columns: string[]): string[] {
  const tableMetadata = DB_TABLES[table as keyof typeof DB_TABLES];
  if (!tableMetadata) return columns;

  const validColumns = tableMetadata.columns as readonly string[];
  const invalidColumns = columns.filter((col) => !validColumns.includes(col) && col !== "*");

  if (invalidColumns.length > 0) {
    logWarn(`db.columns.invalid`, {
      table,
      invalidColumns,
      message: `Columns not found in ${table}: ${invalidColumns.join(", ")}`,
    });
  }

  return columns;
}

// =============================================================================
// ERROR NORMALIZATION
// =============================================================================

function normalizeError(error: unknown, context: string): DBError {
  const err = error as { message?: string; code?: string } | null;
  const message = err?.message || String(error);
  const code = err?.code || "UNKNOWN";

  let userMessage = getUserFriendlyError(error);
  let internalCode = code;

  if (message.includes("ambiguous")) {
    internalCode = "AMBIGUOUS_COLUMN";
    userMessage = "Database query error (ambiguous column). Please contact support.";
  }

  if (message.includes("does not exist")) {
    internalCode = "COLUMN_NOT_FOUND";
    userMessage = "Database schema mismatch. Please refresh or contact support.";
  }

  return {
    message,
    code: internalCode,
    userMessage,
    originalError: error,
  };
}

// =============================================================================
// QUERY BUILDER WRAPPER
// =============================================================================

/**
 * Create a type-safe query builder with validation
 */
function from<T extends keyof Tables>(table: T) {
  return {
    /**
     * Select columns with validation
     */
    select<S extends string>(columns: S = "*" as S) {
      validateSelect(table as TableName, columns);

      const query = supabase.from(table).select(columns);

      return {
        // Pass through all query methods with error handling
        // Using 'any' for internal Supabase types to avoid complex generic inference issues
        eq: <K extends keyof Tables[T]["Row"]>(column: K, value: Tables[T]["Row"][K]) =>
          wrapQuery(query.eq(column as string, value as any), table),

        neq: <K extends keyof Tables[T]["Row"]>(column: K, value: Tables[T]["Row"][K]) =>
          wrapQuery(query.neq(column as string, value as any), table),

        gt: <K extends keyof Tables[T]["Row"]>(column: K, value: Tables[T]["Row"][K]) =>
          wrapQuery(query.gt(column as string, value as any), table),

        gte: <K extends keyof Tables[T]["Row"]>(column: K, value: Tables[T]["Row"][K]) =>
          wrapQuery(query.gte(column as string, value as any), table),

        lt: <K extends keyof Tables[T]["Row"]>(column: K, value: Tables[T]["Row"][K]) =>
          wrapQuery(query.lt(column as string, value as any), table),

        lte: <K extends keyof Tables[T]["Row"]>(column: K, value: Tables[T]["Row"][K]) =>
          wrapQuery(query.lte(column as string, value as any), table),

        in: <K extends keyof Tables[T]["Row"]>(column: K, values: Tables[T]["Row"][K][]) =>
          wrapQuery(query.in(column as string, values as any), table),

        is: <K extends keyof Tables[T]["Row"]>(column: K, value: null | boolean) =>
          wrapQuery(query.is(column as string, value), table),

        order: <K extends keyof Tables[T]["Row"]>(
          column: K,
          options?: { ascending?: boolean; nullsFirst?: boolean }
        ) => wrapQuery(query.order(column as string, options), table),

        limit: (count: number) => wrapQuery(query.limit(count), table),

        range: (from: number, to: number) => wrapQuery(query.range(from, to), table),

        single: () => wrapQuerySingle((query as any).single(), table),

        maybeSingle: () => wrapQueryMaybeSingle((query as any).maybeSingle(), table),

        // Execute query directly
        then: (
          resolve: (value: DBResult<unknown[]>) => void,
          reject?: (error: unknown) => void
        ) => {
          return query.then(({ data, error }) => {
            if (error) {
              const normalized = normalizeError(error, table);
              resolve({ data: null, error: normalized, success: false });
            } else {
              resolve({ data: data as unknown[], error: null, success: true });
            }
          }, reject);
        },
      };
    },
  };
}

/**
 * Wrap a query to normalize errors
 */
function wrapQuery<T>(query: PromiseLike<{ data: T | null; error: unknown }>, table: string) {
  const wrapped = {
    eq: (column: string, value: unknown) => wrapQuery((query as any).eq(column, value), table),
    neq: (column: string, value: unknown) => wrapQuery((query as any).neq(column, value), table),
    gt: (column: string, value: unknown) => wrapQuery((query as any).gt(column, value), table),
    gte: (column: string, value: unknown) => wrapQuery((query as any).gte(column, value), table),
    lt: (column: string, value: unknown) => wrapQuery((query as any).lt(column, value), table),
    lte: (column: string, value: unknown) => wrapQuery((query as any).lte(column, value), table),
    in: (column: string, values: unknown[]) => wrapQuery((query as any).in(column, values), table),
    is: (column: string, value: null | boolean) =>
      wrapQuery((query as any).is(column, value), table),
    order: (column: string, options?: { ascending?: boolean }) =>
      wrapQuery((query as any).order(column, options), table),
    limit: (count: number) => wrapQuery((query as any).limit(count), table),
    range: (from: number, to: number) => wrapQuery((query as any).range(from, to), table),
    single: () => wrapQuerySingle((query as any).single(), table),
    maybeSingle: () => wrapQueryMaybeSingle((query as any).maybeSingle(), table),
    then: async (resolve: (value: DBResult<T>) => void, reject?: (error: unknown) => void) => {
      try {
        const { data, error } = await query;
        if (error) {
          const normalized = normalizeError(error, table);
          logError(`db.query.${table}`, error);
          resolve({ data: null, error: normalized, success: false });
        } else {
          resolve({ data, error: null, success: true });
        }
      } catch (err) {
        if (reject) reject(err);
        else {
          const normalized = normalizeError(err, table);
          resolve({ data: null, error: normalized, success: false });
        }
      }
    },
  };
  return wrapped;
}

function wrapQuerySingle<T>(query: PromiseLike<{ data: T | null; error: unknown }>, table: string) {
  return {
    then: async (resolve: (value: DBResult<T>) => void, reject?: (error: unknown) => void) => {
      try {
        const { data, error } = await query;
        if (error) {
          const normalized = normalizeError(error, table);
          resolve({ data: null, error: normalized, success: false });
        } else {
          resolve({ data, error: null, success: true });
        }
      } catch (err) {
        if (reject) reject(err);
        else {
          const normalized = normalizeError(err, table);
          resolve({ data: null, error: normalized, success: false });
        }
      }
    },
  };
}

function wrapQueryMaybeSingle<T>(
  query: PromiseLike<{ data: T | null; error: unknown }>,
  table: string
) {
  return wrapQuerySingle(query, table);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a single record by ID (only for tables with single "id" PK)
 */
async function getById<T extends keyof Tables>(
  table: T,
  id: string
): Promise<DBResult<Tables[T]["Row"]>> {
  if (hasCompositePK(table as TableName)) {
    return {
      data: null,
      error: {
        message: `Cannot use getById on table with composite PK: ${table}`,
        code: "COMPOSITE_PK",
        userMessage: "Invalid operation for this table.",
      },
      success: false,
    };
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id" as any, id)
    .single();

  if (error) {
    return {
      data: null,
      error: normalizeError(error, table),
      success: false,
    };
  }

  return { data: data as unknown as Tables[T]["Row"], error: null, success: true };
}

/**
 * Check if a record exists
 */
async function exists<T extends keyof Tables>(
  table: T,
  column: keyof Tables[T]["Row"],
  value: unknown
): Promise<boolean> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column as string, value as any);

  if (error) {
    logError(`db.exists.${table}`, error);
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Count records matching a condition
 */
async function count<T extends keyof Tables>(
  table: T,
  column?: keyof Tables[T]["Row"],
  value?: unknown
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  if (column && value !== undefined) {
    query = query.eq(column as string, value as any);
  }

  const { count: rowCount, error } = await query;

  if (error) {
    logError(`db.count.${table}`, error);
    return 0;
  }

  return rowCount ?? 0;
}

// =============================================================================
// MUTATION FUNCTIONS (with protected table enforcement)
// =============================================================================

/**
 * Insert a record into a table
 * @throws Error if table is protected (use canonical RPC instead)
 */
async function insert<T extends keyof Tables>(
  table: T,
  data: Tables[T]["Insert"],
  options?: { returning?: boolean }
): Promise<DBResult<Tables[T]["Row"]>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct inserts to ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.insert.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.insert.${table}`, { table });

  try {
    const query = supabase.from(table).insert(data as any);
    const { data: result, error } =
      options?.returning !== false ? await query.select().single() : await query;

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: result as unknown as Tables[T]["Row"], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Insert multiple records into a table
 */
async function insertMany<T extends keyof Tables>(
  table: T,
  data: Tables[T]["Insert"][]
): Promise<DBResult<Tables[T]["Row"][]>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct inserts to ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.insertMany.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.insertMany.${table}`, { table, count: data.length });

  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data as any)
      .select();

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: result as unknown as Tables[T]["Row"][], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Update records in a table
 */
async function update<T extends keyof Tables>(
  table: T,
  data: Partial<Tables[T]["Update"]>,
  filter: { column: keyof Tables[T]["Row"]; value: unknown }
): Promise<DBResult<Tables[T]["Row"][]>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct updates to ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.update.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.update.${table}`, { table, column: filter.column });

  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data as any)
      .eq(filter.column as string, filter.value as any)
      .select();

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: result as unknown as Tables[T]["Row"][], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Update records matching multiple filters
 */
async function updateWhere<T extends keyof Tables>(
  table: T,
  data: Partial<Tables[T]["Update"]>,
  filters: Array<{ column: keyof Tables[T]["Row"]; value: unknown }>
): Promise<DBResult<Tables[T]["Row"][]>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct updates to ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.updateWhere.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.updateWhere.${table}`, { table });

  try {
    let query = supabase.from(table).update(data as any);
    for (const filter of filters) {
      query = query.eq(filter.column as string, filter.value as any);
    }
    const { data: result, error } = await query.select();

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: result as unknown as Tables[T]["Row"][], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Update records matching an array of IDs
 */
async function updateIn<T extends keyof Tables>(
  table: T,
  data: Partial<Tables[T]["Update"]>,
  column: keyof Tables[T]["Row"],
  values: unknown[]
): Promise<DBResult<Tables[T]["Row"][]>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct updates to ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.updateIn.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.updateIn.${table}`, { table, column, count: values.length });

  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data as any)
      .in(column as string, values as any)
      .select();

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: result as unknown as Tables[T]["Row"][], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Delete a record from a table
 */
async function remove<T extends keyof Tables>(
  table: T,
  filter: { column: keyof Tables[T]["Row"]; value: unknown }
): Promise<DBResult<null>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct deletes from ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.delete.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.delete.${table}`, { table, column: filter.column });

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(filter.column as string, filter.value as any);

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: null, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Delete records matching an array of values
 */
async function removeIn<T extends keyof Tables>(
  table: T,
  column: keyof Tables[T]["Row"],
  values: unknown[]
): Promise<DBResult<null>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct deletes from ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.deleteIn.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.deleteIn.${table}`, { table, column, count: values.length });

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .in(column as string, values as any);

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: null, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Upsert a record (insert or update if exists)
 */
async function upsert<T extends keyof Tables>(
  table: T,
  data: Tables[T]["Insert"],
  options?: { onConflict?: string }
): Promise<DBResult<Tables[T]["Row"]>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct upserts to ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.upsert.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.upsert.${table}`, { table });

  try {
    const query = supabase.from(table).upsert(data as any, {
      onConflict: options?.onConflict,
    });
    const { data: result, error } = await query.select().single();

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: result as unknown as Tables[T]["Row"], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

/**
 * Upsert multiple records
 */
async function upsertMany<T extends keyof Tables>(
  table: T,
  data: Tables[T]["Insert"][],
  options?: { onConflict?: string }
): Promise<DBResult<Tables[T]["Row"][]>> {
  // Block protected tables
  if (isProtectedTable(table)) {
    const error: DBError = {
      message: `Direct upserts to ${table} are blocked. Use canonical RPC instead.`,
      code: "PROTECTED_TABLE",
      userMessage: "This operation must go through the proper workflow.",
    };
    logError(`db.upsertMany.protected`, new Error(error.message), { table });
    return { data: null, error, success: false };
  }

  logInfo(`db.upsertMany.${table}`, { table, count: data.length });

  try {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data as any, { onConflict: options?.onConflict })
      .select();

    if (error) {
      return {
        data: null,
        error: normalizeError(error, table),
        success: false,
      };
    }

    return { data: result as unknown as Tables[T]["Row"][], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, table),
      success: false,
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const db = {
  /** Create a type-safe query builder */
  from,
  /** Get a single record by ID */
  getById,
  /** Check if a record exists */
  exists,
  /** Count records */
  count,

  // Mutation methods
  /** Insert a single record */
  insert,
  /** Insert multiple records */
  insertMany,
  /** Update records matching a filter */
  update,
  /** Update records matching multiple filters */
  updateWhere,
  /** Update records matching array of values */
  updateIn,
  /** Delete records matching a filter */
  delete: remove,
  /** Delete records matching array of values */
  deleteIn: removeIn,
  /** Upsert a single record */
  upsert,
  /** Upsert multiple records */
  upsertMany,

  // Metadata
  /** Table metadata */
  tables: DB_TABLES,
  /** Tables with composite PKs */
  compositePKTables: COMPOSITE_PK_TABLES,
  /** Protected tables (require RPC for mutations) */
  protectedTables: PROTECTED_TABLES,
  /** Check if table has composite PK */
  hasCompositePK,
  /** Get PK columns for a table */
  getPrimaryKeyColumns,
  /** Check if table is protected */
  isProtectedTable,
};

// Re-export types
export type { TableName, TableRow };
