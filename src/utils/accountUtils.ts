/**
 * Account Utilities
 *
 * Centralized utilities for account type detection and classification.
 * Eliminates duplicate system account checks across components.
 */

import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";

// Re-export for backward compatibility
export { INDIGO_FEES_ACCOUNT_ID };

// ============================================================================
// Constants
// ============================================================================

/**
 * Account type identifiers
 */
export const ACCOUNT_TYPES = {
  FEES_ACCOUNT: "fees_account",
  IB_ACCOUNT: "ib_account",
  REGULAR: "regular",
} as const;

export type AccountType = (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

// ============================================================================
// Type Definitions
// ============================================================================

export interface AccountIdentifiable {
  investorId?: string;
  investor_id?: string;
  id?: string;
  accountType?: string;
  account_type?: string;
  investorName?: string;
  investor_name?: string;
  first_name?: string;
  last_name?: string;
}

// ============================================================================
// Account Detection Functions
// ============================================================================

/**
 * Check if an investor ID is the INDIGO FEES system account
 */
export function isIndigoFeesAccount(investorId: string | null | undefined): boolean {
  return investorId === INDIGO_FEES_ACCOUNT_ID;
}

/**
 * Check if an account is a system account (fees, IB, etc.)
 * System accounts should typically be filtered from regular investor lists
 */
export function isSystemAccount(account: AccountIdentifiable): boolean {
  const investorId = account.investorId || account.investor_id || account.id;
  const accountType = account.accountType || account.account_type;
  const name = getAccountName(account);

  // Check by ID
  if (investorId === INDIGO_FEES_ACCOUNT_ID) {
    return true;
  }

  // Check by account type
  if (accountType === ACCOUNT_TYPES.FEES_ACCOUNT || accountType === ACCOUNT_TYPES.IB_ACCOUNT) {
    return true;
  }

  // Check by name pattern
  if (name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("indigo fees") || lowerName.includes("system")) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an account is a fees account
 */
export function isFeesAccount(account: AccountIdentifiable): boolean {
  const investorId = account.investorId || account.investor_id || account.id;
  const accountType = account.accountType || account.account_type;

  return investorId === INDIGO_FEES_ACCOUNT_ID || accountType === ACCOUNT_TYPES.FEES_ACCOUNT;
}

/**
 * Check if an account is an Introducing Broker (IB) account
 */
export function isIBAccount(account: AccountIdentifiable): boolean {
  const accountType = account.accountType || account.account_type;
  return accountType === ACCOUNT_TYPES.IB_ACCOUNT;
}

/**
 * Check if an account is a regular investor account
 */
export function isRegularAccount(account: AccountIdentifiable): boolean {
  return !isSystemAccount(account);
}

// ============================================================================
// Name Utilities
// ============================================================================

/**
 * Get display name for an account
 */
export function getAccountName(account: AccountIdentifiable): string {
  // Check for investorName first
  if (account.investorName) {
    return account.investorName;
  }
  if (account.investor_name) {
    return account.investor_name;
  }

  // Build from first/last name
  const firstName = account.first_name || "";
  const lastName = account.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return "Unknown Investor";
}

/**
 * Get a shortened display name (first name + last initial)
 */
export function getShortAccountName(account: AccountIdentifiable): string {
  const firstName = account.first_name || "";
  const lastName = account.last_name || "";

  if (firstName && lastName) {
    return `${firstName} ${lastName.charAt(0)}.`;
  }

  return getAccountName(account);
}

// ============================================================================
// Filtering Utilities
// ============================================================================

/**
 * Filter out system accounts from a list
 */
export function filterOutSystemAccounts<T extends AccountIdentifiable>(accounts: T[]): T[] {
  return accounts.filter((account) => !isSystemAccount(account));
}

/**
 * Get only system accounts from a list
 */
export function getSystemAccounts<T extends AccountIdentifiable>(accounts: T[]): T[] {
  return accounts.filter((account) => isSystemAccount(account));
}

/**
 * Partition accounts into system and regular
 */
export function partitionAccounts<T extends AccountIdentifiable>(
  accounts: T[]
): { system: T[]; regular: T[] } {
  const system: T[] = [];
  const regular: T[] = [];

  for (const account of accounts) {
    if (isSystemAccount(account)) {
      system.push(account);
    } else {
      regular.push(account);
    }
  }

  return { system, regular };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Check if manual deposits are allowed for this account
 * INDIGO FEES account cannot receive manual deposits
 */
export function canReceiveManualDeposit(investorId: string): boolean {
  return !isIndigoFeesAccount(investorId);
}

/**
 * Check if manual withdrawals are allowed for this account
 * System accounts typically cannot process manual withdrawals
 */
export function canProcessManualWithdrawal(account: AccountIdentifiable): boolean {
  return !isSystemAccount(account);
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  INDIGO_FEES_ACCOUNT_ID,
  ACCOUNT_TYPES,
  isIndigoFeesAccount,
  isSystemAccount,
  isFeesAccount,
  isIBAccount,
  isRegularAccount,
  getAccountName,
  getShortAccountName,
  filterOutSystemAccounts,
  getSystemAccounts,
  partitionAccounts,
  canReceiveManualDeposit,
  canProcessManualWithdrawal,
};
