const fs = require("fs");
const path = require("path");

// Load data
const balances = require("./fund-balances.json");
const transactions = require("./transactions.json");

// Name mapping: spreadsheet name -> platform name
const NAME_MAP = {
  "ALOK PAVAN BATRA": "Alok Pavan Batra",
  "Bo De kriek": "Bo De Kriek",
  "Pierre Bezençon": "Pierre Bezencon",
  "INDIGO Fees": "Indigo Fees",
  "danielle Richetta": "Danielle Richetta",
};

// Profile IDs (platform)
const PROFILE_IDS = {
  "Adriel Cohen": "a16a7e50-fefd-4bfe-897c-d16279b457c2",
  "Advantage Blockchain": "3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc",
  "Alain Bensimon": "20396ec2-c919-46ef-b3a3-8005a8a34bd3",
  "Alec Beckman": "5fc170e2-7a07-4f32-991f-d8b6deec277c",
  "Alex Jacobs": "d681a28c-bb59-4bb7-bf34-ab23910596df",
  "Alok Pavan Batra": "bd8ba788-4d65-4cb8-8b7b-784b3156baf7",
  "Anne Cecile Noique": "64cb831a-3365-4a89-9369-620ab7a1ff26",
  "Babak Eftekhari": "cdcccf6e-32f9-475a-9f88-34272ca3e64b",
  Blondish: "529cac24-615c-4408-b683-2c4ab635d6fd",
  "Bo De Kriek": "98dd4ff5-b5cb-4257-a501-aa25a6d638c5",
  "Brandon Hood": "a00073d1-f37d-4e21-a54b-1b55df17e85a",
  "Daniele Francilia": "d1f39136-4d87-4e7f-8885-a413c21d9a56",
  "Danielle Richetta": "e134e0df-d4e7-49c4-80b3-4ef37af6bebf",
  "Dario Deiana": "bb655a37-9e91-4166-b575-cafbbbb8c200",
  HALLEY86: "32d75475-0b78-4b7b-925a-e9429f6fe66d",
  "Hammadou Monoja": "e6857414-ae66-4cfe-905e-c2f611ba6083",
  "INDIGO DIGITAL ASSET FUND LP": "d91f3eb7-bd47-4c42-ab4f-c4f20fb41b13",
  "Indigo Fees": "b464a3f7-60d5-4bc0-9833-7b413bcc6cae",
  "INDIGO Ventures": "3d606d2e-28cf-41e7-96f2-aeb52551c053",
  "Joel Barbeau": "99e56523-32a6-43e5-b9b3-789992cc347c",
  "Jose Molla": "172d6461-f6cb-4457-a8c3-75c978cc12be",
  "Julien Grunebaum": "7fdedf56-e838-45ea-91f8-6e441810c761",
  Kabbaj: "f917cd8b-2d12-428c-ae3c-210b7ee3ae75",
  "Kyle Gulamerian": "b4f5d56b-b128-4799-b805-d34264165f45",
  "Lars Ahlgreen": "9405071c-0b52-4399-85da-9f1ba9b289c1",
  "Matthew Beatty": "24f3054e-a125-4954-8861-55aa617cbb2c",
  "Matthias Reiser": "d8643c68-7045-458a-b105-a41f56085c55",
  "Monica Levy Chicheportiche": "c85bddf5-7720-47a5-8336-669ea604b94b",
  "Nathanaël Cohen": "ed91c89d-23de-4981-b6b7-60e13f1a6767",
  "Nath & Thomas": "99e5a116-44ba-4a45-9f56-5877b235f960",
  "NSVO Holdings": "114164b0-1aba-4b40-9abc-8d72adfdc60a",
  "Oliver Loisel": "fbf8e2f4-7c5d-4496-a486-f0d8e88cc794",
  "Paul Johnson": "d1f8c666-58c5-4a83-a5c6-0f66a380aaf2",
  "Pierre Bezencon": "511991c7-93a2-4d2b-b42a-43120d58f672",
  "Ryan Van Der Wall": "f462d9e5-7363-4c82-a144-4e694d2b55da",
  "Sacha Oshry": "d5719d57-5308-4b9d-8a4f-a9a8aa596af4",
  "Sam Johnson": "2f7b8bb2-6a60-4fc9-953d-b9fae44337c1",
  "Terance Chen": "3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c",
  "Thomas Puech": "44801beb-4476-4a9b-9751-4e70267f6953",
  "Tomer Mazar": "bf0f3364-c008-4e2e-aec9-c55f1832eedb",
  "Tomer Zur": "82f58ac0-2d34-4c00-b0df-34383c1d1dfd",
  "Valeria Cruz": "e9bbc28b-5d8d-410c-940b-b37a54a726e0",
  "Ventures Life Style": "7d049f7f-b77f-4650-b772-6a8806f00103",
  "Victoria Pariente-Cohen": "249f4ab3-3433-4d81-ac92-1531b3573a50",
  "Vivie & Liana": "981dd85c-35c8-4254-a3e9-27c2af302815",
};

