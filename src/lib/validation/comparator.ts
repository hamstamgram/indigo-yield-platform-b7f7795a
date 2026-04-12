import { ExcelParser, AumSnapshot, YieldEvent } from './excelParser';
import { FundReplayer } from './fundReplayer';

export interface ValidationResult {
  fundName: string;
  currency: string;
  passed: boolean;
  discrepancies: Discrepancy[];
  snapshotValidations: SnapshotValidation[];
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

export interface SnapshotValidation {
  date: string;
  type: 'aum' | 'investor' | 'yield';
  investorName?: string;
  expectedValue: number;
  actualValue: number;
  difference: number;
  acceptable: boolean;
  comments: string[];
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
      snapshotValidations: [],
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

  /**
   * Validate AUM snapshots against engine state at each checkpoint
   */
  validateAumSnapshots(
    snapshots: AumSnapshot[],
    engineStates: Record<string, { totalAum: number; positions: Record<string, number> }>
  ): SnapshotValidation[] {
    const validations: SnapshotValidation[] = [];

    for (const snapshot of snapshots) {
      const engineState = engineStates[snapshot.date];
      
      if (!engineState) {
        validations.push({
          date: snapshot.date,
          type: 'aum',
          expectedValue: snapshot.aumBefore,
          actualValue: 0,
          difference: -snapshot.aumBefore,
          acceptable: false,
          comments: ['No engine state found for this date', ...snapshot.comments],
        });
        continue;
      }

      const totalAum = engineState.totalAum;
      const diff = totalAum - snapshot.aumBefore;
      const absoluteDiff = Math.abs(diff);
      const isAcceptable = absoluteDiff <= Comparator.DEFAULT_TOLERANCE;

      validations.push({
        date: snapshot.date,
        type: 'aum',
        expectedValue: snapshot.aumBefore,
        actualValue: totalAum,
        difference: diff,
        acceptable: isAcceptable,
        comments: snapshot.comments,
      });
    }

    return validations;
  }

  /**
   * Validate yield events against engine state
   */
  validateYieldEvents(
    yieldEvents: YieldEvent[],
    engineYieldDistributions: Array<{
      periodEnd: string;
      grossYield: number;
      purpose: string;
    }>
  ): SnapshotValidation[] {
    const validations: SnapshotValidation[] = [];

    for (const event of yieldEvents) {
      const matchingDist = engineYieldDistributions.find(
        d => d.periodEnd === event.date && d.purpose === event.purpose
      );

      if (!matchingDist) {
        validations.push({
          date: event.date,
          type: 'yield',
          expectedValue: event.grossYield,
          actualValue: 0,
          difference: -event.grossYield,
          acceptable: false,
          comments: [`Expected ${event.purpose} yield of ${event.grossYield}`],
        });
        continue;
      }

      const diff = matchingDist.grossYield - event.grossYield;
      const absoluteDiff = Math.abs(diff);
      const isAcceptable = absoluteDiff <= Comparator.DEFAULT_TOLERANCE;

      validations.push({
        date: event.date,
        type: 'yield',
        expectedValue: event.grossYield,
        actualValue: matchingDist.grossYield,
        difference: diff,
        acceptable: isAcceptable,
        comments: [`${event.purpose} yield`],
      });
    }

    return validations;
  }

  /**
   * Generate snapshot validation report
   */
  generateSnapshotReport(validations: SnapshotValidation[]): string {
    const lines: string[] = ['\n=== SNAPSHOT VALIDATION ==='];

    for (const v of validations) {
      const status = v.acceptable ? '✅' : '❌';
      lines.push(`${status} ${v.date} [${v.type}]`);
      
      if (v.investorName) {
        lines.push(`   Investor: ${v.investorName}`);
      }
      
      lines.push(`   Expected: ${v.expectedValue.toFixed(6)}`);
      lines.push(`   Actual:   ${v.actualValue.toFixed(6)}`);
      lines.push(`   Diff:     ${v.difference.toFixed(6)}`);
      
      if (v.comments.length > 0) {
        lines.push(`   Notes:    ${v.comments.join('; ')}`);
      }
    }

    const passedCount = validations.filter(v => v.acceptable).length;
    const totalCount = validations.length;
    lines.push(`\nSnapshot Summary: ${passedCount}/${totalCount} passed`);

    return lines.join('\n');
  }

  /**
   * Add snapshot validations to ValidationResult
   */
  addSnapshotValidations(
    result: ValidationResult,
    aumValidations: SnapshotValidation[],
    yieldValidations: SnapshotValidation[]
  ): ValidationResult {
    return {
      ...result,
      snapshotValidations: [...aumValidations, ...yieldValidations],
      passed: result.passed && 
              aumValidations.every(v => v.acceptable) &&
              yieldValidations.every(v => v.acceptable),
    };
  }
}
