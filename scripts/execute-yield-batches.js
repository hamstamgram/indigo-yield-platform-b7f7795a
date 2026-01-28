/**
 * Execute yield distribution in batches via Supabase MCP
 * Outputs SQL statements for each batch
 */

const fs = require("fs");

const yields = JSON.parse(fs.readFileSync("./scripts/yields-to-distribute.json", "utf8")).yields;

const adminId = "ed91c89d-23de-4981-b6b7-60e13f1a6767";

// Generate SQL for each yield
const sqlStatements = yields.map((y, i) => {
  const safeName = y.investor_name.replace(/'/g, "''");
  return `SELECT insert_yield_transaction('${safeName}', '${y.fund_code}', '${y.month}', '${y.tx_date}'::date, ${y.total_net}, '${adminId}'::uuid);`;
});

// Split into batches of 30
const batchSize = 30;
const batches = [];
for (let i = 0; i < sqlStatements.length; i += batchSize) {
  batches.push(sqlStatements.slice(i, i + batchSize));
}

console.log(`Total yields: ${yields.length}`);
console.log(`Total batches: ${batches.length}`);

// Output each batch to a separate file
batches.forEach((batch, i) => {
  const sql = batch.join("\n");
  const filename = `./scripts/yield-batch-${String(i + 1).padStart(2, "0")}.sql`;
  fs.writeFileSync(filename, sql);
  console.log(`Written: ${filename} (${batch.length} statements)`);
});

// Also output a single combined file
const combinedSql =
  `-- Combined yield distribution
-- Total: ${yields.length} yields in ${batches.length} batches
-- Admin: ${adminId}

` + sqlStatements.join("\n");

fs.writeFileSync("./scripts/yield-all-batches.sql", combinedSql);
console.log("\nWritten: ./scripts/yield-all-batches.sql");
