/**
 * Investor Report Types
 * Used for the InvestorReportTemplate component and PDF generation
 */

export interface InvestorFund {
  name: string; // e.g., "ETH YIELD FUND"
  currency: string; // e.g., "ETH"
  // Beginning Balance
  begin_balance_mtd: string;
  begin_balance_qtd: string;
  begin_balance_ytd: string;
  begin_balance_itd: string;
  // Additions
  additions_mtd: string;
  additions_qtd: string;
  additions_ytd: string;
  additions_itd: string;
  // Redemptions
  redemptions_mtd: string;
  redemptions_qtd: string;
  redemptions_ytd: string;
  redemptions_itd: string;
  // Net Income
  net_income_mtd: string;
  net_income_qtd: string;
  net_income_ytd: string;
  net_income_itd: string;
  // Ending Balance
  ending_balance_mtd: string;
  ending_balance_qtd: string;
  ending_balance_ytd: string;
  ending_balance_itd: string;
  // Rate of Return
  return_rate_mtd: string;
  return_rate_qtd: string;
  return_rate_ytd: string;
  return_rate_itd: string;
}

export interface InvestorData {
  name: string;
  reportDate: string;
  funds: InvestorFund[];
}

// CDN URLs for fund icons
export const FUND_ICONS: Record<string, string> = {
  "BTC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  "ETH YIELD FUND": "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  "USDC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  "USDT YIELD FUND": "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  "SOL YIELD FUND": "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  "EURC YIELD FUND": "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
  "XAUT YIELD FUND": "https://storage.mlcdn.com/account_image/855106/eX8YQ2JiQtWXocPigWGSwju5WPTsGq01eOKmTx5p.png",
  "XRP YIELD FUND": "https://storage.mlcdn.com/account_image/855106/mlmOJ9qsJ3LDZaVyWnIqhffzzem0vIts6bourbHO.png",
};

export const LOGO_URL = "https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg";

export const SOCIAL_ICONS = {
  linkedin: "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png",
  instagram: "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png",
  twitter: "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png",
};

/**
 * Returns color based on value - red for negative, green for positive
 */
export const getValueColor = (value: string): string => {
  if (value.startsWith('-') || value.startsWith('(')) {
    return '#dc2626'; // Red
  }
  return '#16a34a'; // Green
};
