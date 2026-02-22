/**
 * Reconciliation Service
 * Service layer for database reconciliation functions
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";

/**
 * Result from reconcile_fund_period RPC (matches actual DB return type)
 */
export interface FundPeriodReconciliationResult {
  metric: string;
  expected: number;
  actual: number;
  difference: number;
  status: string;
}

/**
 * Result from reconcile_investor_position RPC
 */
export interface InvestorPositionReconciliationResult {
  success: boolean;
  investor_id: string;
  fund_id: string;
  action_taken: string;
  old_value: number | null;
  new_value: number | null;
  difference: number | null;
  message: string;
}

/**
 * Result from get_void_yield_impact RPC
 */
export interface VoidYieldImpactResult {
  distribution_id: string;
  fund_id: string;
  gross_yield_amount: number;
  period_start: string;
  period_end: string;
  affected_investors: number;
  total_investor_yield: number;
  total_fees: number;
  total_ib_commissions: number;
  transaction_count: number;
  investors: Array<{
    investor_id: string;
    investor_name: string;
    yield_amount: number;
    fee_amount: number;
  }>;
}

/**
 * Reconcile a fund's metrics for a specific period
 * NOTE: reconcile_fund_period RPC was dropped
 */
export async function reconcileFundPeriod(
  _fundId: string,
  _startDate: string,
  _endDate: string
): Promise<FundPeriodReconciliationResult[]> {
  throw new Error("reconcile_fund_period RPC has been removed");
}

/**
 * Reconcile an investor's position in a fund
 * NOTE: reconcile_investor_position RPC was dropped
 */
export async function reconcileInvestorPosition(
  _investorId: string,
  _fundId: string,
  _adminId: string,
  _action: "check" | "recalculate" | "log" = "check"
): Promise<InvestorPositionReconciliationResult> {
  throw new Error("reconcile_investor_position RPC has been removed");
}

/**
 * Get the impact of voiding a yield distribution
 * Shows affected investors, amounts, fees, etc.
 */
export async function getVoidYieldImpact(distributionId: string): Promise<VoidYieldImpactResult> {
  const { data, error } = await rpc.call("get_void_yield_impact", {
    p_distribution_id: distributionId,
  });

  if (error) throw error;
  return data as unknown as VoidYieldImpactResult;
}

/**
 * Force delete an investor and all related data
 * Only callable by super admins
 */
export async function forceDeleteInvestor(investorId: string, adminId: string): Promise<boolean> {
  const { data, error } = await rpc.call("force_delete_investor", {
    p_investor_id: investorId,
    p_admin_id: adminId,
  });

  if (error) throw error;
  return data as boolean;
}

/**
 * Test all reconciliation functions and return results
 */
export interface FunctionTestResult {
  functionName: string;
  success: boolean;
  executionTime: number;
  result?: unknown;
  error?: string;
}

export async function testAllFunctions(params: {
  fundId: string;
  investorId: string;
  distributionId: string;
  adminId: string;
  startDate: string;
  endDate: string;
}): Promise<FunctionTestResult[]> {
  const results: FunctionTestResult[] = [];

  // Test 1: reconcile_fund_period
  const startTime1 = performance.now();
  try {
    const result = await reconcileFundPeriod(params.fundId, params.startDate, params.endDate);
    results.push({
      functionName: "reconcile_fund_period",
      success: true,
      executionTime: performance.now() - startTime1,
      result,
    });
  } catch (error) {
    results.push({
      functionName: "reconcile_fund_period",
      success: false,
      executionTime: performance.now() - startTime1,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: reconcile_investor_position
  const startTime2 = performance.now();
  try {
    const result = await reconcileInvestorPosition(
      params.investorId,
      params.fundId,
      params.adminId,
      "check"
    );
    results.push({
      functionName: "reconcile_investor_position",
      success: true,
      executionTime: performance.now() - startTime2,
      result,
    });
  } catch (error) {
    results.push({
      functionName: "reconcile_investor_position",
      success: false,
      executionTime: performance.now() - startTime2,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: get_void_yield_impact
  const startTime3 = performance.now();
  try {
    const result = await getVoidYieldImpact(params.distributionId);
    results.push({
      functionName: "get_void_yield_impact",
      success: true,
      executionTime: performance.now() - startTime3,
      result,
    });
  } catch (error) {
    results.push({
      functionName: "get_void_yield_impact",
      success: false,
      executionTime: performance.now() - startTime3,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}
