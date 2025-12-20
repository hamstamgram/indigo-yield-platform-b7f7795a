/**
 * Admin Routes Module
 * All admin-protected routes organized by functional area
 *
 * Module Structure:
 * - Core: Dashboard, transactions (3 routes)
 * - Investors: Investor management and profiles (6 routes)
 * - Deposits: Deposit management (1 route)
 * - Withdrawals: Withdrawal requests (2 routes)
 * - Operations: Data entry, rates, reports, email tracking (6 routes)
 * - Reports: Historical reports (1 route)
 * - System: Settings, audit, users, health (5 routes)
 * - Transactions: Manual transaction entry (1 route)
 * - Fees: Fee management (1 route)
 * - IB: Introducing Broker management (1 route)
 *
 * Total: ~27 admin routes
 */

import { CoreAdminRoutes } from "./admin/core";
import { InvestorRoutes } from "./admin/investors";
import { DepositRoutes } from "./admin/deposits";
import { WithdrawalRoutes } from "./admin/withdrawals";
import { OperationsRoutes } from "./admin/operations";
import { ReportsRoutes } from "./admin/reports";
import { SystemRoutes } from "./admin/system";
import { TransactionRoutes } from "./admin/transactions";
import { FeesRoutes } from "./admin/fees";
import { IBRoutes } from "./admin/ib";

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
      {WithdrawalRoutes()}
      {OperationsRoutes()}
      {ReportsRoutes()}
      {SystemRoutes()}
      {TransactionRoutes()}
      {FeesRoutes()}
      {IBRoutes()}
    </>
  );
}
