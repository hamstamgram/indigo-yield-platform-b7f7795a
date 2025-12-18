/**
 * Investor Routes Module
 * All investor-protected routes organized by feature area
 */

import { CoreInvestorRoutes } from "./investor/core";
import { PortfolioRoutes } from "./investor/portfolio";
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
      {ReportsRoutes()}
    </>
  );
}