const FUND_IDS = {
  BTC: "0a048d9b-c4cf-46eb-b428-59e10307df93",
  ETH: "717614a2-9e24-4abc-a89d-02209a3a772a",
  SOL: "7574bc81-aab3-4175-9e7f-803aa6f9eb8f",
  USDT: "8ef9dc49-e76c-4882-84ab-a449ef4326db",
  XRP: "2c123c4f-76b4-4504-867e-059649855417",
};

const ADMIN_ID = "a16a7e50-fefd-4bfe-897c-d16279b457c2";

// Currency to fund mapping for transactions
const CURRENCY_TO_FUND = {
  BTC: "BTC",
  "BTC Boost": "BTC",
  "BTC BOOST": "BTC",
  "BTC TAC": "BTC",
  ETH: "ETH",
  "ETH TAC": "ETH",
  SOL: "SOL",
  USDT: "USDT",
  XRP: "XRP",
};

function lastDayOfMonth(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeInvestorName(name) {
  // Replace non-breaking spaces (char 160) with regular spaces
  const cleaned = name.replace(/\u00A0/g, " ");
  return NAME_MAP[cleaned] || cleaned;
}

function main() {
  // Step 1: Build ending balances per investor-fund-month (last entry wins)
  const endingBalances = {}; // key: "fund|investor|month" -> balance
  for (const entry of balances) {
    const investor = normalizeInvestorName(entry.investor);
    const key = `${entry.fund}|${investor}|${entry.month}`;
    endingBalances[key] = entry.balance; // last entry wins
  }

  // Step 2: Build flows per investor-fund-month from transactions.json
  const flows = {}; // key: "fund|investor|month" -> net flow
  for (const tx of transactions) {
    const fund = CURRENCY_TO_FUND[tx.currency];
    if (!fund) {
      console.error(`Unknown currency: ${tx.currency}`);
      continue;
    }
    const investor = normalizeInvestorName(tx.investor);
    const month = tx.date.substring(0, 7); // "2024-07"
    const key = `${fund}|${investor}|${month}`;
    const amount = tx.type === "DEPOSIT" ? tx.amount : -tx.amount;
    flows[key] = (flows[key] || 0) + amount;
  }

  // Step 3: Get sorted list of all months
  const allMonths = [...new Set(balances.map((b) => b.month))].sort();
  console.log(`Months: ${allMonths.join(", ")}`);

  // Step 4: For each investor-fund, compute yield per month
  // Get all investor-fund pairs
  const investorFundPairs = new Set();
  for (const entry of balances) {
    const investor = normalizeInvestorName(entry.investor);
    investorFundPairs.add(`${entry.fund}|${investor}`);
  }

  // Step 4b: Find first and last month per investor-fund pair in fund-balances.json
  const firstMonthPerPair = {};
  const lastMonthPerPair = {};
  const monthsPerPair = {}; // sorted list of months with entries per investor-fund
  for (const entry of balances) {
    const investor = normalizeInvestorName(entry.investor);
    const key = `${entry.fund}|${investor}`;
    if (!firstMonthPerPair[key] || entry.month < firstMonthPerPair[key]) {
      firstMonthPerPair[key] = entry.month;
    }
    if (!lastMonthPerPair[key] || entry.month > lastMonthPerPair[key]) {
      lastMonthPerPair[key] = entry.month;
    }
    if (!monthsPerPair[key]) monthsPerPair[key] = new Set();
    monthsPerPair[key].add(entry.month);
  }
  // Convert to sorted arrays
  for (const key of Object.keys(monthsPerPair)) {
    monthsPerPair[key] = [...monthsPerPair[key]].sort();
  }

  // Step 4c: Compute initial balance per investor-fund from transactions BEFORE allMonths range
  // Only count transactions that are completely outside the allMonths range (before the very first month).
  // Transactions within allMonths but before an investor's first balance entry are handled by the
  // skipped-month flow accumulation in the main loop.
  const initialBalance = {}; // key: "fund|investor" -> sum of pre-allMonths DEP/WD
  for (const tx of transactions) {
    const fund = CURRENCY_TO_FUND[tx.currency];
    if (!fund) continue;
    const investor = normalizeInvestorName(tx.investor);
    const key = `${fund}|${investor}`;
    const txMonth = tx.date.substring(0, 7);
    // Only count flows completely before the range of months in fund-balances.json
    if (txMonth < allMonths[0]) {
      const amount = tx.type === "DEPOSIT" ? tx.amount : -tx.amount;
      initialBalance[key] = (initialBalance[key] || 0) + amount;
    }
  }

  // Log initial balances
  for (const [key, bal] of Object.entries(initialBalance)) {
    if (Math.abs(bal) > 0.001) {
      console.log(`  Initial balance for ${key}: ${bal.toFixed(10)} (pre-range DEP/WD)`);
    }
  }

  const yieldEntries = [];
  let totalYieldCount = 0;
  let zeroYieldCount = 0;

  for (const pair of investorFundPairs) {
    const [fund, investor] = pair.split("|");

    if (!PROFILE_IDS[investor]) {
      console.error(`No profile ID for investor: "${investor}"`);
      continue;
    }
    if (!FUND_IDS[fund]) {
      console.error(`No fund ID for fund: "${fund}"`);
      continue;
    }

    // Start with pre-first-month balance (from DEP/WD before first balance entry)
    let prevBalance = initialBalance[pair] || 0;

    // Pre-compute: check if this investor-fund has a Feb 2026 balance entry
    const hasFeb2026 = endingBalances[`${fund}|${investor}|2026-02`] !== undefined;
    const investorMonthList = monthsPerPair[pair] || [];

    for (const month of allMonths) {
      const balKey = `${fund}|${investor}|${month}`;
      const endBalance = endingBalances[balKey];

      // If this investor has no entry for this month, accumulate any flows
      // into prevBalance so they don't get double-counted as yield later
      if (endBalance === undefined) {
        const flowKey2 = `${fund}|${investor}|${month}`;
        const skippedFlows = flows[flowKey2] || 0;
        if (skippedFlows !== 0) {
          prevBalance += skippedFlows;
          // If a withdrawal in a skipped month pushed balance negative,
          // generate a "fill" yield to bring balance back to 0.
          // This represents yield earned before the withdrawal.
          if (prevBalance < -0.000001) {
            const fillYield = -prevBalance;
            yieldEntries.push({
              fund,
              investor,
              investorId: PROFILE_IDS[investor],
              fundId: FUND_IDS[fund],
              month,
              txDate: lastDayOfMonth(month),
              amount: fillYield,
              endBalance: 0,
              prevBalance: prevBalance + fillYield,
              flows: skippedFlows,
              exitFill: true,
            });
            totalYieldCount++;
            console.log(
              `  EXIT FILL: ${investor} ${fund} ${month}: fill_yield=${fillYield.toFixed(10)} (skipped month withdrawal)`
            );
            prevBalance = 0;
          }
        }
        continue;
      }

      const flowKey = `${fund}|${investor}|${month}`;
      const monthFlows = flows[flowKey] || 0;

      // yield = ending_balance - starting_balance - flows
      let yieldAmount = endBalance - prevBalance - monthFlows;

      // EXIT DETECTION - only for investors WITHOUT a Feb 2026 balance entry.
      // Investors WITH Feb 2026 entries always use normal yield formula.
      const isLastMonth = month === lastMonthPerPair[pair];
      const nextMonthIdx = investorMonthList.indexOf(month);
      const nextEntryMonth =
        nextMonthIdx >= 0 && nextMonthIdx < investorMonthList.length - 1
          ? investorMonthList[nextMonthIdx + 1]
          : null;

      if (!hasFeb2026 && (isLastMonth || nextEntryMonth)) {
        const balanceAfterFlows = prevBalance + monthFlows;

        // Check for gap after current month (next entry > 2 months away)
        const hasGapAfter =
          nextEntryMonth &&
          (() => {
            const [y1, m1] = month.split("-").map(Number);
            const [y2, m2] = nextEntryMonth.split("-").map(Number);
            return y2 * 12 + m2 - (y1 * 12 + m1) > 2;
          })();

        // Case 1: Intermediate exit - large withdrawal followed by gap in balance entries
        const isIntermediateExit =
          hasGapAfter && monthFlows < -0.3 * Math.max(prevBalance, 0.001) && yieldAmount > 0.1;

        // Case 2: Final exit - last month, with withdrawal
        const isFinalExit = isLastMonth && monthFlows < -0.01;

        // Case 3: Final exit - last month, prevBalance near 0 (re-entry then exit)
        const isReentryExit =
          isLastMonth &&
          Math.abs(prevBalance) < 0.01 &&
          yieldAmount > 0.5 * Math.max(Math.abs(endBalance), 0.01);

        if (isIntermediateExit || isFinalExit || isReentryExit) {
          const exitYield = Math.max(0, -balanceAfterFlows);
          console.log(
            `  EXIT: ${investor} ${fund} ${month}: prevBal=${prevBalance.toFixed(10)}, flows=${monthFlows.toFixed(10)}, origYield=${yieldAmount.toFixed(10)}, exitYield=${exitYield.toFixed(10)}`
          );
          yieldAmount = exitYield;
          if (Math.abs(yieldAmount) > 0.000000001) {
            yieldEntries.push({
              fund,
              investor,
              investorId: PROFILE_IDS[investor],
              fundId: FUND_IDS[fund],
              month,
              txDate: lastDayOfMonth(month),
              amount: yieldAmount,
              endBalance: 0,
              prevBalance,
              flows: monthFlows,
              exitOverride: true,
            });
            totalYieldCount++;
          } else {
            zeroYieldCount++;
          }
          prevBalance = 0;
          continue;
        }
      }

      if (Math.abs(yieldAmount) > 0.000000001) {
        yieldEntries.push({
          fund,
          investor,
          investorId: PROFILE_IDS[investor],
          fundId: FUND_IDS[fund],
          month,
          txDate: lastDayOfMonth(month),
          amount: yieldAmount,
          endBalance,
          prevBalance,
          flows: monthFlows,
        });
        totalYieldCount++;
      } else {
        zeroYieldCount++;
      }

      prevBalance = endBalance;
    }
  }

  console.log(`\nTotal yield entries: ${totalYieldCount}, zero-yield skipped: ${zeroYieldCount}`);

  // Sort by month, then fund, then investor
  yieldEntries.sort((a, b) => {
    if (a.month !== b.month) return a.month.localeCompare(b.month);
    if (a.fund !== b.fund) return a.fund.localeCompare(b.fund);
    return a.investor.localeCompare(b.investor);
  });

  // Print summary per month
  const monthSummary = {};
  for (const y of yieldEntries) {
    const key = `${y.month}|${y.fund}`;
    if (!monthSummary[key]) monthSummary[key] = { count: 0, total: 0 };
    monthSummary[key].count++;
    monthSummary[key].total += y.amount;
  }
  console.log("\nPer month-fund summary:");
  for (const [key, val] of Object.entries(monthSummary).sort()) {
    const [month, fund] = key.split("|");
    console.log(`  ${month} ${fund}: ${val.count} entries, total yield = ${val.total.toFixed(10)}`);
  }

  // Generate SQL
  let sql = `-- Direct yield seeding from spreadsheet balance progression
-- Generated at ${new Date().toISOString()}
-- Total yield entries: ${totalYieldCount}

-- Disable yield distribution guard trigger for bulk seeding
ALTER TABLE transactions_v2 DISABLE TRIGGER trg_enforce_yield_distribution_guard;

-- Set auth context and bypass guards
DO $$ BEGIN
  PERFORM set_config('request.jwt.claim.sub', '${ADMIN_ID}', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"${ADMIN_ID}","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
END; $$;

`;

  // Group entries by month for transactional consistency
  const entriesByMonth = {};
  for (const y of yieldEntries) {
    if (!entriesByMonth[y.month]) entriesByMonth[y.month] = [];
    entriesByMonth[y.month].push(y);
  }

  for (const month of allMonths) {
    const entries = entriesByMonth[month];
    if (!entries || entries.length === 0) continue;

    sql += `-- ================================================\n`;
    sql += `-- Month: ${month} (${entries.length} yield entries)\n`;
    sql += `-- ================================================\n`;
    sql += `DO $$\nDECLARE\n  v_tx_id uuid;\nBEGIN\n`;
    sql += `  PERFORM set_config('request.jwt.claim.sub', '${ADMIN_ID}', true);\n`;
    sql += `  PERFORM set_config('request.jwt.claims', '{"sub":"${ADMIN_ID}","role":"authenticated"}', true);\n`;
    sql += `  PERFORM set_config('indigo.canonical_rpc', 'true', true);\n\n`;

    for (const y of entries) {
      const refId = `spreadsheet-yield-${y.fund}-${month}-${y.investor.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}`;
      const asset = y.fund;

      sql += `  -- ${y.investor} ${y.fund}: prev=${y.prevBalance.toFixed(10)}, flows=${y.flows.toFixed(10)}, yield=${y.amount.toFixed(10)}, end=${y.endBalance.toFixed(10)}\n`;
      sql += `  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)\n`;
      sql += `  VALUES (\n`;
      sql += `    '${y.investorId}'::uuid,\n`;
      sql += `    '${y.fundId}'::uuid,\n`;
      sql += `    'YIELD'::tx_type,\n`;
      sql += `    ${y.amount.toFixed(10)},\n`;
      sql += `    '${y.txDate}'::date,\n`;
      sql += `    '${refId}',\n`;
      sql += `    'yield_distribution'::tx_source,\n`;
      sql += `    '${asset}'::asset_code,\n`;
      sql += `    'reporting'::aum_purpose,\n`;
      sql += `    'investor_visible'::visibility_scope\n`;
      sql += `  );\n\n`;
    }

    sql += `  RAISE NOTICE 'Month ${month}: inserted ${entries.length} yield transactions';\n`;
    sql += `END;\n$$;\n\n`;
  }

  // After all yields, set all positions active and recompute
  sql += `-- Recompute all positions and ensure they are active\n`;
  sql += `DO $$\nDECLARE\n  r RECORD;\n  cnt integer := 0;\nBEGIN\n`;
  sql += `  FOR r IN SELECT DISTINCT investor_id, fund_id FROM investor_positions\n`;
  sql += `  LOOP\n`;
  sql += `    PERFORM recompute_investor_position(\n`;
  sql += `      p_investor_id := r.investor_id,\n`;
  sql += `      p_fund_id := r.fund_id\n`;
  sql += `    );\n`;
  sql += `    cnt := cnt + 1;\n`;
  sql += `  END LOOP;\n`;
  sql += `  UPDATE investor_positions SET is_active = true WHERE is_active = false;\n`;
  sql += `  RAISE NOTICE 'Recomputed and activated % positions', cnt;\n`;
  sql += `END;\n$$;\n\n`;
  sql += `-- Re-enable yield distribution guard trigger\n`;
  sql += `ALTER TABLE transactions_v2 ENABLE TRIGGER trg_enforce_yield_distribution_guard;\n`;

  // Write output
  const outPath = path.join(__dirname, "seed-direct-yields.sql");
  fs.writeFileSync(outPath, sql);
  console.log(`\nSQL written to ${outPath} (${(sql.length / 1024).toFixed(1)} KB)`);
}

main();
