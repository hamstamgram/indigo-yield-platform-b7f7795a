/**
 * Extract all seeding data from INDIGO PLATFORM.xlsx
 *
 * Outputs:
 *   - investors.json   (master investor list with fees, IB mapping)
 *   - transactions.json (all historical deposits/withdrawals)
 *   - performance.json  (monthly gross performance by fund)
 *   - fund-balances.json (monthly balance per investor per fund for verification)
 *
 * Usage: npx tsx scripts/seed-data/extract-from-excel.ts
 */

import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";

const XLSX_PATH = "/Users/mama/Downloads/INDIGO PLATFORM.xlsx";
const OUTPUT_DIR = path.resolve(__dirname);

// Fund sheet names mapped to asset codes
const FUND_SHEETS: Record<string, string> = {
  "BTC Yield Fund": "BTC",
  "ETH Yield Fund": "ETH",
  "USDT Yield Fund": "USDT",
  "SOL Yield Fund": "SOL",
  "XRP Yield Fund": "XRP",
};

// Legacy/closed fund sheets (transfers treated as deposits into active funds)
const LEGACY_SHEETS = ["BTC Boost", "BTC TAC", "ETH TAC"];

// Known IB pairs (verified mathematically at 0.0% diff)
const IB_MAPPING: Record<string, { ibAccount: string; ibRate: number }> = {
  "Sam Johnson": { ibAccount: "Ryan Van Der Wall", ibRate: 4 },
  "Paul Johnson": { ibAccount: "Alex Jacobs", ibRate: 1.5 },
  "Babak Eftekhari": { ibAccount: "Lars Ahlgreen", ibRate: 2 },
  "Advantage Blockchain": { ibAccount: "Alec Beckman", ibRate: 2 },
  "Ventures Life Style": { ibAccount: "Joel Barbeau", ibRate: 4 },
};

// Platform/special accounts
const PLATFORM_ACCOUNTS = ["INDIGO DIGITAL ASSET FUND LP", "INDIGO Ventures"];
const FEES_ACCOUNT = "Indigo Fees";

// IB account names (auto-created from IB mapping)
const IB_ACCOUNTS = Object.values(IB_MAPPING).map((v) => v.ibAccount);

// Name normalization map (handle case variants, typos)
const NAME_ALIASES: Record<string, string> = {
  "sam johnson": "Sam Johnson",
  "Sam johnson": "Sam Johnson",
  "anne svensson": "Anne Svensson",
  "Anne svensson": "Anne Svensson",
  "paul johnson": "Paul Johnson",
  "Paul johnson": "Paul Johnson",
  "Nath & Thomas": "Nath & Thomas",
  "nath & thomas": "Nath & Thomas",
  "Nathanael Cohen": "Nathanael Cohen",
  "Thomas Puech": "Thomas Puech",
  "INDIGO DIGITAL ASSET FUND LP": "INDIGO DIGITAL ASSET FUND LP",
  "INDIGO Ventures": "INDIGO Ventures",
  "Indigo Fees": "Indigo Fees",
  "indigo fees": "Indigo Fees",
};

function normalizeName(name: string): string {
  const trimmed = name.trim();
  return NAME_ALIASES[trimmed] ?? trimmed;
}

function cellValue(cell: ExcelJS.Cell | undefined): string | number | null {
  if (!cell) return null;
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "result" in v) return (v as any).result;
  if (typeof v === "object" && "text" in v) return (v as any).text;
  return v as string | number;
}

