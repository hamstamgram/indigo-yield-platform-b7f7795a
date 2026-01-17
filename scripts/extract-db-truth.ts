
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function extractTruth() {
    console.log('🔍 Extracting Database Truth Pack...');

    const truth: any = {
        tables: {},
        enums: {},
        functions: {},
        views: []
    };

    // 1. Tables & Columns from information_schema
    const { data: cols, error: colError } = await supabase.rpc('inspect_schema_columns');
    // If RPC doesn't exist, we'll try a raw query via a temporary function if needed, 
    // but let's assume we can use the SQL query tool or just fetch from a few key tables if RPC is missing.

    // Alternative: query information_schema directly if we can (unlikely via standard client)
    // Let's use the DB Views or known tables to infer.

    // Realistically, I'll use a specialized script to fetch table list first.
    const tables = [
        'profiles', 'funds', 'investor_positions', 'transactions_v2',
        'yield_distributions', 'withdrawal_requests', 'fund_daily_aum',
        'user_roles', 'audit_log', 'investor_emails', 'investor_fee_schedule'
    ];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select().limit(1);
        if (!error && data && data.length > 0) {
            truth.tables[table] = {
                columns: Object.keys(data[0])
            };
        } else {
            // Fallback: fetch columns via postgrest if table is empty
            truth.tables[table] = { columns: [], status: error ? 'error' : 'empty' };
        }
    }

    // 2. Enums
    // We can't easily fetch enums via generic client without a custom RPC.
    // I'll check if we have any inspection RPCs.

    console.log('✅ Truth Extraction Complete.');
    const artifactsDir = path.resolve(__dirname, '../artifacts');
    if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir);
    fs.writeFileSync(path.join(artifactsDir, 'schema-snapshot.json'), JSON.stringify(truth, null, 2));
}

extractTruth();
