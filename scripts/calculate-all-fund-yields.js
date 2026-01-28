/**
 * Calculate Monthly Yields for ALL Funds
 *
 * Parses the Excel Performance sheet to get monthly net performance
 * for BTC, ETH, USDT, SOL, XRP and calculates investor yields.
 */

const fs = require("fs");
const XLSX = require("xlsx");

// Excel serial number to JS date
function excelDateToJS(serial) {
  // Excel epoch is January 1, 1900, but JS Date epoch is January 1, 1970
  // Excel also incorrectly treats 1900 as a leap year, so we need to adjust
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

// Load the main Excel file
const workbook = XLSX.readFile("/Users/mama/Downloads/Accounting Yield Funds.xlsx");

// Parse Performances sheet
const perfSheet = workbook.Sheets["Performances"];
const perfData = XLSX.utils.sheet_to_json(perfSheet, { header: 1 });

// Extract monthly performance data
// Row structure (after header rows):
// [date_serial, btc_net, eth_net, usdt_net, sol_net, xrp_net, ...]
const monthlyPerformance = [];

// Skip header rows, start from row 4 (index 3)
for (let i = 3; i < perfData.length; i++) {
  const row = perfData[i];
  if (!row || !row[0] || typeof row[0] !== "number") continue;

  const dateSerial = row[0];
  const date = excelDateToJS(dateSerial);

  // Skip if date is invalid or in the future
  if (isNaN(date.getTime()) || date > new Date()) continue;

  const btcNet = row[1] || 0;
  const ethNet = row[2] || 0;
  const usdtNet = row[3] || 0;
  const solNet = row[4] || 0;
  const xrpNet = row[5] || 0;

  // Only add if there's actual performance data
  if (btcNet || ethNet || usdtNet || solNet || xrpNet) {
    monthlyPerformance.push({
      date: date.toISOString().split("T")[0],
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      BTC: btcNet,
      ETH: ethNet,
      USDT: usdtNet,
      SOL: solNet,
      XRP: xrpNet,
    });
  }
}

console.log("=== MONTHLY FUND PERFORMANCE DATA ===\n");
console.log("| Month | BTC Net | ETH Net | USDT Net | SOL Net | XRP Net |");
console.log("|-------|---------|---------|----------|---------|---------|");
monthlyPerformance.forEach((p) => {
  console.log(
    `| ${p.month} | ${(p.BTC * 100).toFixed(4)}% | ${(p.ETH * 100).toFixed(4)}% | ${(p.USDT * 100).toFixed(4)}% | ${(p.SOL * 100).toFixed(4)}% | ${(p.XRP * 100).toFixed(4)}% |`
  );
});

// Load accounting transactions
const cleanData = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/clean_accounting_data.json", "utf8")
);
const investorsData = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/platform_investors.json", "utf8")
);

// Get fee structures
const feeStructures = {};
investorsData.investors.forEach((inv) => {
  feeStructures[inv.investor_id] = inv.fee_structures || {};
});

// Parse transactions
const transactions = cleanData.transactions
  .map((tx) => ({
    ...tx,
    date: new Date(tx.date),
    currency: tx.currency,
  }))
  .sort((a, b) => a.date - b.date);

// Build investor balances over time for each currency
function buildInvestorBalances(currency) {
  const balances = {};
  const currencyTxs = transactions.filter((tx) => tx.currency === currency);

  const investorIds = [...new Set(currencyTxs.map((tx) => tx.investor_id))];

  investorIds.forEach((invId) => {
    const invTxs = currencyTxs.filter((tx) => tx.investor_id === invId);
    let runningBalance = 0;
    const timeline = [];

    invTxs.forEach((tx) => {
      if (tx.transaction_type === "deposit") {
        runningBalance += tx.amount;
      } else if (tx.transaction_type === "withdrawal") {
        runningBalance -= tx.amount;
      }
      timeline.push({
        date: tx.date,
        balance: runningBalance,
      });
    });

    balances[invId] = timeline;
  });

  return balances;
}

// Get balance at specific date
function getBalanceAtDate(timeline, targetDate) {
  if (!timeline || timeline.length === 0) return 0;

  let lastBalance = 0;
  for (const entry of timeline) {
    if (entry.date > targetDate) break;
    lastBalance = entry.balance;
  }
  return Math.max(0, lastBalance);
}

