/**
 * Shared Feature Services
 * Cross-domain services used by both admin and investor portals.
 * Import from here (or from the specific file) to avoid feature boundary violations.
 */

export { withdrawalService } from "./withdrawalService";
export {
  transactionsV2Service,
  type TransactionRecord,
  type TransactionFilters,
} from "./transactionsV2Service";
export {
  feeScheduleService,
  getInvestorFeeSchedule,
  getFeeHistory,
  addFeeScheduleEntry,
  updateFeeScheduleEntry,
  deleteFeeScheduleEntry,
  type FeeScheduleRow,
  type FeeHistoryRow,
} from "./feeScheduleService";
export {
  ibScheduleService,
  getIBScheduleWithFunds,
  addIBEntry,
  deleteIBEntry,
  type IBScheduleEntry,
} from "./ibScheduleService";
