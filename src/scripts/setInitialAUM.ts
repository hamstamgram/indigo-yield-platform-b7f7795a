/**
 * Script to set initial daily AUM for existing funds
 * Run this once to initialize AUM values based on current investor positions
 */

import { setFundDailyAUM } from "@/services/operations/aumService";

// Fund data based on current investor positions
const fundsToInitialize = [
  {
    id: "6e103afe-0b62-4e68-9bd7-1bb3610ce6fa", // USDT Yield Fund
    asset: "USDT",
    aum: 104825.9650689478,
  },
  {
    id: "2102bc81-4a8c-437d-9c1f-d34c32a534ee", // BTC Yield Fund
    asset: "BTC",
    aum: 27001.8580007675,
  },
  {
    id: "2682e5a8-164a-4765-9907-2844d6d793cf", // ETH Yield Fund
    asset: "ETH",
    aum: 12996.824956122,
  },
];

export async function setInitialAUM() {
  console.log("Setting initial daily AUM for existing funds...");

  const results = [];

  for (const fund of fundsToInitialize) {
    console.log(`Setting AUM for ${fund.asset} fund: ${fund.aum} ${fund.asset}`);

    const result = await setFundDailyAUM(fund.id, fund.aum, new Date().toISOString().split("T")[0]);

    if (result.success) {
      console.log(`✅ Successfully set AUM for ${fund.asset} fund`);
    } else {
      console.error(`❌ Failed to set AUM for ${fund.asset} fund:`, result.error);
    }

    results.push({
      asset: fund.asset,
      success: result.success,
      error: result.error,
    });
  }

  console.log("AUM initialization complete:", results);
  return results;
}

// Auto-run if this module is executed directly
if (typeof window !== "undefined") {
  // Browser environment - expose to global for manual execution
  (window as any).setInitialAUM = setInitialAUM;
  console.log("Run setInitialAUM() in the browser console to initialize AUM values");
}
