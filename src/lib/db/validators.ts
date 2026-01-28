import {
  DB_TABLES,
  hasCompositePK,
  getPrimaryKeyColumns,
  type TableName,
} from "@/contracts/dbSchema";
import { logWarn } from "@/lib/logger";

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate select columns against table schema
 * Warns on potentially problematic selections
 */
export function validateSelect(table: TableName, selectStr: string): void {
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
export function validateColumns(table: TableName, columns: string[]): string[] {
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
