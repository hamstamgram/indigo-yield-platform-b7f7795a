/**
 * Investor Components - Re-export shim
 * Components have moved to src/features/investor/
 */

// Overview
export { HoldingsByToken } from "@/features/investor/overview/components/HoldingsByToken";

// Performance
export { PerformanceCard } from "@/features/investor/performance/components/PerformanceCard";
export {
  PeriodSelector,
  PERIOD_LABELS,
  type PerformancePeriod,
} from "@/features/investor/performance/components/PeriodSelector";

// Portfolio
export { default as MyPerformanceHistory } from "@/features/investor/portfolio/components/MyPerformanceHistory";

// Reports
export { PerformanceReportTable } from "@/features/investor/reports/components/PerformanceReportTable";
