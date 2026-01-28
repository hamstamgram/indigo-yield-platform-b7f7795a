/**
 * Calculate and Distribute Monthly Yields
 *
 * This script:
 * 1. Reads fund_performance data (periodic yield rates)
 * 2. Calculates each investor's yield based on their balance at each period
 * 3. Generates SQL to create monthly YIELD transactions with proper compounding
 */

const fs = require("fs");

// Load accounting data
const cleanData = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/clean_accounting_data.json", "utf8")
);
const investorsData = JSON.parse(
  fs.readFileSync("/Users/mama/Downloads/platform/platform_investors.json", "utf8")
);

// Fund code mapping
const currencyToFund = {
  BTC: "IND-BTC",
  ETH: "IND-ETH",
  USDT: "IND-USDT",
  SOL: "IND-SOL",
  XRP: "IND-XRP",
};

// Get fund performance data
const fundPerformance = cleanData.fund_performance || {};

// Get transactions and sort by date
const transactions = cleanData.transactions
  .map((tx) => ({
    ...tx,
    date: new Date(tx.date),
    currency: tx.currency || extractCurrency(tx.notes),
  }))
  .sort((a, b) => a.date - b.date);

function extractCurrency(notes) {
  if (!notes) return null;
  const match = notes.match(/Currency:\s*(\w+)/i);
  return match ? match[1] : null;
}

// Get fee structures from investor data
const feeStructures = {};
investorsData.investors.forEach((inv) => {
  feeStructures[inv.investor_id] = inv.fee_structures || {};
});

// Build investor balances over time
function buildInvestorBalances(currency) {
  const balances = {}; // investor_id -> array of {date, balance}
  const currencyTxs = transactions.filter((tx) => tx.currency === currency);

  // Get all unique investor IDs for this currency
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
        tx_type: tx.transaction_type,
        amount: tx.amount,
      });
    });

    balances[invId] = timeline;
  });

  return balances;
}

// Get investor balance at a specific date
function getBalanceAtDate(timeline, targetDate) {
  if (!timeline || timeline.length === 0) return 0;

  let lastBalance = 0;
  for (const entry of timeline) {
    if (entry.date > targetDate) break;
    lastBalance = entry.balance;
  }
  return lastBalance;
}

// Calculate yields for each performance period
function calculateYields(currency) {
  const perfData = fundPerformance[currency];
  if (!perfData || perfData.length === 0) {
    console.log(`No performance data for ${currency}`);
    return [];
  }

  const balances = buildInvestorBalances(currency);
  const investorIds = Object.keys(balances);

  if (investorIds.length === 0) {
    console.log(`No investors found for ${currency}`);
    return [];
  }

  const yieldDistributions = [];

  // For each performance period
  perfData.forEach((period, idx) => {
    const periodDate = new Date(period.date);
    const grossYieldRate = period.gross_performance || 0;
    const netYieldRate = period.net_performance || 0;

    if (grossYieldRate === 0) return;

    // Calculate each investor's yield for this period
    investorIds.forEach((invId) => {
      const timeline = balances[invId];
      const balanceAtPeriod = getBalanceAtDate(timeline, periodDate);

      if (balanceAtPeriod <= 0) return; // No balance, no yield

      // Get investor's fee rate
      const feeStructure = feeStructures[invId]?.[currency];
      const mgmtFee = feeStructure?.management_fee || 0.2; // Default 20%
      const ibFee = feeStructure?.ib_fee || 0;

      // Calculate gross yield amount
      const grossYield = balanceAtPeriod * grossYieldRate;

      // Apply fee to get net yield (investor keeps: gross * (1 - fee))
      const netYieldForInvestor = grossYield * (1 - mgmtFee);

      // IB gets: gross * ib_fee
      const ibCommission = grossYield * ibFee;

      // Platform gets: gross * (mgmt_fee - ib_fee)
      const platformFee = grossYield * (mgmtFee - ibFee);

      if (netYieldForInvestor > 0.00000001) {
        yieldDistributions.push({
          investor_id: invId,
          investor_name: getInvestorName(invId),
          currency,
          fund_code: currencyToFund[currency],
          period_date: period.date,
          balance_at_period: balanceAtPeriod,
          gross_yield_rate: grossYieldRate,
          net_yield_rate: netYieldRate,
          mgmt_fee_rate: mgmtFee,
          ib_fee_rate: ibFee,
          gross_yield: grossYield,
          net_yield: netYieldForInvestor,
          platform_fee: platformFee,
          ib_commission: ibCommission,
        });
      }

      // Update balance with yield (compounding)
      const timelineIdx = timeline.findIndex((t) => t.date >= periodDate);
      if (timelineIdx >= 0) {
        // Insert yield credit before next transaction
        for (let i = timelineIdx; i < timeline.length; i++) {
          timeline[i].balance += netYieldForInvestor;
        }
      } else {
        // Add to end
        timeline.push({
          date: periodDate,
          balance: balanceAtPeriod + netYieldForInvestor,
          tx_type: "yield",
          amount: netYieldForInvestor,
        });
      }
    });
  });

  return yieldDistributions;
}

