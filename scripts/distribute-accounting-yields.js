/**
 * Distribute Yields Based on Accounting Data
 *
 * This script reads the accounting data and creates YIELD transactions
 * to match the expected positions from the Excel accounting files.
 */

const fs = require("fs");
const path = require("path");

// Read accounting data
const accountingInvestorsPath = "/Users/mama/Downloads/platform/platform_investors.json";
const accountingTransactionsPath = "/Users/mama/Downloads/platform/platform_transactions.json";
const cleanAccountingPath = "/Users/mama/Downloads/platform/clean_accounting_data.json";

const investorsData = JSON.parse(fs.readFileSync(accountingInvestorsPath, "utf8"));
const transactionsData = JSON.parse(fs.readFileSync(accountingTransactionsPath, "utf8"));
const cleanData = JSON.parse(fs.readFileSync(cleanAccountingPath, "utf8"));

// Currency to fund code mapping
const currencyToFund = {
  BTC: "IND-BTC",
  ETH: "IND-ETH",
  USDT: "IND-USDT",
  SOL: "IND-SOL",
  XRP: "IND-XRP",
};

// Calculate net deposits per investor per fund from transactions
function calculateNetDeposits(transactions) {
  const netDeposits = {};

  transactions.forEach((tx) => {
    const key = `${tx.investor_id}|${tx.currency || extractCurrency(tx.notes)}`;
    if (!netDeposits[key]) {
      netDeposits[key] = {
        investor_id: tx.investor_id,
        investor_name: tx.investor_name || "Unknown",
        currency: tx.currency || extractCurrency(tx.notes),
        deposits: 0,
        withdrawals: 0,
      };
    }

    if (tx.transaction_type === "deposit") {
      netDeposits[key].deposits += tx.amount;
    } else if (tx.transaction_type === "withdrawal") {
      netDeposits[key].withdrawals += tx.amount;
    }
  });

  return netDeposits;
}

function extractCurrency(notes) {
  if (!notes) return null;
  const match = notes.match(/Currency:\s*(\w+)/);
  return match ? match[1] : null;
}

// Parse the clean accounting data transactions
const enrichedTransactions = cleanData.transactions.map((tx) => ({
  ...tx,
  currency: tx.currency || extractCurrency(tx.notes),
}));

const netDeposits = calculateNetDeposits(enrichedTransactions);

// Get yield percentages from current_positions in accounting data
// The current_positions appear to be yield percentages/rates of return
const yieldPercentages = {};
investorsData.investors.forEach((inv) => {
  if (inv.current_positions && Object.keys(inv.current_positions).length > 0) {
    Object.entries(inv.current_positions).forEach(([currency, pct]) => {
      const key = `${inv.investor_id}|${currency}`;
      yieldPercentages[key] = {
        investor_id: inv.investor_id,
        investor_name: inv.name,
        currency: currency,
        yield_pct: pct, // This appears to be the cumulative yield percentage
      };
    });
  }
});

// Calculate expected yields
console.log("\n=== YIELD DISTRIBUTION CALCULATION ===\n");
console.log("Based on accounting current_positions (interpreted as yield percentages)\n");

const yieldDistributions = [];

Object.entries(netDeposits).forEach(([key, data]) => {
  const yieldData = yieldPercentages[key];

  if (!yieldData) {
    // No yield percentage data for this investor/fund
    return;
  }

  const netDeposit = data.deposits - data.withdrawals;
  if (netDeposit <= 0) {
    // Skip if no net position
    return;
  }

  // Calculate expected yield amount
  // yield_amount = net_deposits * yield_percentage
  const yieldAmount = netDeposit * yieldData.yield_pct;

  if (yieldAmount > 0.00001) {
    // Only include meaningful yields
    yieldDistributions.push({
      investor_id: data.investor_id,
      investor_name: data.investor_name || yieldData.investor_name,
      currency: data.currency,
      fund_code: currencyToFund[data.currency],
      net_deposits: netDeposit,
      yield_pct: yieldData.yield_pct,
      yield_amount: yieldAmount,
      expected_position: netDeposit + yieldAmount,
    });
  }
});

