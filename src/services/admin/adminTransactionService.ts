/**
 * Admin Transaction Service
 * 
 * @deprecated Use createQuickTransaction from @/services/shared/transactionService instead.
 * This file is kept for backwards compatibility only.
 */

import { 
  createQuickTransaction, 
  type QuickTransactionParams 
} from "@/services/shared/transactionService";

/**
 * @deprecated Use QuickTransactionParams from @/services/shared/transactionService
 */
export type CreateTransactionParams = QuickTransactionParams;

/**
 * @deprecated Use transactionService from @/services/shared/transactionService
 */
export const adminTransactionService = {
  async createTransaction(params: CreateTransactionParams) {
    await createQuickTransaction(params);
    return { success: true };
  },
};
