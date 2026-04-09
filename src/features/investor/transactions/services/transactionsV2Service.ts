/**
 * Re-export from canonical shared location.
 * This service is used by both admin and investor features.
 */
export {
  transactionsV2Service,
  type TransactionRecord,
  type TransactionFilters,
} from "@/features/shared/services/transactionsV2Service";
