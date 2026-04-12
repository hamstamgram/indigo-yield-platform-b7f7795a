import * as XLSX from 'xlsx';
import * as fs from 'fs';

export interface ExcelTransaction {
  date: string;
  investorName: string;
  currency: string;
  amount: number;
  ibName?: string | null;
  ibPercentage?: number | null;
  feePercentage?: number | null;
  accountType?: string;
  transactionType?: string;
  referenceId?: string;
}

export interface ParsedFundData {
  fundName: string;
  currency: string;
  transactions: ExcelTransaction[];
  investors: Array<{
    name: string;
    feePct: number;
    ibPct: number | null;
  }>;
}

export class ExcelParser {
  private workbook: XLSX.WorkBook | null = null;

  constructor() {}

  async load(filePath: string | ArrayBuffer | Buffer): Promise<void> {
    let buffer: ArrayBuffer;
    if (typeof filePath === 'string') {
      const fileBuffer = fs.readFileSync(filePath);
      buffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer;
    } else if (Buffer.isBuffer(filePath)) {
      buffer = filePath.buffer.slice(filePath.byteOffset, filePath.byteOffset + filePath.byteLength) as ArrayBuffer;
    } else {
      buffer = filePath;
    }
    this.workbook = XLSX.read(buffer, { type: 'array' });
  }

  async parseAllFunds(): Promise<ParsedFundData[]> {
    if (!this.workbook) {
      throw new Error('Workbook not loaded. Call load() first.');
    }

    const investmentsSheet = this.workbook.Sheets['Investments'];
    if (!investmentsSheet) {
      throw new Error('Investments sheet not found in Excel file');
    }

    const jsonData = XLSX.utils.sheet_to_json(investmentsSheet, { defval: null }) as Record<string, unknown>[];

    const fundsMap = new Map<string, {
      currency: string;
      transactions: ExcelTransaction[];
      investors: Map<string, { feePct: number; ibPct: number | null }>;
    }>();

    for (const row of jsonData) {
      const currency = row['Currency'] as string;
      if (!currency) continue;

      if (!fundsMap.has(currency)) {
        fundsMap.set(currency, {
          currency,
          transactions: [],
          investors: new Map(),
        });
      }

      const fundData = fundsMap.get(currency)!;
      
      let dateStr = '';
      const dateVal = row['Investment Date'];
      if (typeof dateVal === 'number') {
        const date = new Date((dateVal - 25569) * 86400 * 1000);
        dateStr = date.toISOString().split('T')[0];
      } else if (dateVal instanceof Date) {
        dateStr = dateVal.toISOString().split('T')[0];
      } else {
        dateStr = String(dateVal || '');
      }

      const transaction: ExcelTransaction = {
        date: dateStr,
        investorName: String(row['Investor Name'] || ''),
        currency,
        amount: Number(row['Amount'] || 0),
        ibName: row['Intro Broker Name'] ? String(row['Intro Broker Name']) : null,
        ibPercentage: row['IB Percentage'] !== null && row['IB Percentage'] !== undefined 
          ? Number(row['IB Percentage']) 
          : null,
        feePercentage: row['Fee Percentage'] !== null && row['Fee Percentage'] !== undefined 
          ? Number(row['Fee Percentage']) 
          : null,
        accountType: row['Account Type'] ? String(row['Account Type']) : undefined,
        transactionType: row['Transaction Type'] ? String(row['Transaction Type']) : undefined,
        referenceId: row['Reference ID'] ? String(row['Reference ID']) : undefined,
      };

      fundData.transactions.push(transaction);

      const investorName = transaction.investorName;
      if (investorName) {
        const current = fundData.investors.get(investorName) || { feePct: 0, ibPct: null };
        if (transaction.feePercentage !== null) {
          current.feePct = transaction.feePercentage;
        }
        if (transaction.ibPercentage !== null) {
          current.ibPct = transaction.ibPercentage;
        }
        fundData.investors.set(investorName, current);
      }
    }

    const result: ParsedFundData[] = [];
    const fundsArray = Array.from(fundsMap.entries());
    for (const [currency, data] of fundsArray) {
      let fundName = `${currency} Yield Fund`;
      if (currency === 'BTC TAC') fundName = 'BTC TAC Yield Fund';
      else if (currency === 'ETH TAC') fundName = 'ETH TAC Yield Fund';
      else if (currency === 'USDT') fundName = 'USDT Yield Fund';
      else if (currency === 'SOL') fundName = 'SOL Yield Fund';
      else if (currency === 'XRP') fundName = 'Ripple Yield Fund';

      const investors = Array.from(data.investors.entries()).map(([name, { feePct, ibPct }]) => ({
        name,
        feePct,
        ibPct,
      }));

      result.push({
        fundName,
        currency,
        transactions: data.transactions.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
        investors,
      });
    }

    return result;
  }

  async getExpectedFinalPositions(): Promise<Record<string, Record<string, { value: number; costBasis: number; shares: number }>>> {
    if (!this.workbook) {
      throw new Error('Workbook not loaded. Call load() first.');
    }

    const result: Record<string, Record<string, { value: number; costBasis: number; shares: number }>> = {};
    const fundSheets = ['BTC Yield Fund', 'USDT Yield Fund', 'ETH Yield Fund', 'SOL Yield Fund', 'XRP Yield Fund'];

    for (const sheetName of fundSheets) {
      const sheet = this.workbook.Sheets[sheetName];
      if (!sheet) continue;

      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];
      const fundResults: Record<string, { value: number; costBasis: number; shares: number }> = {};

      for (let rowNum = 24; rowNum <= 38 && rowNum < jsonData.length; rowNum++) {
        const row = jsonData[rowNum];
        if (!row) continue;

        let investorName: string | null = null;
        for (const key of Object.keys(row)) {
          const val = row[key];
          if (typeof val === 'string' && (val.includes('Sam') || val.includes('Ryan') || val.includes('Indigo') || val.includes('Jose') || val.includes('Kyle'))) {
            investorName = val.trim();
            break;
          }
        }

        if (investorName) {
          let value = 0;
          let costBasis = 0;
          let shares = 0;

          const cols = Object.entries(row);
          for (const [col, val] of cols) {
            if (typeof val === 'number' && !isNaN(val)) {
              value = val;
            }
          }

          fundResults[investorName] = { value, costBasis, shares };
        }
      }

      if (Object.keys(fundResults).length > 0) {
        result[sheetName] = fundResults;
      }
    }

    return result;
  }
}
