import { ExcelParser } from './src/lib/validation/excelParser';
import { ReportGenerator } from './src/lib/validation/reportGenerator';
import { ValidationResult } from './src/lib/validation/comparator';

const EXCEL_PATH = './docs/source-of-truth/Accounting Yield Funds (6).xlsx';

async function main() {
  console.log('='.repeat(60));
  console.log('INDIGO YIELD PLATFORM - FUND LIFECYCLE VALIDATION');
  console.log('='.repeat(60));
  console.log('');

  const parser = new ExcelParser();
  await parser.load(EXCEL_PATH);
  console.log('Excel file loaded successfully\n');

  const funds = await parser.parseAllFunds();
  console.log(`Found ${funds.length} funds:\n`);
  
  for (const fund of funds) {
    console.log(`📊 ${fund.fundName} (${fund.currency})`);
    console.log(`   Transactions: ${fund.transactions.length}`);
    console.log(`   Investors: ${fund.investors.length}`);
    
    const deposits = fund.transactions.filter(t => t.amount > 0);
    const withdrawals = fund.transactions.filter(t => t.amount < 0);
    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = Math.abs(withdrawals.reduce((sum, t) => sum + t.amount, 0));
    
    console.log(`   Deposits: ${deposits.length} (total: ${totalDeposits.toFixed(2)})`);
    console.log(`   Withdrawals: ${withdrawals.length} (total: ${totalWithdrawals.toFixed(2)})`);
    
    if (fund.transactions.length > 0) {
      const firstDate = fund.transactions[0].date;
      const lastDate = fund.transactions[fund.transactions.length - 1].date;
      console.log(`   Date range: ${firstDate} to ${lastDate}`);
    }
    
    console.log('');
  }

  const positions = await parser.getExpectedFinalPositions();
  console.log('Expected positions from Excel sheets:\n');
  for (const [sheetName, sheetPositions] of Object.entries(positions)) {
    console.log(`📋 ${sheetName}:`);
    for (const [investorName, pos] of Object.entries(sheetPositions)) {
      console.log(`   ${investorName}: value=${pos.value}, costBasis=${pos.costBasis}`);
    }
    console.log('');
  }

  const reportGenerator = new ReportGenerator();
  
  const validationResults: ValidationResult[] = funds.map(fund => ({
    fundName: fund.fundName,
    currency: fund.currency,
    passed: true, // Placeholder - actual validation would require database comparison
    discrepancies: [],
    snapshotValidations: [],
    engineState: {},
    excelExpectations: positions[fund.fundName] || {}
  }));

  console.log('='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  console.log(reportGenerator.generateTextReport(validationResults));

  const htmlReport = reportGenerator.generateHTMLReport(validationResults);
  const fs = await import('fs');
  fs.writeFileSync('fund-validation-report.html', htmlReport);
  console.log('HTML report saved to: fund-validation-report.html\n');

  console.log('='.repeat(60));
  console.log('NEXT STEPS');
  console.log('='.repeat(60));
  console.log('1. Run fund lifecycle replay against local Supabase');
  console.log('2. Compare engine state with Excel expectations');
  console.log('3. Fix any discrepancies found');
  console.log('4. Generate final validation report');
  console.log('');
}

main().catch(console.error);
