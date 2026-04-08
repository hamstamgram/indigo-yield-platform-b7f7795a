/**
 * Transaction-Yield Allocation System
 *
 * Domain: Fund accounting with investor deposits, yield recording, and allocation
 * Core flow: Transaction → AUM Record → Yield Calculation → Allocation → Fund State
 */

import { Decimal } from 'decimal.js';

/**
 * Fee structure template set by first transaction with fees.
 * Applied to ALL yield allocations for the fund going forward.
 */
export interface FeeTemplate {
  /** Intro Broker percentage (e.g., 0.04 for 4%) */
  ibPercent: Decimal;
  /** INDIGO management fee percentage (e.g., 0.16 for 16%) */
  feesPercent: Decimal;
  /** Investor share percentage (e.g., 0.80 for 80%) */
  investorPercent: Decimal;
}

/**
 * Single investor deposit transaction
 */
export interface Transaction {
  id: string;
  /** Investor name */
  investorName: string;
  /** Amount deposited in native token */
  amount: Decimal;
  /** Deposit date */
  date: Date;
  /** Intro Broker name (optional) */
  ibName?: string;
  /** Intro Broker allocation percentage (optional, e.g., 0.04) */
  ibPercent?: Decimal;
  /** INDIGO fees percentage (optional, e.g., 0.16) */
  feesPercent?: Decimal;
}

/**
 * Month-end AUM snapshot and yield record
 */
export interface YieldRecord {
  /** Reporting date (typically month-end) */
  date: Date;
  /** Total fund AUM at this date */
  aumTotal: Decimal;
  /** All transactions included in this AUM */
  transactionsUntilDate: Transaction[];
  /** Fee template to apply (set from first transaction with fees) */
  feeTemplate: FeeTemplate;
}

/**
 * Calculated yield result
 */
export interface YieldCalculation {
  /** Reporting date */
  date: Date;
  /** Total AUM */
  aumTotal: Decimal;
  /** Sum of all transaction inputs */
  priorBaseline: Decimal;
  /** Calculated yield: AUM - baseline */
  yieldAmount: Decimal;
  /** Allocations per entity (investor, IB, INDIGO) */
  allocations: YieldAllocation[];
}

/**
 * Single yield allocation to one entity
 */
export interface YieldAllocation {
  /** Entity name (investor, IB name, or "INDIGO Fees") */
  entityName: string;
  /** Entity type */
  type: 'investor' | 'ib' | 'indigo-fees';
  /** Amount allocated to this entity */
  allocationAmount: Decimal;
  /** Percentage of yield (IB%, Fees%, or Investor%) */
  allocationPercent: Decimal;
}

/**
 * Fund balance state at a point in time
 */
export interface FundState {
  /** Reporting date */
  date: Date;
  /** Total AUM (must reconcile) */
  aumTotal: Decimal;
  /** Cumulative balance per entity */
  balances: Map<string, Decimal>;
  /** Breakdown: investor balances, IB balances, fees balance */
  breakdown: {
    investorBalances: Map<string, Decimal>;
    ibBalances: Map<string, Decimal>;
    indigoFeesBalance: Decimal;
  };
}

/**
 * Complete fund lifecycle record
 */
export interface FundRecord {
  /** Fund identifier */
  fundId: string;
  /** Asset symbol (e.g., "XRP", "SOL", "USDT") */
  asset: string;
  /** Fund name */
  fundName: string;
  /** All transactions ever made to fund */
  transactions: Transaction[];
  /** All yield records (month-end snapshots) */
  yieldRecords: YieldRecord[];
  /** Current fund state */
  currentState: FundState;
  /** Fee template (immutable once set) */
  feeTemplate: FeeTemplate;
}

/**
 * Validation result for fund operations
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  reconciliation?: {
    /** Sum of all balances */
    balancesSum: Decimal;
    /** Reported AUM */
    reportedAum: Decimal;
    /** Difference (should be 0) */
    difference: Decimal;
  };
}

/**
 * Calculate yield and allocations for a month-end record
 */
