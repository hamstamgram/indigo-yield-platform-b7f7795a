
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactsPath = path.resolve(__dirname, '../artifacts');
const schemaPath = path.join(artifactsPath, 'schema-snapshot.json');

// Mocking contract extraction from my grep/view findings
const contractSnapshot = {
    rpcs: [
        "run_integrity_check", "apply_deposit_with_crystallization", "apply_withdrawal_with_crystallization",
        "apply_daily_yield_to_fund_v3", "preview_daily_yield_to_fund_v3", "admin_create_transaction",
        "void_transaction", "check_aum_reconciliation", "get_historical_nav", "is_admin"
        // ... basically most of RPC_FUNCTIONS
    ],
    tables: {
        profiles: ["id", "email", "first_name", "last_name", "status", "account_type", "fee_pct", "is_test"],
        funds: ["id", "code", "asset", "status", "fund_class"],
        investor_positions: ["investor_id", "fund_id", "current_value", "cost_basis", "shares", "is_active", "updated_at"],
        transactions_v2: ["id", "investor_id", "fund_id", "type", "amount", "tx_date", "notes", "is_voided", "balance_before", "balance_after"]
    }
};

function analyzeDrift() {
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Schema snapshot missing. Run extraction first.');
        process.exit(1);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const driftReport: string[] = ["# Contract Drift Report\n"];
    let driftCount = 0;

    // 1. Check Tables & Columns
    for (const [table, contractCols] of Object.entries(contractSnapshot.tables)) {
        const dbTable = schema.tables[table];
        if (!dbTable) {
            driftReport.push(`❌ TABLE MISSING: ${table}`);
            driftCount++;
            continue;
        }

        for (const col of contractCols) {
            if (!dbTable.columns.includes(col)) {
                driftReport.push(`❌ COLUMN MISSING in ${table}: ${col}`);
                driftCount++;
            }
        }
    }

    // 2. Composite PK check (Hardcoded logic for mission)
    const compositeTables = ['investor_positions', 'fund_daily_aum'];
    for (const table of compositeTables) {
        if (contractSnapshot.tables[table]?.includes('id')) {
            driftReport.push(`❌ DESIGN ERROR: ${table} has "id" in contract but is a Composite PK table.`);
            driftCount++;
        }
    }

    // 3. Enum check (Known Drift: FIRST_INVESTMENT)
    const txTypesInContract = ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE", "ADJUSTMENT", "FIRST_INVESTMENT"];
    const txTypesInDB = ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE", "ADJUSTMENT", "FEE_CREDIT", "IB_CREDIT", "YIELD"]; // from my previous check-schema.ts output

    for (const type of txTypesInContract) {
        if (!txTypesInDB.includes(type)) {
            driftReport.push(`❌ ENUM DRIFT: "${type}" used in code but missing in DB tx_type.`);
            driftCount++;
        }
    }

    const reportFile = path.join(artifactsPath, 'contract-drift-report.md');
    fs.writeFileSync(reportFile, driftReport.join('\n'));

    console.log(`\n${driftReport.join('\n')}`);
    console.log(`\nTotal Drift Issues: ${driftCount}`);

    if (driftCount > 0) {
        console.log('\n🔴 DRIFT DETECTED. Stopping execution per MISSION rules.');
        process.exit(1);
    } else {
        console.log('\n🟢 ZERO DRIFT. Proceeding to Phase 1.');
    }
}

analyzeDrift();