function getInvestorName(invId) {
  const investor = investorsData.investors.find((i) => i.investor_id === invId);
  return investor?.name || invId;
}

// Calculate yields for all currencies
console.log("=== MONTHLY YIELD CALCULATIONS WITH COMPOUNDING ===\n");

const allYields = [];
["BTC", "ETH", "USDT", "SOL", "XRP"].forEach((currency) => {
  const yields = calculateYields(currency);
  allYields.push(...yields);
});

// Group by month for reporting
const monthlyTotals = {};
allYields.forEach((y) => {
  const monthKey = y.period_date.substring(0, 7); // YYYY-MM
  const key = `${monthKey}|${y.fund_code}`;
  if (!monthlyTotals[key]) {
    monthlyTotals[key] = {
      month: monthKey,
      fund: y.fund_code,
      grossYield: 0,
      netYield: 0,
      investors: 0,
    };
  }
  monthlyTotals[key].grossYield += y.gross_yield;
  monthlyTotals[key].netYield += y.net_yield;
  monthlyTotals[key].investors++;
});

console.log("Monthly Summary:");
console.log("| Month | Fund | Gross Yield | Net to Investors | # Distributions |");
console.log("|-------|------|-------------|------------------|-----------------|");
Object.values(monthlyTotals)
  .sort((a, b) => a.month.localeCompare(b.month) || a.fund.localeCompare(b.fund))
  .forEach((m) => {
    console.log(
      `| ${m.month} | ${m.fund} | ${m.grossYield.toFixed(8)} | ${m.netYield.toFixed(8)} | ${m.investors} |`
    );
  });

// Calculate total yield per investor
const investorTotals = {};
allYields.forEach((y) => {
  const key = `${y.investor_id}|${y.currency}`;
  if (!investorTotals[key]) {
    investorTotals[key] = {
      investor_id: y.investor_id,
      investor_name: y.investor_name,
      currency: y.currency,
      fund_code: y.fund_code,
      totalNetYield: 0,
      distributions: 0,
    };
  }
  investorTotals[key].totalNetYield += y.net_yield;
  investorTotals[key].distributions++;
});

console.log("\n\nTotal Yield Per Investor:");
console.log("| Investor | Fund | Total Net Yield | # Periods |");
console.log("|----------|------|-----------------|-----------|");
Object.values(investorTotals)
  .sort(
    (a, b) =>
      a.fund_code.localeCompare(b.fund_code) || a.investor_name.localeCompare(b.investor_name)
  )
  .forEach((i) => {
    console.log(
      `| ${i.investor_name.substring(0, 30).padEnd(30)} | ${i.fund_code} | ${i.totalNetYield.toFixed(8).padStart(15)} | ${i.distributions} |`
    );
  });

// Compare with expected positions from accounting
console.log("\n\n=== VERIFICATION: Calculated vs Accounting Expected ===\n");
const accountingPositions = {};
investorsData.investors.forEach((inv) => {
  Object.entries(inv.current_positions || {}).forEach(([currency, yieldPct]) => {
    accountingPositions[`${inv.investor_id}|${currency}`] = {
      investor_name: inv.name,
      currency,
      yield_pct: yieldPct,
    };
  });
});

