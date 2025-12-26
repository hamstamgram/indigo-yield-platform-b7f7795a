import { useQuery } from "@tanstack/react-query";
import { getAllFunds, type Fund } from "@/services/investor/fundViewService";
import { QUERY_KEYS } from "@/constants/queryKeys";

/**
 * Hook to fetch active funds for dropdowns and selectors
 * Returns only funds with status='active'
 */
export function useActiveFunds() {
  return useQuery<Fund[], Error>({
    queryKey: QUERY_KEYS.activeFunds,
    queryFn: getAllFunds,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Format fund for display in dropdowns
 * Returns: "{fund_code} - {asset}" or "{fund_name} ({asset})"
 */
export function formatFundLabel(fund: Fund): string {
  return `${fund.code} - ${fund.asset}`;
}

/**
 * Format fund with full name for display
 */
export function formatFundLabelFull(fund: Fund): string {
  return `${fund.name} (${fund.asset})`;
}
