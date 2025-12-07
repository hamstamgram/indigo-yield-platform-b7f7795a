// Asset utility functions for creating default and database-driven asset summaries

/**
 * Creates default asset summaries when no assets exist in the database
 * @returns Array of default asset summaries with native token balances only
 */
export const createDefaultAssetSummaries = () => {
  const defaultAssets = [
    { id: 1, symbol: "BTC", name: "BTC Yield Fund" },
    { id: 2, symbol: "ETH", name: "ETH Yield Fund" },
    { id: 3, symbol: "SOL", name: "SOL Yield Fund" },
    { id: 4, symbol: "USDT", name: "Stablecoin Fund" },
    { id: 5, symbol: "EURC", name: "EURC Yield Fund" },
    { id: 6, symbol: "xAUT", name: "Tokenized Gold" },
    { id: 7, symbol: "XRP", name: "XRP Yield Fund" },
  ];

  // Define default values for each supported asset type
  const defaultValues: Record<string, { balance: number; users: number; yield: number }> = {
    BTC: { balance: 12.5, users: 18, yield: 4.8 },
    ETH: { balance: 180, users: 15, yield: 5.2 },
    SOL: { balance: 2200, users: 11, yield: 6.5 },
    USDT: { balance: 425000, users: 22, yield: 8.1 },
    EURC: { balance: 100000, users: 10, yield: 5.0 },
    xAUT: { balance: 50, users: 8, yield: 3.5 },
    XRP: { balance: 500000, users: 15, yield: 5.5 },
  };

  // Create asset summaries for default assets - ensure uniqueness by symbol
  const uniqueAssets = new Map();

  defaultAssets.forEach((asset) => {
    const symbol = asset.symbol.toUpperCase();
    if (!uniqueAssets.has(symbol)) {
      const defaults = defaultValues[symbol] || { balance: 0, users: 0, yield: 0 };

      uniqueAssets.set(symbol, {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        totalBalance: defaults.balance,
        balance: defaults.balance, // Native token balance only
        totalUsers: defaults.users,
        avgYield: defaults.yield,
      });
    }
  });

  return Array.from(uniqueAssets.values());
};

/**
 * Creates asset summaries from database assets
 * @param assets Assets from the database
 * @returns Array of asset summaries with native token data from the database
 */
export const createAssetSummariesFromDb = (assets: any[]) => {
  // Define default values for each supported asset type
  const defaultValues: Record<string, { balance: number; users: number; yield: number }> = {
    BTC: { balance: 12.5, users: 18, yield: 4.8 },
    ETH: { balance: 180, users: 15, yield: 5.2 },
    SOL: { balance: 2200, users: 11, yield: 6.5 },
    USDT: { balance: 425000, users: 22, yield: 8.1 },
    EURC: { balance: 100000, users: 10, yield: 5.0 },
    xAUT: { balance: 50, users: 8, yield: 3.5 },
    XRP: { balance: 500000, users: 15, yield: 5.5 },
  };

  // Create asset summaries for all assets
  const uniqueAssets = new Map();

  assets.forEach((asset) => {
    const symbol = asset.symbol.toUpperCase();

    if (!uniqueAssets.has(symbol)) {
      // Get default values for this asset type or use zeros
      const defaults = defaultValues[symbol] || { balance: 0, users: 0, yield: 0 };

      uniqueAssets.set(symbol, {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        totalBalance: defaults.balance,
        balance: defaults.balance, // Native token balance only
        totalUsers: defaults.users,
        avgYield: defaults.yield,
      });
    }
  });

  return Array.from(uniqueAssets.values());
};

/**
 * Creates mock yield sources for demonstration
 * @returns Array of yield sources with rates
 */
export const createYieldSources = () => {
  return [
    {
      id: "1",
      name: "Aave",
      btcYield: 3.2,
      ethYield: 4.8,
      solYield: 0,
      usdtYield: 6.2,
      eurcYield: 5.8,
      xautYield: 0,
      xrpYield: 0,
    },
    {
      id: "2",
      name: "Compound",
      btcYield: 3.5,
      ethYield: 4.5,
      solYield: 0,
      usdtYield: 5.8,
      eurcYield: 5.5,
      xautYield: 0,
      xrpYield: 0,
    },
    {
      id: "3",
      name: "Solend",
      btcYield: 0,
      ethYield: 0,
      solYield: 6.5,
      usdtYield: 7.2,
      eurcYield: 0,
      xautYield: 0,
      xrpYield: 5.0,
    },
    {
      id: "4",
      name: "Lido",
      btcYield: 4.7,
      ethYield: 5.6,
      solYield: 6.8,
      usdtYield: 0,
      eurcYield: 0,
      xautYield: 3.2,
      xrpYield: 0,
    },
    {
      id: "5",
      name: "Marinade",
      btcYield: 0,
      ethYield: 0,
      solYield: 7.1,
      usdtYield: 0,
      eurcYield: 0,
      xautYield: 0,
      xrpYield: 4.5,
    },
  ];
};
