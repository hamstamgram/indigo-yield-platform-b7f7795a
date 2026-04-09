/** Re-export from canonical shared location */
export {
  useInvestorList,
  useInvestorsForSelector,
  useInvestorQuickView,
  useInvestorRecentActivity,
  useUpdateInvestorStatus,
  type InvestorListItem,
  type InvestorQuickViewData,
  type InvestorPosition,
  type InvestorSelectorItem,
} from "@/features/shared/hooks/useInvestorData";
export type { InvestorPositionRow } from "@/features/shared/hooks/useInvestorData";