export function calculateYield(record: YieldRecord): YieldCalculation {
  const baseline = record.transactionsUntilDate.reduce(
    (sum, tx) => sum.plus(tx.amount),
    new Decimal(0)
  );

  const yieldAmount = record.aumTotal.minus(baseline);

  const allocations: YieldAllocation[] = [];

  // IB allocation
  if (record.feeTemplate.ibPercent.greaterThan(0)) {
    const entities = new Set(
      record.transactionsUntilDate
        .filter(tx => tx.ibName)
        .map(tx => tx.ibName!)
    );

    for (const ibName of entities) {
      allocations.push({
        entityName: ibName,
        type: 'ib',
        allocationAmount: yieldAmount.times(record.feeTemplate.ibPercent),
        allocationPercent: record.feeTemplate.ibPercent,
      });
    }
  }

  // INDIGO fees allocation
  if (record.feeTemplate.feesPercent.greaterThan(0)) {
    allocations.push({
      entityName: 'INDIGO Fees',
      type: 'indigo-fees',
      allocationAmount: yieldAmount.times(record.feeTemplate.feesPercent),
      allocationPercent: record.feeTemplate.feesPercent,
    });
  }

  // Investor allocation (only to transactions that contributed)
  const investorNames = new Set(record.transactionsUntilDate.map(tx => tx.investorName));
  for (const investorName of investorNames) {
    allocations.push({
      entityName: investorName,
      type: 'investor',
      allocationAmount: yieldAmount.times(record.feeTemplate.investorPercent),
      allocationPercent: record.feeTemplate.investorPercent,
    });
  }

  return {
    date: record.date,
    aumTotal: record.aumTotal,
    priorBaseline: baseline,
    yieldAmount,
    allocations,
  };
}

/**
 * Update fund state with new yield allocation
 */
export function applyYieldAllocation(
  state: FundState,
  calculation: YieldCalculation
): FundState {
  const newBalances = new Map(state.balances);
  const newInvestorBalances = new Map(state.breakdown.investorBalances);
  const newIbBalances = new Map(state.breakdown.ibBalances);
  let newIndigoBalance = state.breakdown.indigoFeesBalance;

  for (const alloc of calculation.allocations) {
    const prior = newBalances.get(alloc.entityName) || new Decimal(0);
    newBalances.set(alloc.entityName, prior.plus(alloc.allocationAmount));

    if (alloc.type === 'investor') {
      const prior = newInvestorBalances.get(alloc.entityName) || new Decimal(0);
      newInvestorBalances.set(alloc.entityName, prior.plus(alloc.allocationAmount));
    } else if (alloc.type === 'ib') {
      const prior = newIbBalances.get(alloc.entityName) || new Decimal(0);
      newIbBalances.set(alloc.entityName, prior.plus(alloc.allocationAmount));
    } else if (alloc.type === 'indigo-fees') {
      newIndigoBalance = newIndigoBalance.plus(alloc.allocationAmount);
    }
  }

  return {
    date: calculation.date,
    aumTotal: calculation.aumTotal,
    balances: newBalances,
    breakdown: {
      investorBalances: newInvestorBalances,
      ibBalances: newIbBalances,
      indigoFeesBalance: newIndigoBalance,
    },
  };
}

/**
 * Validate fund state for consistency
 */
export function validateFundState(state: FundState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check balance reconciliation
  let balancesSum = new Decimal(0);
  for (const balance of state.balances.values()) {
    balancesSum = balancesSum.plus(balance);
  }

  const difference = state.aumTotal.minus(balancesSum);
  const isReconciled = difference.abs().lessThan(new Decimal('0.0001')); // Allow rounding

  if (!isReconciled) {
    errors.push(
      `Fund state reconciliation failed: AUM ${state.aumTotal} != Balances sum ${balancesSum} (diff: ${difference})`
    );
  }

  // Check breakdown consistency
  let breakdownSum = new Decimal(0);
  for (const balance of state.breakdown.investorBalances.values()) {
    breakdownSum = breakdownSum.plus(balance);
  }
  for (const balance of state.breakdown.ibBalances.values()) {
    breakdownSum = breakdownSum.plus(balance);
  }
  breakdownSum = breakdownSum.plus(state.breakdown.indigoFeesBalance);

  const breakdownDiff = state.aumTotal.minus(breakdownSum);
  if (breakdownDiff.abs().greaterThan(new Decimal('0.0001'))) {
    errors.push(
      `Breakdown reconciliation failed: ${breakdownSum} vs ${state.aumTotal}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    reconciliation: {
      balancesSum,
      reportedAum: state.aumTotal,
      difference,
    },
  };
}
