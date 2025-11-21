/**
 * PDF Generation Types and Interfaces
 * For professional investor statement generation
 */

export interface BrandingAssets {
  logo?: string; // Base64 or URL to logo
  coverImage?: string; // Base64 or URL to cover image
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
    background: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
}

export interface StatementData {
  investor: {
    id: string;
    name: string;
    email: string;
    fund_code: string;
    fund_name: string;
    account_number?: string;
  };
  period: {
    start: Date;
    end: Date;
    quarter?: string;
    year: number;
  };
  summary: {
    totalValue: number;
    beginningValue: number;
    endingValue: number;
    netDeposits: number;
    netWithdrawals: number;
    totalReturn: number;
    totalReturnPercent: number;
    managementFees: number;
    performanceFees: number;
  };
  holdings: Array<{
    asset: string;
    symbol: string;
    quantity: number;
    price: number;
    value: number;
    percentOfPortfolio: number;
  }>;
  transactions: Array<{
    date: Date;
    type: "deposit" | "withdrawal" | "fee" | "yield" | "trade";
    description: string;
    amount: number;
    balance?: number;
  }>;
  performance: {
    mtd: number;
    qtd: number;
    ytd: number;
    itd: number;
    benchmark?: {
      name: string;
      mtd: number;
      qtd: number;
      ytd: number;
      itd: number;
    };
  };
  charts: {
    allocationChart: string; // Base64 PNG
    performanceChart: string; // Base64 PNG
    benchmarkChart?: string; // Base64 PNG
  };
}

export interface PDFGenerationOptions {
  includeTransactions?: boolean;
  includePerformanceComparison?: boolean;
  includeBenchmark?: boolean;
  includeDisclosures?: boolean;
  pageSize?: "A4" | "Letter";
  compress?: boolean;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  data?: Uint8Array;
  filename?: string;
  error?: string;
  metadata?: {
    pages: number;
    fileSize: number;
    generatedAt: Date;
  };
}

export interface ChartExportOptions {
  width: number;
  height: number;
  format: "png" | "jpeg";
  quality?: number;
  backgroundColor?: string;
  scale?: number;
}
