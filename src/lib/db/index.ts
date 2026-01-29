import {
  DB_TABLES,
  COMPOSITE_PK_TABLES,
  hasCompositePK,
  getPrimaryKeyColumns,
  type TableName,
} from "@/contracts/dbSchema";

import { PROTECTED_TABLES, isProtectedTable, Tables, TableRow, DBResult, DBError } from "./types";

import { from } from "./query-builder";
import {
  getById,
  exists,
  count,
  insert,
  insertMany,
  update,
  updateWhere,
  updateIn,
  remove,
  removeIn,
  upsert,
  upsertMany,
} from "./client";

// Re-export view types and utilities
export * from "./viewTypes";

// Re-export types
export type { TableName, TableRow, DBResult, DBError, ProtectedTable } from "./types";

export { PROTECTED_TABLES, isProtectedTable };

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
