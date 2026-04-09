/**
 * Shared Feature Services
 * Cross-domain services used by both admin and investor portals.
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
  getInvestorFeeHistory,
  addFeeEntry,
  updateFeeRateForAllFunds,
  deleteFeeEntry,
  getFeeScheduleWithFunds,
  upsertGlobalFee,
  getGlobalFee,
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
