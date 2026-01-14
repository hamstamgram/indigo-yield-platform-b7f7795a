/**
 * Admin Transaction Components
 * Transaction management dialogs
 */

/**
 * @deprecated Use VoidAndReissueDialog instead for finance-grade ledger immutability.
 * EditTransactionDialog breaks the immutable ledger principle and should not be used
 * for production transactions. Kept for backwards compatibility during transition.
 */
export { EditTransactionDialog } from "./EditTransactionDialog";

export { VoidTransactionDialog } from "./VoidTransactionDialog";

/**
 * Preferred component for correcting transactions.
 * Atomically voids the original and creates a corrected transaction.
 */
export { VoidAndReissueDialog } from "./VoidAndReissueDialog";
