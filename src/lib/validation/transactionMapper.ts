import { ParsedFundData, ExcelTransaction } from './excelParser';

/**
 * Maps Excel transaction data to financial engine transaction format
 */
export class TransactionMapper {
  /**
   * Map Excel transaction to financial engine format
   */
  mapToFinancialTransaction(excelTx: ExcelTransaction, fundId: string, investorId: string): any {
    // Determine transaction type from Excel data or infer from amount
    let txType = excelTx.transactionType;
    if (!txType) {
      txType = excelTx.amount > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    }

    // Map to financial engine transaction structure
    return {
      // These would be the actual RPC parameters
      investor_id: investorId,
      fund_id: fundId,
      amount: Math.abs(excelTx.amount), // RPC expects positive amount
      transaction_type: txType.toLowerCase() as 'deposit' | 'withdrawal',
      transaction_date: excelTx.date,
      // Additional metadata for tracking
      metadata: {
        originalAmount: excelTx.amount,
        ibName: excelTx.ibName,
        ibPercentage: excelTx.ibPercentage,
        feePercentage: excelTx.feePercentage,
        referenceId: excelTx.referenceId,
        accountType: excelTx.accountType,
      }
    };
  }

  /**
   * Map Excel investor data to financial engine investor/fee/IB format
   */
  mapInvestorData(excelInvestor: {
    name: string;
    feePct: number;
    ibPct: number | null;
  }, investorId: string, fundId: string) {
    return {
      investor_id: investorId,
      fund_id: fundId,
      fee_pct: excelInvestor.feePct,
      ib_percentage: excelInvestor.ibPct,
      effective_date: '2024-01-01', // Default effective date
    };
  }

  /**
   * Map IB allocation from Excel data
   */
  mapIBAllocation(sourceInvestorName: string, targetInvestorName: string, 
                  ibPct: number | null, fundId: string,
                  sourceInvestorId: string, targetInvestorId: string) {
    if (!ibPct || ibPct <= 0) return null;

    return {
      ib_investor_id: targetInvestorId,
      source_investor_id: sourceInvestorId,
      fund_id: fundId,
      ib_percentage: ibPct,
      effective_date: '2024-01-01',
    };
  }

  /**
   * Group transactions by date for same-day processing
   */
  groupTransactionsByDate(transactions: ExcelTransaction[]): Map<string, ExcelTransaction[]> {
    const grouped = new Map<string, ExcelTransaction[]>();
    
    for (const tx of transactions) {
      const dateStr = tx.date as string;
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, []);
      }
      grouped.get(dateStr)!.push(tx);
    }
    
    return grouped;
  }
}
