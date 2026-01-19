/**
 * Contract Drift Analyzer
 * 
 * Compares the contracts in src/contracts/ against the actual database schema
 * to detect drift between code expectations and database reality.
 * 
 * FIXED: Now uses dynamic imports from actual contract files instead of
 * hardcoded snapshots that can become stale.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactsPath = path.resolve(__dirname, '../artifacts');
const schemaPath = path.join(artifactsPath, 'schema-snapshot.json');

// Dynamic import from actual contract files
async function loadContracts() {
  // Import the actual contract values
  const dbEnumsPath = path.resolve(__dirname, '../src/contracts/dbEnums.ts');
  const dbSchemaPath = path.resolve(__dirname, '../src/contracts/dbSchema.ts');
  
  // Read and parse the contract files
  const enumsContent = fs.readFileSync(dbEnumsPath, 'utf8');
  const schemaContent = fs.readFileSync(dbSchemaPath, 'utf8');
  
  // Extract TX_TYPE_VALUES from dbEnums.ts
  const txTypeMatch = enumsContent.match(/export const TX_TYPE_VALUES\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  const txTypes: string[] = [];
  if (txTypeMatch) {
    const values = txTypeMatch[1].match(/"([A-Z_]+)"/g);
    if (values) {
      txTypes.push(...values.map(v => v.replace(/"/g, '')));
    }
  }
  
  // Extract AUM_PURPOSE_VALUES from dbEnums.ts
  const aumMatch = enumsContent.match(/export const AUM_PURPOSE_VALUES\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  const aumPurposes: string[] = [];
  if (aumMatch) {
    const values = aumMatch[1].match(/"([a-z_]+)"/g);
    if (values) {
      aumPurposes.push(...values.map(v => v.replace(/"/g, '')));
    }
  }
  
  // Extract table definitions from dbSchema.ts
  const tables: Record<string, { columns: string[] }> = {};
  const tableMatches = schemaContent.matchAll(/(\w+):\s*\{[\s\S]*?name:\s*"(\w+)"[\s\S]*?columns:\s*\[([\s\S]*?)\]\s*as\s*const/g);
  
  for (const match of tableMatches) {
    const tableName = match[2];
    const columnsStr = match[3];
    const columns = columnsStr.match(/"([a-z_]+)"/g)?.map(c => c.replace(/"/g, '')) || [];
    tables[tableName] = { columns };
  }
  
  return { txTypes, aumPurposes, tables };
}

async function analyzeDrift() {
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema snapshot missing. Run extraction first.');
    console.log('\nTo create schema snapshot, run:');
    console.log('  npm run schema:extract');
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const contracts = await loadContracts();
  
  const driftReport: string[] = [
    "# Contract Drift Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
  ];
  let driftCount = 0;

  // 1. Check Tables & Columns
  driftReport.push("### Table/Column Checks");
  driftReport.push("");
  
  for (const [table, contractMeta] of Object.entries(contracts.tables)) {
    const dbTable = schema.tables?.[table];
    if (!dbTable) {
      driftReport.push(`❌ TABLE MISSING in DB: ${table}`);
      driftCount++;
      continue;
    }

    for (const col of contractMeta.columns) {
      if (!dbTable.columns?.includes(col)) {
        driftReport.push(`❌ COLUMN MISSING in ${table}: ${col}`);
        driftCount++;
      }
    }
  }
  
  if (driftCount === 0) {
    driftReport.push("✅ All contract tables and columns exist in database");
  }
  driftReport.push("");

  // 2. Check Enums
  driftReport.push("### Enum Checks");
  driftReport.push("");
  
  const dbTxTypes = schema.enums?.tx_type || [];
  const dbAumPurposes = schema.enums?.aum_purpose || [];
  
  let enumDriftCount = 0;
  
  // Check tx_type (Note: FIRST_INVESTMENT is UI-only and intentionally excluded)
  for (const type of contracts.txTypes) {
    if (!dbTxTypes.includes(type)) {
      driftReport.push(`❌ ENUM DRIFT tx_type: "${type}" in contract but missing in DB`);
      enumDriftCount++;
      driftCount++;
    }
  }
  
  for (const type of dbTxTypes) {
    if (!contracts.txTypes.includes(type)) {
      driftReport.push(`⚠️ ENUM EXTRA tx_type: "${type}" in DB but missing in contract`);
      enumDriftCount++;
      driftCount++;
    }
  }
  
  // Check aum_purpose
  for (const purpose of contracts.aumPurposes) {
    if (!dbAumPurposes.includes(purpose)) {
      driftReport.push(`❌ ENUM DRIFT aum_purpose: "${purpose}" in contract but missing in DB`);
      enumDriftCount++;
      driftCount++;
    }
  }
  
  if (enumDriftCount === 0) {
    driftReport.push("✅ All contract enums match database enums");
  }
  driftReport.push("");

  // 3. Write report
  driftReport.push("---");
  driftReport.push("");
  driftReport.push(`## Result: ${driftCount === 0 ? '🟢 ZERO DRIFT' : `🔴 ${driftCount} DRIFT ISSUES`}`);
  driftReport.push("");
  driftReport.push("### Notes");
  driftReport.push("- FIRST_INVESTMENT is intentionally UI-only (mapped to DEPOSIT via mapUITypeToDb)");
  driftReport.push("- Contract files are in src/contracts/dbEnums.ts and src/contracts/dbSchema.ts");
  driftReport.push("- This script dynamically reads contracts - no hardcoded values");
  
  // Ensure artifacts directory exists
  if (!fs.existsSync(artifactsPath)) {
    fs.mkdirSync(artifactsPath, { recursive: true });
  }
  
  const reportFile = path.join(artifactsPath, 'contract-drift-report.md');
  fs.writeFileSync(reportFile, driftReport.join('\n'));

  console.log(`\n${driftReport.join('\n')}`);
  console.log(`\nReport written to: ${reportFile}`);

  if (driftCount > 0) {
    console.log('\n🔴 DRIFT DETECTED. Review and fix before proceeding.');
    process.exit(1);
  } else {
    console.log('\n🟢 ZERO DRIFT. Contracts aligned with database.');
  }
}

analyzeDrift().catch(err => {
  console.error('Error analyzing drift:', err);
  process.exit(1);
});