console.log("| Investor | Currency | Calculated Yield | Expected % | Calculated % |");
console.log("|----------|----------|------------------|------------|--------------|");
Object.entries(investorTotals).forEach(([key, data]) => {
  const acct = accountingPositions[key];
  if (acct) {
    // Get total deposits for this investor/currency to calculate percentage
    const invTxs = transactions.filter(
      (tx) => tx.investor_id === data.investor_id && tx.currency === data.currency
    );
    const totalDeposits = invTxs
      .filter((tx) => tx.transaction_type === "deposit")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const calculatedPct = totalDeposits > 0 ? data.totalNetYield / totalDeposits : 0;

    console.log(
      `| ${data.investor_name.substring(0, 25).padEnd(25)} | ${data.currency.padEnd(8)} | ${data.totalNetYield.toFixed(8).padStart(16)} | ${(acct.yield_pct * 100).toFixed(4).padStart(10)}% | ${(calculatedPct * 100).toFixed(4).padStart(10)}% |`
    );
  }
});

// Generate SQL for distribution
console.log("\n\n=== SQL TO CREATE YIELD TRANSACTIONS ===\n");

// Group yields by investor/fund/month for cleaner distributions
const groupedYields = {};
allYields.forEach((y) => {
  const monthKey = y.period_date.substring(0, 7);
  const key = `${y.investor_id}|${y.fund_code}|${monthKey}`;
  if (!groupedYields[key]) {
    groupedYields[key] = {
      investor_id: y.investor_id,
      investor_name: y.investor_name,
      fund_code: y.fund_code,
      month: monthKey,
      total_gross: 0,
      total_net: 0,
      total_platform_fee: 0,
      total_ib_commission: 0,
      periods: [],
    };
  }
  groupedYields[key].total_gross += y.gross_yield;
  groupedYields[key].total_net += y.net_yield;
  groupedYields[key].total_platform_fee += y.platform_fee;
  groupedYields[key].total_ib_commission += y.ib_commission;
  groupedYields[key].periods.push(y.period_date);
});

// Write SQL
const sqlStatements = [];
sqlStatements.push(`
-- Monthly Yield Distribution Script
-- Generated from accounting data with compounding
-- Run this to create YIELD transactions for all investors

DO $$
DECLARE
  v_fund_id UUID;
  v_investor_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get admin ID for created_by
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'nathanael@indigo.fund' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  END IF;
`);

Object.values(groupedYields).forEach((g) => {
  if (g.total_net > 0.00000001) {
    const txDate = `${g.month}-28`; // Use end of month
    sqlStatements.push(`
  -- ${g.investor_name} - ${g.fund_code} - ${g.month}
  SELECT id INTO v_fund_id FROM funds WHERE code = '${g.fund_code}';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%${g.investor_name.toLowerCase().replace(/'/g, "''")}%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%${g.investor_name.replace(/'/g, "''")}%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '${g.month}-01'::date
        AND tx_date < ('${g.month}-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', ${g.total_net.toFixed(10)},
        '${txDate}'::date, '${txDate}'::date,
        'COMPLETED', 'Monthly yield distribution for ${g.month}',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + ${g.total_net.toFixed(10)},
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for ${g.investor_name} in ${g.fund_code} for ${g.month}: ${g.total_net.toFixed(8)}';
    ELSE
      RAISE NOTICE 'YIELD already exists for ${g.investor_name} in ${g.fund_code} for ${g.month}';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "${g.investor_name}" or fund "${g.fund_code}"';
  END IF;
`);
  }
});

sqlStatements.push(`
END $$;

-- Verify results
SELECT
  COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') as investor,
  f.code as fund,
  ip.current_value as position,
  (SELECT SUM(amount) FROM transactions_v2 WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND type = 'YIELD' AND NOT is_voided) as total_yield
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE ip.current_value > 0
ORDER BY f.code, investor;
`);

// Write SQL to file
const sqlPath = "/Users/mama/indigo-yield-platform-v01/scripts/distribute-monthly-yields.sql";
fs.writeFileSync(sqlPath, sqlStatements.join("\n"));
console.log(`SQL written to: ${sqlPath}`);

// Also write JSON output
const outputPath = "/Users/mama/indigo-yield-platform-v01/scripts/monthly-yield-calculations.json";
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      allYields,
      monthlyTotals: Object.values(monthlyTotals),
      investorTotals: Object.values(investorTotals),
      groupedYields: Object.values(groupedYields),
    },
    null,
    2
  )
);
console.log(`JSON output written to: ${outputPath}`);
