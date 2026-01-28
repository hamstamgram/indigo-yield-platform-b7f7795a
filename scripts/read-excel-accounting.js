const XLSX = require("xlsx");

const workbook = XLSX.readFile(
  "/Users/mama/Downloads/platform/INDIGO_Accounting_Audit_Report.xlsx"
);

console.log("Sheets:", workbook.SheetNames);

workbook.SheetNames.forEach((name) => {
  console.log("\n=== " + name + " ===");
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // Print first 40 rows
  data.slice(0, 40).forEach((row, i) => {
    if (row && row.some((c) => c !== undefined && c !== null && c !== "")) {
      const clean = row.slice(0, 15).map((c) => {
        if (c === undefined || c === null) return "";
        return String(c).substring(0, 25);
      });
      console.log("Row " + (i + 1) + ":", clean.join(" | "));
    }
  });
});

// Export each sheet as JSON for detailed analysis
const fs = require("fs");
const outputDir = "/Users/mama/Downloads/platform/excel_sheets";
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
