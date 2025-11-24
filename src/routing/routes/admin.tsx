/**
 * Admin Routes Module
 * All admin-protected routes organized by functional area
 *
 * Module Structure:
 * - Core: Main dashboard and portfolio overview (3 routes)
 * - Investors: Investor management and tracking (14 routes)
 * - Operations: Day-to-day operations and data entry (18 routes)
 * - Reports: Reporting and analytics (5 routes)
 * - System: Settings, audit, users, compliance (9 routes)
 *
 * Total: 49 admin routes
 */

import { CoreAdminRoutes } from "./admin/core";
import { InvestorRoutes } from "./admin/investors";
import { InvestmentRoutes } from "./admin/investments";
import { DepositRoutes } from "./admin/deposits";
import { WithdrawalRoutes } from "./admin/withdrawals";
import { OperationsRoutes } from "./admin/operations";
import { ReportsRoutes } from "./admin/reports";
import { SystemRoutes } from "./admin/system";
import { TransactionRoutes } from "./admin/transactions";

/**
 * Admin Routes Component
 * Orchestrates all admin-protected route modules
 */
export function AdminRoutes() {
  return (
    <>
      {CoreAdminRoutes()}
      {InvestorRoutes()}
      {InvestmentRoutes()}
      {DepositRoutes()}
      {WithdrawalRoutes()}
      {OperationsRoutes()}
      {ReportsRoutes()}
      {SystemRoutes()}
      {TransactionRoutes()}
    </>
  );
}
