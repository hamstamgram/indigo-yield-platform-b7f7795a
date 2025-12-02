/**
 * Investor Routes Module
 * All investor-protected routes organized by feature area
 *
 * Module Structure:
 * - Core: Dashboard, statements, transactions, account (6 routes)
 * - Portfolio: Withdrawals, analytics, settings (13 routes)
 * - Notifications: Alerts and notification management (5 routes)
 * - Documents: Document vault and viewing (8 routes)
 * - Profile: User profile and preferences (8 routes)
 * - Reports: Performance and custom reports (5 routes)
 *
 * Total: 45 investor routes
 */

import { CoreInvestorRoutes } from "./investor/core";
import { PortfolioRoutes } from "./investor/portfolio";
import { DocumentRoutes } from "./investor/documents";
import { ReportsRoutes } from "./investor/reports";

/**
 * Investor Routes Component
 * Orchestrates all investor-protected route modules
 */
export function InvestorRoutes() {
  return (
    <>
      {CoreInvestorRoutes()}
      {PortfolioRoutes()}
      {DocumentRoutes()}
      {ReportsRoutes()}
    </>
  );
}