function numVal(cell: ExcelJS.Cell | undefined): number {
  const v = cellValue(cell);
  if (v === null) return 0;
  if (typeof v === "number") return v;
  const parsed = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

function strVal(cell: ExcelJS.Cell | undefined): string {
  const v = cellValue(cell);
  if (v === null) return "";
  return String(v).trim();
}

interface InvestorRecord {
  name: string;
  accountType: "investor" | "ib" | "fees_account";
  feePct: number;
  ibPct: number;
  ibParent: string | null;
  email: string;
  fundsPresent: string[];
}

interface TransactionRecord {
  date: string;
  investor: string;
  currency: string;
  amount: number;
  usdValue: number | null;
  type: "DEPOSIT" | "WITHDRAWAL";
}

interface MonthlyPerformance {
  month: string; // YYYY-MM
  fund: string;
  grossPct: number;
  netPct: number;
  openingAum: number;
  closingAum: number;
  flows: number;
}

interface InvestorBalance {
  fund: string;
  month: string; // YYYY-MM from column header
  investor: string;
  balance: number;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  console.log("Sheets:", workbook.worksheets.map((ws) => ws.name).join(", "));

  const investors = new Map<string, InvestorRecord>();
  const transactions: TransactionRecord[] = [];
  const performance: MonthlyPerformance[] = [];
  const balances: InvestorBalance[] = [];

  // ================================================================
  // 1. PARSE FUND SHEETS (balance section + performance rows)
  // ================================================================
  for (const [sheetName, asset] of Object.entries(FUND_SHEETS)) {
    const ws = workbook.getWorksheet(sheetName);
    if (!ws) {
      console.warn(`Sheet "${sheetName}" not found, skipping`);
      continue;
    }

    console.log(`\n=== Parsing ${sheetName} (${asset}) ===`);

    // Find date columns (row 8 typically has dates)
    const headerRow = ws.getRow(8);
    const dateColumns: { col: number; date: string; label: string }[] = [];

    for (let col = 4; col <= ws.columnCount; col++) {
      const val = cellValue(headerRow.getCell(col));
      if (val !== null) {
        let dateStr = "";
        let label = String(val);
        if (val instanceof Date) {
          dateStr = val.toISOString().slice(0, 10);
          label = dateStr;
        } else if (typeof val === "number") {
          // Excel serial date
          const d = new Date((val - 25569) * 86400 * 1000);
          dateStr = d.toISOString().slice(0, 10);
          label = dateStr;
        } else {
          // Try parsing string date
          const d = new Date(String(val));
          if (!isNaN(d.getTime())) {
            dateStr = d.toISOString().slice(0, 10);
            label = dateStr;
          }
        }
        if (dateStr) {
          dateColumns.push({ col, date: dateStr, label });
        }
      }
    }
    console.log(`  Found ${dateColumns.length} date columns`);

    // Parse performance rows (rows 1-5)
    // Row 1: AUM Before, Row 2: Top Up/Withdrawals, Row 3: AUM After
    // Row 4: Gross Performance, Row 5: Net Performance
    for (const dc of dateColumns) {
      const aumBefore = numVal(ws.getRow(1).getCell(dc.col));
      const flows = numVal(ws.getRow(2).getCell(dc.col));
      const aumAfter = numVal(ws.getRow(3).getCell(dc.col));
      const grossPct = numVal(ws.getRow(4).getCell(dc.col));
      const netPct = numVal(ws.getRow(5).getCell(dc.col));

      if (aumBefore > 0 || aumAfter > 0) {
        const month = dc.date.slice(0, 7); // YYYY-MM
        performance.push({
          month,
          fund: asset,
          grossPct: grossPct * 100, // Convert from decimal to percentage if needed
          netPct: netPct * 100,
          openingAum: aumBefore,
          closingAum: aumAfter,
          flows,
        });
      }
    }

    // Parse investor balance section (rows 9 until "Total AUM")
    const col1Label = strVal(ws.getRow(9).getCell(1));
    console.log(`  First data row label: "${col1Label}"`);

    for (let row = 9; row <= ws.rowCount; row++) {
      const nameCell = strVal(ws.getRow(row).getCell(1));
      if (!nameCell) continue;
      if (
        nameCell.toLowerCase().includes("total aum") ||
        (nameCell.toLowerCase().includes("total") && nameCell.toLowerCase().includes("aum"))
      ) {
        console.log(`  Stopped at "Total AUM" marker (row ${row})`);
        break;
      }

      const name = normalizeName(nameCell);
      const feePct = numVal(ws.getRow(row).getCell(2)) * 100; // Column B: Fee%
      const ibPct = numVal(ws.getRow(row).getCell(3)) * 100; // Column C: IB%

      // Determine account type
      let accountType: "investor" | "ib" | "fees_account" = "investor";
      if (name === FEES_ACCOUNT) accountType = "fees_account";
      else if (IB_ACCOUNTS.includes(name)) accountType = "ib";

      // Get or create investor record
      if (!investors.has(name)) {
        const ibMapping = IB_MAPPING[name];
        investors.set(name, {
          name,
          accountType,
          feePct: Math.round(feePct * 100) / 100,
          ibPct: ibMapping ? ibMapping.ibRate : 0,
          ibParent: ibMapping ? ibMapping.ibAccount : null,
          email: generateEmail(name),
          fundsPresent: [],
        });
      }

      const inv = investors.get(name)!;
      if (!inv.fundsPresent.includes(asset)) {
        inv.fundsPresent.push(asset);
      }

      // Update fee if we see a non-zero value (some sheets may show 0 for first appearance)
      if (feePct > 0 && inv.feePct === 0) {
        inv.feePct = Math.round(feePct * 100) / 100;
      }

      // Extract balances for each date column
      for (const dc of dateColumns) {
        const balance = numVal(ws.getRow(row).getCell(dc.col));
        if (balance !== 0) {
          balances.push({
            fund: asset,
            month: dc.date.slice(0, 7),
            investor: name,
            balance,
          });
        }
      }
    }
  }

  // ================================================================
  // 2. PARSE INVESTMENTS SHEET (all transactions)
  // ================================================================
  const invSheet = workbook.getWorksheet("Investments");
  if (invSheet) {
    console.log("\n=== Parsing Investments sheet ===");

    // Find header row
    let headerRowNum = 1;
    for (let r = 1; r <= 5; r++) {
      const firstCell = strVal(invSheet.getRow(r).getCell(1)).toLowerCase();
      if (firstCell.includes("date") || firstCell.includes("investment")) {
        headerRowNum = r;
        break;
      }
    }

    // Map column indices
    const hRow = invSheet.getRow(headerRowNum);
    const colMap: Record<string, number> = {};
    for (let c = 1; c <= invSheet.columnCount; c++) {
      const header = strVal(hRow.getCell(c)).toLowerCase();
      if (header.includes("date")) colMap.date = c;
      if (header.includes("investor") || header.includes("name")) colMap.name = c;
      if (header.includes("currency") || header.includes("asset")) colMap.currency = c;
      if (header.includes("amount") && !header.includes("usd")) colMap.amount = c;
      if (header.includes("usd")) colMap.usd = c;
      if (header.includes("email")) colMap.email = c;
    }

    console.log(`  Header row: ${headerRowNum}, columns:`, colMap);

    for (let r = headerRowNum + 1; r <= invSheet.rowCount; r++) {
      const row = invSheet.getRow(r);
      const dateVal = cellValue(row.getCell(colMap.date ?? 1));
      if (!dateVal) continue;

      let dateStr = "";
      if (dateVal instanceof Date) {
        dateStr = dateVal.toISOString().slice(0, 10);
      } else if (typeof dateVal === "number") {
        const d = new Date((dateVal - 25569) * 86400 * 1000);
        dateStr = d.toISOString().slice(0, 10);
      } else {
        const d = new Date(String(dateVal));
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10);
        }
      }
      if (!dateStr) continue;

      const nameRaw = strVal(row.getCell(colMap.name ?? 2));
      if (!nameRaw) continue;
      const name = normalizeName(nameRaw);

      const currency = strVal(row.getCell(colMap.currency ?? 3)).toUpperCase();
      const amount = numVal(row.getCell(colMap.amount ?? 4));
      const usdValue = colMap.usd ? numVal(row.getCell(colMap.usd)) : null;

      if (amount === 0) continue;

      // Map currency to fund asset code
      let fundAsset = currency;
      if (currency === "STABLE" || currency === "USDT" || currency === "USDC") {
        fundAsset = "USDT";
      }

      transactions.push({
        date: dateStr,
        investor: name,
        currency: fundAsset,
        amount: Math.abs(amount),
        usdValue: usdValue || null,
        type: amount > 0 ? "DEPOSIT" : "WITHDRAWAL",
      });

      // Ensure investor exists in our map
      if (!investors.has(name)) {
        const ibMapping = IB_MAPPING[name];
        let accountType: "investor" | "ib" | "fees_account" = "investor";
        if (name === FEES_ACCOUNT) accountType = "fees_account";
        else if (IB_ACCOUNTS.includes(name)) accountType = "ib";

        investors.set(name, {
          name,
          accountType,
          feePct: 30, // Default
          ibPct: ibMapping ? ibMapping.ibRate : 0,
          ibParent: ibMapping ? ibMapping.ibAccount : null,
          email: generateEmail(name),
          fundsPresent: [fundAsset],
        });
      }
    }

    // Sort transactions chronologically
    transactions.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`  Extracted ${transactions.length} transactions`);
  }

  // ================================================================
  // 3. PARSE PERFORMANCES SHEET
  // ================================================================
  const perfSheet = workbook.getWorksheet("Performances");
  if (perfSheet) {
    console.log("\n=== Parsing Performances sheet ===");
    // Log first few rows to understand structure
    for (let r = 1; r <= Math.min(5, perfSheet.rowCount); r++) {
      const row = perfSheet.getRow(r);
      const cells: string[] = [];
      for (let c = 1; c <= Math.min(10, perfSheet.columnCount); c++) {
        cells.push(String(cellValue(row.getCell(c)) ?? ""));
      }
      console.log(`  Row ${r}: ${cells.join(" | ")}`);
    }
  }

  // ================================================================
  // 4. Ensure IB accounts and platform accounts are in the investor map
  // ================================================================
  for (const ibName of IB_ACCOUNTS) {
    if (!investors.has(ibName)) {
      investors.set(ibName, {
        name: ibName,
        accountType: "ib",
        feePct: 0,
        ibPct: 0,
        ibParent: null,
        email: generateEmail(ibName),
        fundsPresent: [],
      });
    }
  }

  for (const platName of PLATFORM_ACCOUNTS) {
    if (!investors.has(platName)) {
      investors.set(platName, {
        name: platName,
        accountType: "investor",
        feePct: 0,
        ibPct: 0,
        ibParent: null,
        email: generateEmail(platName),
        fundsPresent: [],
      });
    }
  }

  if (!investors.has(FEES_ACCOUNT)) {
    investors.set(FEES_ACCOUNT, {
      name: FEES_ACCOUNT,
      accountType: "fees_account",
      feePct: 0,
      ibPct: 0,
      ibParent: null,
      email: "fees@indigo.fund",
      fundsPresent: [],
    });
  }

  // ================================================================
  // 5. WRITE OUTPUT FILES
  // ================================================================

  const investorList = Array.from(investors.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Correct platform/special accounts to 0% fee
  for (const inv of investorList) {
    if (
      PLATFORM_ACCOUNTS.includes(inv.name) ||
      inv.accountType === "fees_account" ||
      inv.accountType === "ib"
    ) {
      inv.feePct = 0;
    }
  }

  const outputFiles = {
    "investors.json": investorList,
    "transactions.json": transactions,
    "performance.json": performance,
    "fund-balances.json": balances,
  };

  for (const [filename, data] of Object.entries(outputFiles)) {
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`\nWrote ${filePath} (${Array.isArray(data) ? data.length : 0} records)`);
  }

  // Print summary
  console.log("\n=== SUMMARY ===");
  console.log(`Investors: ${investorList.length}`);
  console.log(`  - Regular: ${investorList.filter((i) => i.accountType === "investor").length}`);
  console.log(`  - IB: ${investorList.filter((i) => i.accountType === "ib").length}`);
  console.log(`  - Fees: ${investorList.filter((i) => i.accountType === "fees_account").length}`);
  console.log(`Transactions: ${transactions.length}`);
  console.log(`  - Deposits: ${transactions.filter((t) => t.type === "DEPOSIT").length}`);
  console.log(`  - Withdrawals: ${transactions.filter((t) => t.type === "WITHDRAWAL").length}`);
  console.log(`Performance records: ${performance.length}`);
  console.log(`Balance snapshots: ${balances.length}`);

  // Print investor table
  console.log("\n=== INVESTOR TABLE ===");
  console.log("| # | Name | Type | Fee% | IB% | IB Parent | Funds |");
  console.log("|---|------|------|------|-----|-----------|-------|");
  investorList.forEach((inv, i) => {
    console.log(
      `| ${i + 1} | ${inv.name} | ${inv.accountType} | ${inv.feePct}% | ${inv.ibPct}% | ${inv.ibParent ?? "-"} | ${inv.fundsPresent.join(",")} |`
    );
  });

  // Print transaction summary by fund
  console.log("\n=== TRANSACTIONS BY FUND ===");
  const byFund = new Map<
    string,
    { deposits: number; withdrawals: number; depAmt: number; wdAmt: number }
  >();
  for (const tx of transactions) {
    if (!byFund.has(tx.currency))
      byFund.set(tx.currency, { deposits: 0, withdrawals: 0, depAmt: 0, wdAmt: 0 });
    const f = byFund.get(tx.currency)!;
    if (tx.type === "DEPOSIT") {
      f.deposits++;
      f.depAmt += tx.amount;
    } else {
      f.withdrawals++;
      f.wdAmt += tx.amount;
    }
  }
  for (const [fund, stats] of byFund) {
    console.log(
      `  ${fund}: ${stats.deposits} deposits (${stats.depAmt.toFixed(2)}), ${stats.withdrawals} withdrawals (${stats.wdAmt.toFixed(2)})`
    );
  }
}

function generateEmail(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "indigo fees") return "fees@indigo.fund";
  if (lower.includes("indigo digital")) return "lp@indigo.fund";
  if (lower === "indigo ventures") return "ventures@indigo.fund";
  if (lower === "nath & thomas") return "nath.thomas@indigo.fund";
  if (lower === "advantage blockchain") return "advantage.blockchain@indigo.fund";
  if (lower === "ventures life style") return "ventures.lifestyle@indigo.fund";

  // Standard: firstname.lastname@indigo.fund
  const parts = name
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}@indigo.fund`;
  }
  return `${parts[0]?.toLowerCase() ?? "unknown"}@indigo.fund`;
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
