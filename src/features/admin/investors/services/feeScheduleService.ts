/**
 * Re-export from canonical shared location.
 * This service is used by both admin and investor features.
 */
export {
  getInvestorFeeSchedule,
  getInvestorFeeHistory,
  addFeeEntry,
  updateFeeRateForAllFunds,
  deleteFeeEntry,
  getFeeScheduleWithFunds,
  upsertGlobalFee,
  getGlobalFee,
  feeScheduleService,
  type FeeScheduleRow,
  type FeeHistoryRow,
} from "@/features/shared/services/feeScheduleService";
