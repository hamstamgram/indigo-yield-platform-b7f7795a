import { ExcelParser } from './excelParser';
import { FundReplayer } from './fundReplayer';

export interface ValidationResult {
  fundName: string;
  currency: string;
  passed: boolean;
  discrepancies: Discrepancy[];
  engineState: any;
  excelExpectations: any;
}

export interface Discrepancy {
  type: 'position' | 'transaction' | 'yield' | 'fee' | 'ib';
  investorName: string;
  field: string;
  excelValue: number;
  engineValue: number;
  difference: number;
  relativeDifference: number;
  acceptable: boolean;
}

/**
 * Compares engine state with Excel expectations
 */
export class Comparator {
  private static readonly DEFAULT_TOLERANCE = 0.000001; // 1e-6 for crypto precision
  private static readonly RELATIVE_TOLERANCE = 0.00001; // 0.001% for larger values

  /**
   * Compare fund replay results with Excel expectations
   */
  async compareFundResults(
    fundData: any, 
    engineState: any, 
    excelExpectations: any
  ): Promise<ValidationResult> {
    const discrepancies: Discrepancy[] = [];

    if (engineState.positions && excelExpectations) {
      for (const [investorName, enginePos] of Object.entries(engineState.positions)) {
        const pos = enginePos as { currentValue?: number; costBasis?: number };
        const excelPos = excelExpectations[investorName] as { value?: number; costBasis?: number };
        
        if (!excelPos) {
          discrepancies.push({
            type: 'position',
            investorName,
            field: 'existence',
            excelValue: 0,
            engineValue: 1,
            difference: 1,
            relativeDifference: 1,
            acceptable: false
          });
          continue;
        }

        const valueDiff = this.compareValues(
          pos.currentValue || 0, 
          excelPos.value || 0, 
          'position.currentValue',
          investorName
        );
        if (valueDiff) discrepancies.push(valueDiff);

        const basisDiff = this.compareValues(
          pos.costBasis || 0, 
          excelPos.costBasis || 0, 
          'position.costBasis',
          investorName
        );
        if (basisDiff) discrepancies.push(basisDiff);
      }

      for (const [investorName] of Object.entries(excelExpectations)) {
        if (!engineState.positions[investorName]) {
          discrepancies.push({
            type: 'position',
            investorName,
            field: 'existence',
            excelValue: 1,
            engineValue: 0,
            difference: -1,
            relativeDifference: 1,
            acceptable: false
          });
        }
      }
    }

    const passed = discrepancies.length === 0 || 
                  discrepancies.every(d => d.acceptable);

    return {
      fundName: fundData.fundName,
      currency: fundData.currency,
      passed,
      discrepancies,
      engineState,
      excelExpectations,
    };
  }

  /**
   * Compare two numeric values with tolerance
   */
  private compareValues(
    engineVal: number, 
    excelVal: number, 
    field: string,
    investorName: string
  ): Discrepancy | null {
    if (engineVal === null && excelVal === null) return null;
    if (engineVal === null) engineVal = 0;
    if (excelVal === null) excelVal = 0;

    const difference = engineVal - excelVal;
    const relativeDifference = excelVal !== 0 
      ? Math.abs(difference / excelVal) 
      : (engineVal !== 0 ? Math.abs(difference) : 0);

    const absoluteDiff = Math.abs(difference);
    const isAcceptable = 
      absoluteDiff <= Comparator.DEFAULT_TOLERANCE ||
      relativeDifference <= Comparator.RELATIVE_TOLERANCE;

    if (isAcceptable) return null;

    return {
      type: 'position' as const,
      investorName,
      field,
      excelValue: excelVal,
      engineValue: engineVal,
      difference,
      relativeDifference,
      acceptable: false
    };
  }

  /**
   * Generate a human-readable report of discrepancies
   */
  generateDiscrepancyReport(result: ValidationResult): string {
    if (result.passed) {
      return `✅ ${result.fundName} (${result.currency}): PASSED - No discrepancies found`;
    }

    let report = `❌ ${result.fundName} (${result.currency}): FAILED - ${result.discrepancies.length} discrepancy(ies) found:\n`;
    
    for (const d of result.discrepancies) {
      report += `  • ${d.investorName}.${d.field}: `;
      report += `Excel=${d.excelValue}, Engine=${d.engineValue}, `;
      report += `Diff=${d.difference.toFixed(6)} (${(d.relativeDifference*100).toFixed(4)}%)`;
      report += ` ${d.acceptable ? '(within tolerance)' : '(OUTSIDE TOLERANCE)'}\n`;
    }

    return report;
  }
}
