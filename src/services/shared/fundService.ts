/**
 * Fund Service - Re-exports from admin fundService
 * @deprecated Import directly from @/services/admin/fundService instead
 * This file is kept for backwards compatibility during migration
 */

import * as adminFundService from "@/services/admin/fundService";

// Re-export all admin fund service functions for backwards compatibility
export const {
  listFunds,
  getFund,
  createFund,
  createFundSimple,
  updateFund,
  getFundKPIs,
  getLatestNav,
  getFundPerformance,
  checkFundUsage,
  getActiveFunds,
  getFundsByIds,
  getFundByAsset,
  codeExists,
  deactivateFund,
  updateFundStatus,
} = adminFundService;

// Re-export the CreateFundInput type
export type { CreateFundInput } from "@/services/admin/fundService";

// Alias exports for different naming conventions
export const getAllFunds = adminFundService.listFunds;
export const getFundById = adminFundService.getFund;

// Create a class-based wrapper for consumers using the class instance pattern
class FundService {
  getAllFunds = adminFundService.listFunds;
  getFundById = adminFundService.getFund;
  updateFund = adminFundService.updateFund;
  updateFundStatus = adminFundService.updateFundStatus;
  getFundKPIs = adminFundService.getFundKPIs;
  getLatestNav = adminFundService.getLatestNav;
  getFundPerformance = adminFundService.getFundPerformance;
  getActiveFunds = adminFundService.getActiveFunds;
  getFundsByIds = adminFundService.getFundsByIds;
  getFundByAsset = adminFundService.getFundByAsset;
  codeExists = adminFundService.codeExists;
  createFund = adminFundService.createFundSimple;
  deactivateFund = adminFundService.deactivateFund;
}

export const fundService = new FundService();