// Get investor name
function getInvestorName(invId) {
  const investor = investorsData.investors.find((i) => i.investor_id === invId);
  return investor?.name || invId;
}

// Currency to fund code mapping
const currencyToFund = {
  BTC: "IND-BTC",
  ETH: "IND-ETH",
  USDT: "IND-USDT",
  SOL: "IND-SOL",
  XRP: "IND-XRP",
};

// Calculate yields for all currencies
const allYields = [];
const currencies = ["BTC", "ETH", "USDT", "SOL", "XRP"];

currencies.forEach((currency) => {
  const balances = buildInvestorBalances(currency);
  const investorIds = Object.keys(balances);

  if (investorIds.length === 0) {
    console.log(`\nNo investors found for ${currency}`);
    return;
  }

  // For each month with performance data
  monthlyPerformance.forEach((period) => {
    const netPerfRate = period[currency];
    if (!netPerfRate || netPerfRate <= 0) return;

    const periodDate = new Date(period.date);

    // Calculate each investor's yield
    investorIds.forEach((invId) => {
      const timeline = balances[invId];
      const balance = getBalanceAtDate(timeline, periodDate);

      if (balance <= 0) return;

      // Get fee structure - the performance rate is already NET (after platform fees)
      // So investor gets: balance * netPerfRate * (1 - their_mgmt_fee_share)
      // Actually, looking at the accounting, the net performance is what the FUND earned
      // Each investor then pays their individual fee on their share
      const feeStructure = feeStructures[invId]?.[currency];
      const mgmtFee = feeStructure?.management_fee || 0.2;

      // Gross yield for this investor
      const grossYield = (balance * netPerfRate) / (1 - 0.2); // Reverse the default 20% to get gross

      // Net yield after their specific fee
      const netYield = grossYield * (1 - mgmtFee);

      if (netYield > 0.00000001) {
        allYields.push({
          investor_id: invId,
          investor_name: getInvestorName(invId),
          currency,
          fund_code: currencyToFund[currency],
          month: period.month,
          period_date: period.date,
          balance,
          fund_net_rate: netPerfRate,
          mgmt_fee: mgmtFee,
          gross_yield: grossYield,
          net_yield: netYield,
        });

        // Compound: add yield to balance for future periods
        const lastEntry = timeline[timeline.length - 1];
        if (lastEntry) {
          // Add yield event
          timeline.push({
            date: new Date(periodDate.getTime() + 1000), // 1 second after
            balance: lastEntry.balance + netYield,
          });
        }
      }
    });
  });
});

// Group by investor/fund/month
const groupedYields = {};
allYields.forEach((y) => {
  const key = `${y.investor_id}|${y.fund_code}|${y.month}`;
  if (!groupedYields[key]) {
    groupedYields[key] = {
      investor_id: y.investor_id,
      investor_name: y.investor_name,
      fund_code: y.fund_code,
      currency: y.currency,
      month: y.month,
      total_net: 0,
    };
  }
  groupedYields[key].total_net += y.net_yield;
});

// Calculate totals per investor
const investorTotals = {};
Object.values(groupedYields).forEach((g) => {
  const key = `${g.investor_id}|${g.fund_code}`;
  if (!investorTotals[key]) {
    investorTotals[key] = {
      investor_id: g.investor_id,
      investor_name: g.investor_name,
      fund_code: g.fund_code,
      currency: g.currency,
      total_yield: 0,
      months: 0,
    };
  }
  investorTotals[key].total_yield += g.total_net;
  investorTotals[key].months++;
});

console.log("\n\n=== TOTAL YIELD PER INVESTOR ===\n");
console.log("| Investor | Fund | Total Net Yield | Months |");
console.log("|----------|------|-----------------|--------|");
Object.values(investorTotals)
  .sort(
    (a, b) =>
      a.fund_code.localeCompare(b.fund_code) || a.investor_name.localeCompare(b.investor_name)
  )
  .forEach((i) => {
    console.log(
      `| ${i.investor_name.substring(0, 30).padEnd(30)} | ${i.fund_code} | ${i.total_yield.toFixed(8).padStart(15)} | ${i.months} |`
    );
  });

