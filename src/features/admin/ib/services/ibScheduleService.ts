/**
 * Re-export from canonical shared location.
 * This service is used by both admin and investor features.
 */
export {
  getIBScheduleWithFunds,
  addIBEntry,
  deleteIBEntry,
  ibScheduleService,
  type IBScheduleEntry,
} from "@/features/shared/services/ibScheduleService";
