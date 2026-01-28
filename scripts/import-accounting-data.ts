/**
 * Import Accounting Data Script
 *
 * This script imports all transactions from the accounting data into the platform.
 * Run: npx ts-node scripts/import-accounting-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Accounting data paths
const PLATFORM_INVESTORS_PATH = "/Users/mama/Downloads/platform/platform_investors.json";
const PLATFORM_TRANSACTIONS_PATH = "/Users/mama/Downloads/platform/platform_transactions.json";
const EXCEL_DATA_PATH =
  "/Users/mama/indigo-yield-platform-v01/tests/fixtures/accounting-excel-data-v3.json";

// Fund mapping (code to ID)
const FUND_IDS: Record<string, string> = {
  BTC: "0a048d9b-c4cf-46eb-b428-59e10307df93",
  ETH: "717614a2-9e24-4abc-a89d-02209a3a772a",
  SOL: "7574bc81-aab3-4175-9e7f-803aa6f9eb8f",
  USDT: "8ef9dc49-e76c-4882-84ab-a449ef4326db",
  XRP: "2c123c4f-76b4-4504-867e-059649855417",
};

// Investor name to profile ID mapping (from database)
const INVESTOR_IDS: Record<string, string> = {
  "Matthias Reiser": "2081d07e-d535-4cb7-9f8c-5db762290739",
  "Danielle Richetta": "19c6f653-750a-48a4-a432-581348f47925",
  "Babak Eftekhari": "607438b4-d197-49c7-bdc0-b391bfa47227",
  Kabbaj: "fcd32d4f-b978-49d5-81bd-7086a22a67ac",
  "Julien Grunebaum": "f23da33c-6a52-4bd3-a46d-8bf03c51fab7",
  "Daniele Francilia": "dc03c0bb-9b07-491c-8d81-94f4cfa1d00f",
  "Pierre Bezençon": "11015149-e5c5-4d0f-a103-1684d6694dba",
  "Matthew Beatty": "6343b078-91de-4613-961b-60e4f08e054a",
  "Bo De kriek": "5cf9484a-b9c3-47ce-87ac-ee0093d65a7f",
  "Lars Ahlgreen": "4ecade70-05ad-4661-8f65-83b1e56b1c17",
  "INDIGO DIGITAL ASSET FUND LP": "ec182081-9bbb-4624-84ac-41b086985d8c",
  "Nathanael Cohen": "ed91c89d-23de-4981-b6b7-60e13f1a6767",
  "Nathanaël Cohen": "ed91c89d-23de-4981-b6b7-60e13f1a6767",
  "Jose Molla": "c9f2e7e8-cb21-4c9b-81ab-a11acc580e9a",
  Blondish: "1354e322-05d2-4d61-adac-f301cc0f63bf",
  "Advantage Blockchain": "fb060de1-3561-4f84-8858-6a8dd58746b5",
  "Alec Beckman": "36330a7e-ecd9-4ab7-9679-496f78f090ce",
  "Paul Johnson": "41332b95-14c3-4da4-9ab1-e1ea3594ef25",
  "Alex Jacobs": "f47c3f05-ed07-4607-a5ab-fedcb1c155ef",
  "Tomer Zur": "1b40d6a6-732c-4329-823e-f161a572712a",
  "Sam Johnson": "a4e69247-b268-4ccb-bf64-da9aabd14cff",
  "Ryan Van Der Wall": "61a8c8b1-88a9-486d-b10c-f7b2b353a41a",
  "Brandon Hood": "94cd2879-2d31-4f2c-9a34-e21abf7f7da3",
  "NSVO Holdings": "513917cd-cf48-4ac3-96ff-c117795a8e7c",
  "Dario Deiana": "8838e8a2-dc35-47c0-9061-7136c06dd300",
  "Alain Bensimon": "daba0cd4-fff3-4698-8ee7-e14cc5f31468",
  "Anne Cecile Noique": "85101af0-774d-41ae-baf8-20e31ea6851a",
  "Terance Chen": "a6537a5d-8dfb-487b-8889-c97d5133bc37",
  "INDIGO Ventures": "a2e92b4f-68a9-42a1-aa65-7d4b470fe817",
  "Sacha Oshry": "e76ac4f6-103f-43ef-95c1-a6b9b3baeabd",
  HALLEY86: "c817ff20-18b3-45d4-b3e9-f6a820c48940",
  "Monica Levy Chicheportiche": "d7998546-4950-4d35-a344-11790b993e04",
  "Nath & Thomas": "83b676cd-96b0-4d98-9a35-a5542c4628d2",
  "Valeria Cruz": "edb9eb37-0942-492c-a165-82ad54ee7bd6",
  "Ventures Life Style": "973cc95b-d1e2-4ec1-b4a3-656284c2ed1a",
  "Joel Barbeau": "19efd45d-554e-48fe-82ac-4b77207f8783",
  "Thomas Puech": "5470150c-5719-4154-a7f6-265170f5622d",
  "Kyle Gulamerian": "c2c449d3-a5cb-4b10-801f-f9ae9f96b121",
  Victoria: "1fccc1f3-b5c4-4d3c-824c-9f26bc010cd1",
  "Victoria Pariente-Cohen": "1fccc1f3-b5c4-4d3c-824c-9f26bc010cd1",
  "Vivie & Liana": "431ebf42-5ae4-4e21-8dbd-983cd9a18ac3",
  "Oliver Loisel": "5d2b6260-24db-4a88-a139-19e255f1f1a9",
  "INDIGO FEES": "169bb053-36cb-4f6e-93ea-831f0dfeaf1d",
  "Indigo Fees": "169bb053-36cb-4f6e-93ea-831f0dfeaf1d",
};

// Fee structures from accounting data (management_fee as decimal)
interface FeeStructure {
  management_fee: number;
  ib_fee: number;
}

// Complete fee schedules based on platform_investors.json
const FEE_SCHEDULES: Record<string, Record<string, FeeStructure>> = {
  "Babak Eftekhari": {
    ETH: { management_fee: 0.18, ib_fee: 0.02 },
    USDT: { management_fee: 0.18, ib_fee: 0.02 },
  },
  "Julien Grunebaum": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Daniele Francilia": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Pierre Bezençon": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Matthew Beatty": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Bo De kriek": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Lars Ahlgreen": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "Jose Molla": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
    USDT: { management_fee: 0.2, ib_fee: 0 },
    SOL: { management_fee: 0.2, ib_fee: 0 },
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  "Advantage Blockchain": {
    ETH: { management_fee: 0.18, ib_fee: 0.02 },
  },
  "Alec Beckman": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
  },
  "Paul Johnson": {
    ETH: { management_fee: 0.135, ib_fee: 0.015 },
    SOL: { management_fee: 0.135, ib_fee: 0.015 },
    BTC: { management_fee: 0.135, ib_fee: 0.015 },
  },
  "Alex Jacobs": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
    SOL: { management_fee: 0.2, ib_fee: 0 },
  },
  "Tomer Zur": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
  },
  "Sam Johnson": {
    ETH: { management_fee: 0.16, ib_fee: 0.04 },
    USDT: { management_fee: 0.16, ib_fee: 0.04 },
    SOL: { management_fee: 0.16, ib_fee: 0.04 },
    XRP: { management_fee: 0.16, ib_fee: 0.04 },
    BTC: { management_fee: 0.16, ib_fee: 0.04 },
  },
  "Ryan Van Der Wall": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
    USDT: { management_fee: 0.2, ib_fee: 0 },
    SOL: { management_fee: 0.2, ib_fee: 0 },
    XRP: { management_fee: 0.2, ib_fee: 0 },
  },
  "Brandon Hood": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
  },
  "NSVO Holdings": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  "Dario Deiana": {
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "Alain Bensimon": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Anne Cecile Noique": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Terance Chen": {
    USDT: { management_fee: 0.1, ib_fee: 0 },
  },
  "Sacha Oshry": {
    USDT: { management_fee: 0.15, ib_fee: 0 },
  },
  HALLEY86: {
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "Monica Levy Chicheportiche": {
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "Valeria Cruz": {
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "Ventures Life Style": {
    USDT: { management_fee: 0.16, ib_fee: 0.04 },
  },
  "Joel Barbeau": {
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "Kyle Gulamerian": {
    BTC: { management_fee: 0.15, ib_fee: 0 },
  },
  Victoria: {
    BTC: { management_fee: 0, ib_fee: 0 },
  },
  "Vivie & Liana": {
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  "Oliver Loisel": {
    BTC: { management_fee: 0.1, ib_fee: 0 },
  },
  // Default 20% for all others
  "Matthias Reiser": {
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  "Danielle Richetta": {
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  Kabbaj: {
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  "INDIGO DIGITAL ASSET FUND LP": {
    ETH: { management_fee: 0, ib_fee: 0 },
    USDT: { management_fee: 0, ib_fee: 0 },
    SOL: { management_fee: 0, ib_fee: 0 },
  },
  "Nathanael Cohen": {
    ETH: { management_fee: 0.2, ib_fee: 0 },
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  Blondish: {
    ETH: { management_fee: 0.2, ib_fee: 0 },
    BTC: { management_fee: 0.2, ib_fee: 0 },
  },
  "Thomas Puech": {
    BTC: { management_fee: 0.2, ib_fee: 0 },
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "Nath & Thomas": {
    BTC: { management_fee: 0.2, ib_fee: 0 },
    USDT: { management_fee: 0.2, ib_fee: 0 },
  },
  "INDIGO Ventures": {
    USDT: { management_fee: 0, ib_fee: 0 },
  },
  "INDIGO FEES": {
    ETH: { management_fee: 0, ib_fee: 0 },
    USDT: { management_fee: 0, ib_fee: 0 },
    BTC: { management_fee: 0, ib_fee: 0 },
    SOL: { management_fee: 0, ib_fee: 0 },
  },
};

interface Transaction {
  date: string;
  investorName: string;
  currency: string;
  amount: number;
  usdValue: number;
  notes?: string;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=".repeat(60));
  console.log("ACCOUNTING DATA IMPORT");
  console.log("=".repeat(60));

  // Step 1: Create fee schedules
  console.log("\n[1/2] Creating fee schedules...");
  await createFeeSchedules(supabase);

  // Step 2: Import transactions
  console.log("\n[2/2] Importing transactions...");
  await importTransactions(supabase);

  console.log("\n" + "=".repeat(60));
  console.log("IMPORT COMPLETE");
  console.log("=".repeat(60));
}

async function createFeeSchedules(supabase: ReturnType<typeof createClient>) {
  let created = 0;
  let errors = 0;

  for (const [investorName, fundFees] of Object.entries(FEE_SCHEDULES)) {
    const investorId = INVESTOR_IDS[investorName];
    if (!investorId) {
      console.warn(`  Warning: No investor ID for ${investorName}`);
      continue;
    }

    for (const [currency, fees] of Object.entries(fundFees)) {
      const fundId = FUND_IDS[currency];
      if (!fundId) {
        console.warn(`  Warning: No fund ID for ${currency}`);
        continue;
      }

      const feePct = fees.management_fee * 100; // Convert 0.18 to 18

      const { error } = await supabase.from("investor_fee_schedule").insert({
        investor_id: investorId,
        fund_id: fundId,
        fee_pct: feePct,
        effective_date: "2024-01-01",
      });

      if (error) {
        console.error(`  Error: ${investorName} ${currency}: ${error.message}`);
        errors++;
      } else {
        created++;
      }
    }
  }

  console.log(`  Created: ${created}, Errors: ${errors}`);
}

async function importTransactions(supabase: ReturnType<typeof createClient>) {
  // Read Excel data (contains all transactions including Kyle, Victoria, etc.)
  const excelData = JSON.parse(fs.readFileSync(EXCEL_DATA_PATH, "utf-8"));
  const investments: Transaction[] = excelData.investments;

  // Sort by date (chronological)
  investments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log(`  Total transactions to import: ${investments.length}`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const tx of investments) {
    // Skip Indigo Fees entries (fee tracking rows)
    if (tx.investorName === "Indigo Fees" || tx.investorName === "INDIGO FEES") {
      skipped++;
      continue;
    }

    // Normalize investor name
    let investorName = tx.investorName;
    if (investorName === "danielle Richetta") investorName = "Danielle Richetta";
    if (investorName === "Nathanaël Cohen") investorName = "Nathanael Cohen";

    const investorId = INVESTOR_IDS[investorName];
    if (!investorId) {
      console.warn(`  Warning: No investor ID for "${tx.investorName}" - skipping`);
      skipped++;
      continue;
    }

    const fundId = FUND_IDS[tx.currency];
    if (!fundId) {
      console.warn(`  Warning: No fund ID for ${tx.currency} - skipping`);
      skipped++;
      continue;
    }

    // Determine transaction type based on amount sign
    const type = tx.amount >= 0 ? "DEPOSIT" : "WITHDRAWAL";
    const amount = Math.abs(tx.amount);

    // Create transaction via RPC
    const { error } = await supabase.rpc("create_transaction", {
      p_investor_id: investorId,
      p_fund_id: fundId,
      p_type: type,
      p_amount: amount,
      p_tx_date: tx.date,
      p_notes: tx.notes || `Imported from accounting: ${tx.investorName} ${tx.currency}`,
    });

    if (error) {
      // Try direct insert if RPC fails
      const { error: insertError } = await supabase.from("transactions_v2").insert({
        investor_id: investorId,
        fund_id: fundId,
        type,
        amount,
        tx_date: tx.date,
        notes: tx.notes || `Imported from accounting: ${tx.investorName} ${tx.currency}`,
      });

      if (insertError) {
        console.error(
          `  Error: ${tx.date} ${tx.investorName} ${tx.amount} ${tx.currency}: ${insertError.message}`
        );
        errors++;
      } else {
        imported++;
      }
    } else {
      imported++;
    }

    // Progress every 20 transactions
    if ((imported + errors + skipped) % 20 === 0) {
      console.log(`  Progress: ${imported} imported, ${errors} errors, ${skipped} skipped`);
    }
  }

  console.log(`  Final: ${imported} imported, ${errors} errors, ${skipped} skipped`);
}

main().catch(console.error);