// Sort by fund then investor
yieldDistributions.sort((a, b) => {
  if (a.fund_code !== b.fund_code) return a.fund_code.localeCompare(b.fund_code);
  return a.investor_name.localeCompare(b.investor_name);
});

// Print summary
console.log("| Investor | Fund | Net Deposits | Yield % | Yield Amount | Expected Position |");
console.log("|----------|------|--------------|---------|--------------|-------------------|");

yieldDistributions.forEach((d) => {
  console.log(
    `| ${d.investor_name.substring(0, 25).padEnd(25)} | ${d.fund_code} | ${d.net_deposits.toFixed(6).padStart(12)} | ${(d.yield_pct * 100).toFixed(4).padStart(7)}% | ${d.yield_amount.toFixed(6).padStart(12)} | ${d.expected_position.toFixed(6).padStart(17)} |`
  );
});

// Calculate fund totals
const fundTotals = {};
yieldDistributions.forEach((d) => {
  if (!fundTotals[d.fund_code]) {
    fundTotals[d.fund_code] = { yield: 0, deposits: 0 };
  }
  fundTotals[d.fund_code].yield += d.yield_amount;
  fundTotals[d.fund_code].deposits += d.net_deposits;
});

console.log("\n=== FUND TOTALS ===\n");
Object.entries(fundTotals).forEach(([fund, totals]) => {
  console.log(
    `${fund}: ${totals.yield.toFixed(6)} yield to distribute (${totals.deposits.toFixed(2)} total deposits)`
  );
});

// Generate SQL to create YIELD transactions
console.log("\n=== SQL TO CREATE YIELD TRANSACTIONS ===\n");
console.log("-- Run this SQL to distribute yields based on accounting data");
console.log(
  "-- This creates YIELD transactions for each investor to match accounting expectations\n"
);

console.log(`
-- First, find platform investor IDs by matching names
-- Then create YIELD transactions

DO $$
DECLARE
  v_fund_id UUID;
  v_investor_id UUID;
  v_tx_id UUID;
BEGIN
`);

yieldDistributions.forEach((d, idx) => {
  if (d.yield_amount > 0.00001) {
    console.log(`
  -- ${d.investor_name} - ${d.fund_code}: ${d.yield_amount.toFixed(8)} yield
  SELECT id INTO v_fund_id FROM funds WHERE code = '${d.fund_code}';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%${d.investor_name.replace(/'/g, "''")}%')
    OR LOWER(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) = LOWER('${d.investor_name.replace(/'/g, "''")}')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, economic_date,
      status, notes, created_by
    ) VALUES (
      v_investor_id, v_fund_id, 'YIELD', ${d.yield_amount.toFixed(10)},
      CURRENT_DATE, CURRENT_DATE,
      'COMPLETED', 'Accounting yield distribution - cumulative yield to ${new Date().toISOString().split("T")[0]}',
      (SELECT id FROM profiles WHERE email = 'nathanael@indigo.fund' LIMIT 1)
    ) RETURNING id INTO v_tx_id;

    -- Update position
    UPDATE investor_positions
    SET current_value = current_value + ${d.yield_amount.toFixed(10)},
        updated_at = NOW()
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

    RAISE NOTICE 'Created YIELD tx for ${d.investor_name} in ${d.fund_code}: ${d.yield_amount.toFixed(8)}';
  ELSE
    RAISE WARNING 'Could not find investor "${d.investor_name}" or fund "${d.fund_code}"';
  END IF;
`);
  }
});

console.log(`
END $$;

-- Verify the results
SELECT
  COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') as investor,
  f.code as fund,
  ip.current_value,
  SUM(CASE WHEN t.type = 'YIELD' THEN t.amount ELSE 0 END) as total_yield
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND NOT t.is_voided
WHERE ip.current_value > 0
GROUP BY p.first_name, p.last_name, f.code, ip.current_value
ORDER BY f.code, investor;
`);

// Write output to file
const outputPath = "/Users/mama/indigo-yield-platform-v01/scripts/yield-distribution-output.json";
fs.writeFileSync(outputPath, JSON.stringify(yieldDistributions, null, 2));
console.log(`\nYield distribution data saved to: ${outputPath}`);
