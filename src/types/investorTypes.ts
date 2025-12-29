/**
 * Investor Types - Re-export from canonical source
 * @deprecated Import from "@/types/domains" instead
 */

// Re-export Asset for backward compatibility
export { type AssetRef as Asset } from "./asset";

// Re-export investor types from canonical source
export {
  type Investor,
  type InvestorWithProfile,
  type InvestorProfile,
  type InvestorPosition,
  type InvestorSummary,
  type InvestorStatus,
  type InvestorRef,
  mapDbProfileToInvestor,
  mapDbInvestorToInvestor,
  mapDbPositionToInvestorPosition,
  isInvestorWithProfile,
  getInvestorDisplayName,
  toInvestorRef,
} from "./domains/investor";
