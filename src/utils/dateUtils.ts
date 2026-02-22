/**
 * Canonical Date Utilities for Database Operations
 *
 * CRITICAL: All date-to-string conversions for database operations MUST use these utilities.
 *
 * WHY: `toISOString().split("T")[0]` is NOT timezone-safe:
 * - toISOString() converts to UTC, not local time
 * - Example: User in PST at 11pm on Jan 15 → toISOString() returns "2026-01-16T07:00:00Z"
 *   → split gives "2026-01-16" (WRONG DATE!)
 *
 * SOLUTION: Use date-fns format() which respects local timezone.
 */

import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

/**
 * Format a Date object to YYYY-MM-DD string in local timezone.
 * Use for all database date fields (tx_date, effective_date, yield_date, etc.)
 *
 * @param date - The Date object to format
 * @returns YYYY-MM-DD string in local timezone
 */
export function formatDateForDB(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get today's date as YYYY-MM-DD string in UTC.
 * Use for all transaction dates to maintain global ledger consistency.
 *
 * @returns Today's date in UTC (YYYY-MM-DD)
 */
export function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get today's date as YYYY-MM-DD string, safe for any timezone.
 * Sets time to noon to avoid edge cases near midnight.
 *
 * @returns Today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Noon to avoid edge cases
  return format(today, "yyyy-MM-dd");
}

/**
 * Get the last day of a given month as YYYY-MM-DD string.
 * Used for month-end yield dates and reporting periods.
 *
 * @param year - The year
 * @param month - The month (1-12, NOT 0-11)
 * @returns Last day of month as YYYY-MM-DD string
 */
export function getMonthEndDate(year: number, month: number): string {
  // month is 1-based, but Date constructor expects 0-based
  const date = new Date(year, month - 1, 1);
  return format(endOfMonth(date), "yyyy-MM-dd");
}

/**
 * Get the first day of a given month as YYYY-MM-DD string.
 * Used for period_start dates.
 *
 * @param year - The year
 * @param month - The month (1-12, NOT 0-11)
 * @returns First day of month as YYYY-MM-DD string
 */
export function getMonthStartDate(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return format(startOfMonth(date), "yyyy-MM-dd");
}

/**
 * Parse a YYYY-MM-DD string to a Date object at noon local time.
 * Use when you need to work with a date from the database.
 *
 * @param dateStr - YYYY-MM-DD string
 * @returns Date object at noon local time
 */
export function parseDateFromDB(dateStr: string): Date {
  const date = parseISO(dateStr);
  date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases
  return date;
}

/**
 * Format a Date object for display in UI (localized).
 * Use ONLY for display, never for database operations.
 *
 * @param date - The Date object to format
 * @param formatStr - date-fns format string (default: "MMM d, yyyy")
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(date: Date, formatStr: string = "MMM d, yyyy"): string {
  return format(date, formatStr);
}

/**
 * Validate that a string is a valid YYYY-MM-DD date.
 *
 * @param dateStr - String to validate
 * @returns true if valid YYYY-MM-DD format
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const date = parseISO(dateStr);
  return !isNaN(date.getTime());
}
