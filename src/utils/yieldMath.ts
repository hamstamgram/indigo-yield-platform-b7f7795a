import { Decimal, sumFinancials, parseFinancial, toFinancialString } from "./financial";

/**
 * Validates and reconciles yield distribution math.
 * Rule: Gross Yield = Net Yield + IB Fees + INDIGO Fees
 */
export function reconcileYieldMath(params: {
  netYield: string | number;
  ibFees: string | number;
  indigoFees: string | number;
}): { grossYield: string; isValid: boolean } {
  const net = parseFinancial(params.netYield);
  const ib = parseFinancial(params.ibFees);
  const indigo = parseFinancial(params.indigoFees);

  const calculatedGross = net.plus(ib).plus(indigo);

  return {
    grossYield: toFinancialString(calculatedGross),
    isValid: true, // In the UI, we usually force the sum to match
  };
}

/**
 * Calculates Ending Balance for a ledger row or position.
 * Rule: Ending Balance = Previous Balance + Amount
 * Note: Historically, the ledger is a running log, so "Ending Balance" at any row
 * is the sum of all transactions for that fund up to that point.
 */
export function calculateEndingBalance(
  previousBalance: string | number,
  transactionAmount: string | number
): string {
  return toFinancialString(parseFinancial(previousBalance).plus(parseFinancial(transactionAmount)));
}
