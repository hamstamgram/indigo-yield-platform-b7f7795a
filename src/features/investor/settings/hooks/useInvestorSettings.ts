/** Re-export from canonical shared location */
export {
  useInvestorProfileSettings,
  useDeleteInvestorProfile,
  useUpdatePerformanceFee,
  useInvestorReportPeriods,
} from "@/features/shared/hooks/useInvestorSettings";
export type { InvestorProfileData, ReportPeriod } from "@/features/shared/hooks/useInvestorSettings";
