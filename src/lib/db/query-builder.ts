import { supabase } from "@/integrations/supabase/client";
import { TableName } from "@/contracts/dbSchema";
import { logError } from "@/lib/logger";

import { Tables, DBResult } from "./types";
import { validateSelect } from "./validators";
import { normalizeError } from "./normalization";

/**
 * NOTE: This file contains intentional `as any` casts for dynamic query building.
 * These are required for the fluent API pattern where method chaining requires
 * runtime type flexibility. Type safety is preserved through generic constraints.
 */

// =============================================================================
// QUERY BUILDER WRAPPER
// =============================================================================

/**
 * Create a type-safe query builder with validation
 */
export function from<T extends keyof Tables>(table: T) {
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
