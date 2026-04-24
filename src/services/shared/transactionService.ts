/**
 * Transaction Service - Unified transaction operations
 *
 * CANONICAL SOURCE for transaction creation and user transaction queries
 * Uses types from @/types/domains/transaction
 */

import Decimal from "decimal.js";
import { supabase } from "@/integrations/supabase/client";
import { getTodayString } from "@/utils/dateUtils";
import type {
  Transaction as BaseTransaction,
  CreateTransactionUIParams,
} from "@/types/domains/transaction";
import { logError } from "@/lib/logger";
import { rpc } from "@/lib/rpc/index";
import { generateUUID } from "@/lib/utils";
import { parseFinancial } from "@/utils/financial";
// Note: CreateTransactionParams should be imported from @/types/domains/transaction
// (exported as CreateTransactionUIParams there)

// Map frontend transaction types to database tx_type enum values
const mapTypeForDb = (type: string): string => {
  const mapping: Record<string, string> = {
    FIRST_INVESTMENT: "DEPOSIT",
    DEPOSIT: "DEPOSIT",
    WITHDRAWAL: "WITHDRAWAL",
    ADJUSTMENT: "ADJUSTMENT",
  };
  const mapped = mapping[type];
  if (!mapped) {
    throw new Error(`Unsupported transaction type: ${type}`);
  }
  return mapped;
};

/**
 * Create a transaction (admin use)
 * Accepts CreateTransactionUIParams which allows FIRST_INVESTMENT (mapped to DEPOSIT internally)
 */
export async function createInvestorTransaction(
  params: CreateTransactionUIParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in to create transactions" };
    }

    // Map FIRST_INVESTMENT to DEPOSIT for DB enum compliance
    const dbType = mapTypeForDb(params.type);

    // ADJUSTMENT uses dedicated adjust_investor_position RPC (accepts signed amounts)
    if (dbType === "ADJUSTMENT") {
      const result = await rpc.call("adjust_investor_position", {
        p_fund_id: params.fund_id,
        p_investor_id: params.investor_id,
        p_amount: parseFinancial(String(params.amount)).toNumber(),
        p_tx_date: params.tx_date,
        p_reason: params.notes || "Manual adjustment",
        p_admin_id: user.id,
      });

      if (result.error) {
        logError("createTransaction.ADJUSTMENT", result.error, { fundId: params.fund_id });
        const errMsg =
          result.error.message || result.error.userMessage || JSON.stringify(result.error);
        throw new Error(errMsg);
      }

      if (!result.data || typeof result.data !== 'object' || result.data === null) {
        throw new Error("Invalid RPC response");
      }
      const response = result.data;
      if (!('success' in response) || response.success !== true) {
        const errorMsg = 'error' in response ? String(response.error) : "Failed to create adjustment";
        throw new Error(errorMsg);
      }

      return { success: true };
    }

    // For DEPOSIT/WITHDRAWAL, use pure transaction RPC.
    if (dbType === "DEPOSIT" || dbType === "WITHDRAWAL") {
      // Generate unique trigger reference client-side (idempotency key)
      const triggerReferenceRaw =
        params.reference_id ||
        `manual:${params.fund_id}:${params.investor_id}:${params.tx_date}:${generateUUID()}`;
      const triggerReference = triggerReferenceRaw.replace(/^(DEP:|WDR:)/, "");

      const result = await rpc.call("apply_transaction_with_crystallization", {
        p_fund_id: params.fund_id,
        p_investor_id: params.investor_id,
        p_tx_type: dbType,
        p_amount: parseFinancial(String(params.amount)).toNumber(),
        p_tx_date: params.tx_date,
        p_reference_id: triggerReference,
        p_admin_id: user.id,
        p_notes: params.notes || `${dbType} - ${triggerReference}`,
        p_purpose: "transaction",
      });

      if (result.error) {
        logError(`createTransaction.${dbType}`, result.error, {
          fundId: params.fund_id,
        });
        // Surface the user-friendly error message from gateway
        const errMsg =
          result.error.message || result.error.userMessage || JSON.stringify(result.error);
        throw new Error(errMsg);
      }

      if (!result.data || typeof result.data !== 'object' || result.data === null) {
        throw new Error("Invalid RPC response");
      }
      const response = result.data;
      if (!('success' in response) || response.success !== true) {
        const errorMsg =
          'error' in response ? String(response.error) :
          'error_code' in response ? `RPC error: ${String(response.error_code)}` :
          "Failed to create transaction";
        throw new Error(errorMsg);
      }

      return { success: true };
    }

    // Unsupported transaction type — fail explicitly
    return { success: false, error: `Unsupported transaction type: ${dbType}` };
  } catch (error) {
    logError("createInvestorTransaction", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create transaction",
    };
  }
}

/**
 * Quick transaction creation (simplified params for common use cases)
 * Accepts camelCase params for convenience
 */
export interface QuickTransactionParams {
  investorId: string;
  fundId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  description?: string;
  eventTs?: string;
}

export async function createQuickTransaction(params: QuickTransactionParams): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = getTodayString();

  // Generate unique trigger reference to prevent duplicates
  const triggerReference = `manual:${params.fundId}:${params.investorId}:${today}:${generateUUID()}`;

  const result = await rpc.call("apply_transaction_with_crystallization", {
    p_fund_id: params.fundId,
    p_investor_id: params.investorId,
    p_tx_type: params.type,
    p_amount: new Decimal(String(params.amount)).toNumber(),
    p_tx_date: today,
    p_reference_id: triggerReference,
    p_admin_id: user.id,
    p_notes: params.description || `${params.type} - ${triggerReference}`,
    p_purpose: "transaction",
  });

  if (result.error) {
    throw new Error(result.error.message || result.error.userMessage);
  }

  if (!result.data || typeof result.data !== 'object' || result.data === null) {
    throw new Error("Invalid RPC response");
  }
  const response = result.data;
  if (!('success' in response) || response.success !== true) {
    throw new Error(`Failed to create ${params.type}`);
  }
}

export const transactionService = {
  createInvestorTransaction,
  createQuickTransaction,
};
