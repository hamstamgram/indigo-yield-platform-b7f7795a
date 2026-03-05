const xlsx = require("xlsx");
const fs = require("fs");

try {
  const workbook = xlsx.readFile("./Accounting Yield Funds (3).xlsx");
  const result = {};

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.includes("XRP") || sheetName.includes("SOL")) {
      result[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
    }
  }

  fs.writeFileSync("excel_dump.json", JSON.stringify(result, null, 2));
  console.log("Successfully parsed sheets:", Object.keys(result));
} catch (error) {
  console.error("Error parsing excel:", error);
}
