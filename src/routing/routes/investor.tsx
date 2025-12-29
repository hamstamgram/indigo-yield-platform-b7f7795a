/**
 * Investor Routes Module
 * All investor-protected routes organized by feature area
 */

import {
  CoreInvestorRoutes,
  PortfolioRoutes,
  ReportsRoutes,
} from "./investor/index";
import { IBUserRoutes } from "./ib";

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
      {IBUserRoutes()}
    </>
  );
}
