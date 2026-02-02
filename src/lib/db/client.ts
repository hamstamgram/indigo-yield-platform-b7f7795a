import { supabase } from "@/integrations/supabase/client";
import { hasCompositePK, type TableName } from "@/contracts/dbSchema";
import { logError, logInfo } from "@/lib/logger";

import { Tables, DBResult, DBError, isProtectedTable } from "./types";
import { normalizeError } from "./normalization";

/**
 * NOTE: This file contains intentional `as any` casts for generic database operations.
 * These are necessary for dynamic table/column access where TypeScript cannot infer
 * the exact types at compile time. Type safety is enforced through:
 * - Generic constraints (T extends keyof Tables)
 * - Runtime validation (hasCompositePK, isProtectedTable)
 * - Normalized error handling
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a single record by ID (only for tables with single "id" PK)
 */
export async function getById<T extends keyof Tables>(
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
    // Intentional: Dynamic column name for generic function - type safety ensured by hasCompositePK check
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
export async function exists<T extends keyof Tables>(
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
export async function count<T extends keyof Tables>(
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
export async function insert<T extends keyof Tables>(
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
export async function insertMany<T extends keyof Tables>(
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
export async function update<T extends keyof Tables>(
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
export async function updateWhere<T extends keyof Tables>(
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
export async function updateIn<T extends keyof Tables>(
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
export async function remove<T extends keyof Tables>(
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
export async function removeIn<T extends keyof Tables>(
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
export async function upsert<T extends keyof Tables>(
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
export async function upsertMany<T extends keyof Tables>(
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