// Verify against accounting expected yields
console.log("\n\n=== VERIFICATION VS ACCOUNTING ===\n");
const accountingYields = {};
investorsData.investors.forEach((inv) => {
  Object.entries(inv.current_positions || {}).forEach(([currency, yieldPct]) => {
    accountingYields[`${inv.investor_id}|${currency}`] = {
      name: inv.name,
      yield_pct: yieldPct,
    };
  });
});

console.log("| Investor | Currency | Calculated | Expected % | Deposits | Calc % |");
console.log("|----------|----------|------------|------------|----------|--------|");
Object.values(investorTotals).forEach((inv) => {
  const acct = accountingYields[`${inv.investor_id}|${inv.currency}`];
  if (acct) {
    // Get total deposits
    const invTxs = transactions.filter(
      (tx) => tx.investor_id === inv.investor_id && tx.currency === inv.currency
    );
    const totalDeposits = invTxs
      .filter((tx) => tx.transaction_type === "deposit")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const calcPct = totalDeposits > 0 ? inv.total_yield / totalDeposits : 0;

    console.log(
      `| ${inv.investor_name.substring(0, 25).padEnd(25)} | ${inv.currency.padEnd(8)} | ${inv.total_yield.toFixed(6).padStart(10)} | ${(acct.yield_pct * 100).toFixed(4).padStart(10)}% | ${totalDeposits.toFixed(2).padStart(8)} | ${(calcPct * 100).toFixed(4).padStart(6)}% |`
    );
  }
});

// Generate SQL
console.log("\n\n=== GENERATING SQL ===\n");

const sqlStatements = [];
sqlStatements.push(`
-- ============================================
-- MONTHLY YIELD DISTRIBUTION SQL
-- Generated from accounting Excel data
-- ============================================

DO $$
DECLARE
  v_fund_id UUID;
  v_investor_id UUID;
  v_admin_id UUID;
  v_tx_count INT := 0;
BEGIN
  -- Get admin ID
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'nathanael@indigo.fund' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  END IF;
`);

Object.values(groupedYields)
  .filter((g) => g.total_net > 0.00000001)
  .sort((a, b) => a.month.localeCompare(b.month))
  .forEach((g) => {
    const txDate = `${g.month}-28`;
    const safeName = g.investor_name.replace(/'/g, "''").replace(/\u00a0/g, " ");

    sqlStatements.push(`
  -- ${g.investor_name} - ${g.fund_code} - ${g.month}: ${g.total_net.toFixed(8)}
  SELECT id INTO v_fund_id FROM funds WHERE code = '${g.fund_code}';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%${safeName}%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '${g.month}-01'::date
        AND tx_date < ('${g.month}-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', ${g.total_net.toFixed(10)},
        '${txDate}'::date, '${txDate}'::date,
        'COMPLETED', 'Monthly yield for ${g.month}', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + ${g.total_net.toFixed(10)}, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;
`);
  });

sqlStatements.push(`
  RAISE NOTICE 'Created % YIELD transactions', v_tx_count;
END $$;

-- Verification query
SELECT
  COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') as investor,
  f.code as fund,
  ip.current_value as position,
  COALESCE((SELECT SUM(amount) FROM transactions_v2
    WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type = 'YIELD' AND NOT is_voided), 0) as total_yield,
  COALESCE((SELECT SUM(amount) FROM transactions_v2
    WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type = 'DEPOSIT' AND NOT is_voided), 0) as total_deposits
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE ip.current_value > 0
ORDER BY f.code, investor;
`);

const sqlPath = "/Users/mama/indigo-yield-platform-v01/scripts/distribute-all-yields.sql";
fs.writeFileSync(sqlPath, sqlStatements.join("\n"));
console.log(`SQL written to: ${sqlPath}`);

// Summary
const fundSummary = {};
Object.values(groupedYields).forEach((g) => {
  if (!fundSummary[g.fund_code]) {
    fundSummary[g.fund_code] = { yield: 0, count: 0 };
  }
  fundSummary[g.fund_code].yield += g.total_net;
  fundSummary[g.fund_code].count++;
});

console.log("\n=== SUMMARY BY FUND ===");
Object.entries(fundSummary).forEach(([fund, data]) => {
  console.log(`${fund}: ${data.yield.toFixed(6)} total yield across ${data.count} distributions`);
});
