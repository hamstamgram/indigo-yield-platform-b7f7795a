/**
 * Data Hooks - Main Barrel Export
 *
 * USAGE: Import all hooks from this file:
 *   import { useActiveFunds, useInvestors, useYieldOperations } from "@/hooks/data";
 *
 * This is the canonical import path. Individual shim files in this directory
 * are deprecated and will be removed in v2.0.
 *
 * Hooks are organized into three categories:
 * - Admin: Operations, yield distribution, fees, reports
 * - Investor: Portfolio, balance, withdrawals, statements
 * - Shared: Funds, profiles, transactions, documents
 */

// Admin hooks
export * from "./admin";

// Investor hooks
export * from "./investor";

// Shared hooks
export * from "./shared";
