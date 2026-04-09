/**
 * Re-export from canonical shared location.
 * This service is used by both admin and investor features.
 */
export {
  getInvestorFeeSchedule,
  getFeeHistory,
  addFeeScheduleEntry,
  updateFeeScheduleEntry,
  deleteFeeScheduleEntry,
  feeScheduleService,
  type FeeScheduleRow,
  type FeeHistoryRow,
} from "@/features/shared/services/feeScheduleService";
