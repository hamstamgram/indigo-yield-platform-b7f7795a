const XLSX = require("xlsx");
const fs = require("fs");

const workbook = XLSX.readFile("/Users/mama/Downloads/Accounting Yield Funds.xlsx");

console.log("=== ACCOUNTING YIELD FUNDS EXCEL ===\n");
console.log("Sheets:", workbook.SheetNames);

workbook.SheetNames.forEach((name) => {
  console.log("\n\n=== " + name + " ===");
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Print first 50 rows
  data.slice(0, 50).forEach((row, i) => {
    if (row && row.some((c) => c !== undefined && c !== null && c !== "")) {
      const clean = row.slice(0, 15).map((c) => {
        if (c === undefined || c === null) return "";
        if (c instanceof Date) return c.toISOString().split("T")[0];
        return String(c).substring(0, 25);
      });
      console.log("Row " + (i + 1) + ":", clean.join(" | "));
    }
  });
});

// Export all sheets to JSON for processing
const outputDir = "/Users/mama/Downloads/platform/full_accounting_sheets";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

workbook.SheetNames.forEach((name) => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const filePath = `${outputDir}/${name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`\nExported ${name} to ${filePath}`);
});
