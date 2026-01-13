/**
 * Report History Hook
 * React Query hook for fetching user generated reports
 */

import { useQuery } from "@tanstack/react-query";
import { ReportsApi } from "@/services/api/reportsApi";
import { ReportStatus, ReportType } from "@/types/domains";

export interface ReportHistoryFilters {
  status?: ReportStatus;
  reportType?: ReportType;
}

export function useReportHistory(filters?: ReportHistoryFilters) {
  return useQuery({
    queryKey: ["reports", "history", filters],
    queryFn: () => ReportsApi.getUserReports(filters || {}),
    staleTime: 30_000,
  });
}
