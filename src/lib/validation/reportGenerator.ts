import { ValidationResult, SnapshotValidation } from './comparator';

/**
 * Generates validation reports in various formats
 */
export class ReportGenerator {
  /**
   * Generate a JSON report
   */
  generateJSONReport(results: ValidationResult[]): string {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFunds: results.length,
        passedFunds: results.filter(r => r.passed).length,
        failedFunds: results.filter(r => !r.passed).length,
      },
      funds: results.map(result => ({
        fundName: result.fundName,
        currency: result.currency,
        passed: result.passed,
        discrepancyCount: result.discrepancies.length,
        snapshotCount: result.snapshotValidations?.length || 0,
        discrepancies: result.discrepancies.map(d => ({
          type: d.type,
          investorName: d.investorName,
          field: d.field,
          excelValue: d.excelValue,
          engineValue: d.engineValue,
          difference: d.difference,
          relativeDifference: d.relativeDifference,
          acceptable: d.acceptable,
        })),
        snapshotValidations: (result.snapshotValidations || []).map(s => ({
          date: s.date,
          type: s.type,
          investorName: s.investorName,
          expectedValue: s.expectedValue,
          actualValue: s.actualValue,
          difference: s.difference,
          acceptable: s.acceptable,
          comments: s.comments,
        })),
      })),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate a human-readable text report
   */
  generateTextReport(results: ValidationResult[]): string {
    let report = `INDIGO YIELD PLATFORM - FUND LIFECYCLE VALIDATION REPORT\n`;
    report += `====================================================\n`;
    report += `Timestamp: ${new Date().toISOString()}\n`;
    report += `Total Funds Validated: ${results.length}\n`;
    report += `Passed: ${results.filter(r => r.passed).length}\n`;
    report += `Failed: ${results.filter(r => !r.passed).length}\n\n`;

    for (const result of results) {
      report += `Fund: ${result.fundName} (${result.currency})\n`;
      report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      
      // Snapshot validations
      const snapshots = result.snapshotValidations || [];
      if (snapshots.length > 0) {
        const passedSnapshots = snapshots.filter(s => s.acceptable).length;
        report += `Snapshots: ${passedSnapshots}/${snapshots.length} passed\n`;
        
        const failedSnapshots = snapshots.filter(s => !s.acceptable);
        if (failedSnapshots.length > 0) {
          for (const s of failedSnapshots) {
            report += `  ❌ ${s.date} [${s.type}]`;
            if (s.investorName) report += ` - ${s.investorName}`;
            report += `\n`;
            report += `     Expected: ${s.expectedValue.toFixed(6)}, Actual: ${s.actualValue.toFixed(6)}\n`;
            report += `     Diff: ${s.difference.toFixed(6)}\n`;
          }
        }
      }
      
      // Position discrepancies
      if (!result.passed && result.discrepancies.length > 0) {
        report += `Discrepancies Found: ${result.discrepancies.length}\n`;
        for (const d of result.discrepancies) {
          report += `  - ${d.investorName}.${d.field}: `;
          report += `Excel=${d.excelValue}, Engine=${d.engineValue}, `;
          report += `Diff=${d.difference.toFixed(6)} (${(d.relativeDifference*100).toFixed(4)}%)`;
          report += ` ${d.acceptable ? '[OK]' : '[FAIL]'}\n`;
        }
      } else if (result.passed) {
        report += `  All positions match Excel expectations within tolerance\n`;
      }
      report += '\n';
    }

    // Add overall verdict
    const allPassed = results.every(r => r.passed);
    report += `OVERALL VERDICT: ${allPassed ? '✅ ALL FUNDS VALIDATED SUCCESSFULLY' : '❌ VALIDATION FAILED - SEE DISCREPANCIES ABOVE'}\n`;

    return report;
  }

  /**
   * Generate an HTML report (simplified)
   */
  generateHTMLReport(results: ValidationResult[]): string {
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Indigo Yield Platform - Fund Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .summary div { background: #e8f4f8; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }
        .passed { color: #28a745; font-weight: bold; }
        .failed { color: #dc3545; font-weight: bold; }
        .fund { border: 1px solid #ddd; margin: 15px 0; border-radius: 5px; }
        .fund-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #eee; }
        .fund-content { padding: 15px; }
        .discrepancy { background: #f8d7da; margin: 10px 0; padding: 10px; border-radius: 3px; }
        .discrepancy.ok { background: #d4edda; }
        .snapshot-table { margin-top: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .section { margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Indigo Yield Platform - Fund Lifecycle Validation Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div><h2>Total Funds</h2><div class="passed">${results.length}</div></div>
        <div><h2>Passed</h2><div class="passed">${passedCount}</div></div>
        <div><h2>Failed</h2><div class="failed">${failedCount}</div></div>
    </div>
    
    ${results.map(result => {
      const snapshots = result.snapshotValidations || [];
      const passedSnapshots = snapshots.filter(s => s.acceptable).length;
      const failedSnapshots = snapshots.filter(s => !s.acceptable);
      
      return `
    <div class="fund">
        <div class="fund-header">
            <h2>${result.fundName} (${result.currency})</h2>
            <div class="${result.passed ? 'passed' : 'failed'}">
                ${result.passed ? '✅ PASSED' : '❌ FAILED'} 
                (${result.discrepancies.length} discrepancies, ${passedSnapshots}/${snapshots.length} snapshots)
            </div>
        </div>
        <div class="fund-content">
            ${snapshots.length > 0 ? `
            <div class="section">
                <h3>Snapshot Validations</h3>
                <table class="snapshot-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Investor</th>
                            <th>Expected</th>
                            <th>Actual</th>
                            <th>Diff</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${snapshots.map(s => `
                        <tr class="${s.acceptable ? 'ok' : ''}">
                            <td>${s.date}</td>
                            <td>${s.type}</td>
                            <td>${s.investorName || '-'}</td>
                            <td>${s.expectedValue.toFixed(6)}</td>
                            <td>${s.actualValue.toFixed(6)}</td>
                            <td>${s.difference.toFixed(6)}</td>
                            <td>${s.acceptable ? '✅ OK' : '❌ FAIL'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${!result.passed && result.discrepancies.length > 0 ? `
            <div class="section">
                <h3>Position Discrepancies</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Investor</th>
                            <th>Field</th>
                            <th>Excel Value</th>
                            <th>Engine Value</th>
                            <th>Difference</th>
                            <th>Relative Diff</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.discrepancies.map(d => `
                        <tr class="${d.acceptable ? 'ok' : ''}">
                            <td>${d.investorName}</td>
                            <td>${d.field}</td>
                            <td>${d.excelValue}</td>
                            <td>${d.engineValue}</td>
                            <td>${d.difference.toFixed(6)}</td>
                            <td>${(d.relativeDifference*100).toFixed(4)}%</td>
                            <td>${d.acceptable ? '✅ OK' : '❌ FAIL'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${result.passed ? '<p>✅ All positions and snapshots match Excel expectations within tolerance.</p>' : ''}
        </div>
    </div>
    `;}).join('')}
    
    <div class="header" style="margin-top: 30px;">
        <h2>Overall Verdict</h2>
        <div class="${results.every(r => r.passed) ? 'passed' : 'failed'}" style="font-size: 1.2em; padding: 15px;">
            ${results.every(r => r.passed) ? '✅ ALL FUNDS VALIDATED SUCCESSFULLY' : '❌ VALIDATION FAILED - SEE DISCREPANCIES ABOVE'}
        </div>
    </div>
</body>
</html>
    `;
  }
}
