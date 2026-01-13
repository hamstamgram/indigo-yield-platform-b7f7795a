/**
 * Admin Hooks - Barrel Export
 * Centralized exports for all admin-specific data hooks
 * 
 * Organized by category for better navigation:
 * - investors: Investor management hooks
 * - transactions: Transaction management hooks
 * - withdrawals: Withdrawal management hooks
 * - yields: Yield distribution hooks
 * - statements: Statement generation hooks
 * - system: System admin & settings hooks
 * - fees: Fee management hooks
 * - funds: Fund management hooks
 * - misc: Email, reports, IB, audit, etc.
 */

// ============= Investors =============
export * from "./exports/investors";

// ============= Transactions =============
export * from "./exports/transactions";

// ============= Withdrawals =============
export * from "./exports/withdrawals";

// ============= Yields =============
export * from "./exports/yields";

// ============= Statements =============
export * from "./exports/statements";

// ============= System =============
export * from "./exports/system";

// ============= Fees =============
export * from "./exports/fees";

// ============= Funds =============
export * from "./exports/funds";

// ============= Misc (Email, Reports, IB, Audit, etc.) =============
export * from "./exports/misc";
