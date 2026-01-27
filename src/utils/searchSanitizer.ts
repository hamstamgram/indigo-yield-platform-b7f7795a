/**
 * Search Input Sanitization Utilities
 *
 * Prevents SQL injection attacks in Supabase PostgREST filter operations.
 * User input should ALWAYS be sanitized before being used in .or(), .ilike(),
 * or any other filter string interpolation.
 */

/**
 * Sanitize search input for use in Supabase filter operations.
 * Removes SQL special characters and normalizes whitespace.
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for use in filters
 *
 * @example
 * // Before (VULNERABLE):
 * query.or(`name.ilike.%${userInput}%`)
 *
 * // After (SAFE):
 * const safe = sanitizeSearchInput(userInput);
 * if (safe) query.or(`name.ilike.%${safe}%`);
 */
export function sanitizeSearchInput(input: string | undefined | null): string {
  if (!input || typeof input !== "string") return "";

  return (
    input
      .trim()
      // Remove SQL special characters that could be used for injection
      .replace(/[%_\\'"`;()[\]{}|&^$#@!~`]/g, "")
      // Remove any control characters (intentional security measure)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, "")
      // Normalize whitespace (collapse multiple spaces)
      .replace(/\s+/g, " ")
      // Limit length to prevent DoS via extremely long inputs
      .slice(0, 100)
  );
}

/**
 * Escape characters that have special meaning in PostgREST filters.
 * Use this when you need to preserve certain characters but escape them properly.
 *
 * @param input - Pre-sanitized input to escape
 * @returns Escaped string safe for PostgREST filters
 */
export function escapePostgrestFilter(input: string): string {
  if (!input || typeof input !== "string") return "";

  return (
    input
      // Escape backslashes first
      .replace(/\\/g, "\\\\")
      // Escape commas (used to separate filter values)
      .replace(/,/g, "\\,")
      // Escape periods (used in filter syntax)
      .replace(/\./g, "\\.")
  );
}

/**
 * Check if a search term is valid (non-empty after sanitization)
 *
 * @param input - Raw user input
 * @returns true if the sanitized input is valid for searching
 */
export function isValidSearchTerm(input: string | undefined | null): boolean {
  const sanitized = sanitizeSearchInput(input);
  return sanitized.length > 0;
}

/**
 * Build a safe OR filter string for multiple columns.
 * Returns null if the search term is invalid.
 *
 * @param searchTerm - Raw user input
 * @param columns - Array of column names to search
 * @returns Safe filter string or null if invalid
 *
 * @example
 * const filter = buildSafeOrFilter(userInput, ['name', 'email']);
 * if (filter) query = query.or(filter);
 */
export function buildSafeOrFilter(
  searchTerm: string | undefined | null,
  columns: string[]
): string | null {
  const sanitized = sanitizeSearchInput(searchTerm);
  if (!sanitized || columns.length === 0) return null;

  return columns.map((col) => `${col}.ilike.%${sanitized}%`).join(",");
}
