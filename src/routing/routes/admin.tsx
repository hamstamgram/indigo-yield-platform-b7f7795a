/**
 * Admin Routes Module
 * All admin-protected routes organized by functional area
 */

import {
  CoreAdminRoutes,
  InvestorRoutes,
  DepositRoutes,
  WithdrawalRoutes,
  ReportsRoutes,
  SystemRoutes,
  TransactionRoutes,
  IBRoutes,
  FeesRoutes,
  LedgerRoutes,
  RevenueRoutes,
  YieldsRoutes,
} from "./admin/index";

/**
 * Admin Routes Component
 * Orchestrates all admin-protected route modules
 */
export function AdminRoutes() {
  return (
    <>
      {CoreAdminRoutes()}
      {InvestorRoutes()}
      {DepositRoutes()}
      {LedgerRoutes()}
      {RevenueRoutes()}
      {YieldsRoutes()}
      {ReportsRoutes()}
      {SystemRoutes()}
      {/* Legacy route modules (empty, redirects handled by consolidated routes) */}
      {WithdrawalRoutes()}
      {TransactionRoutes()}
      {IBRoutes()}
      {FeesRoutes()}
    </>
  );
}
