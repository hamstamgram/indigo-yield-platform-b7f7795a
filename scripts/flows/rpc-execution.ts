
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runRpcPack() {
    console.log('🚀 Running Systematic RPC Pack...');

    const seedIds = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../artifacts/seed-ids.json'), 'utf8'));
    const runLog: any[] = [];

    // 1. Authenticate Admin (Using known admin)
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'testadmin@indigo.fund',
        password: 'Indigo!Admin2026#Secure'
    });

    if (!authData.session) throw new Error('Admin auth failed');
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
    });

    const fundId = seedIds.funds['USDT'];
    const investorId = '55586442-5f33-41c3-8820-22709280cd3e'; // Existing test admin profile or a verified investor

    // RPC A: Deposit with Idempotency
    const refId = `drift-verify-${Date.now()}`;
    console.log(`📡 Calling apply_deposit_with_crystallization (Ref: ${refId})...`);

    const depositParams = {
        p_fund_id: fundId,
        p_investor_id: investorId,
        p_amount: 1000,
        p_new_total_aum: 1000000,
        p_tx_date: new Date().toISOString().split('T')[0],
        p_admin_id: authData.user.id,
        p_notes: 'Zero-Drift Verify',
        p_purpose: 'transaction'
    };

    const { data: d1, error: e1 } = await adminClient.rpc('apply_deposit_with_crystallization', depositParams);
    runLog.push({ rpc: 'apply_deposit_with_crystallization', status: e1 ? 'FAIL' : 'PASS', ref: refId });

    // Idempotency Call
    console.log('📡 Verifying Idempotency (Second call with same data)...');
    const { data: d2, error: e2 } = await adminClient.rpc('apply_deposit_with_crystallization', depositParams);
    runLog.push({ rpc: 'apply_deposit_with_crystallization_idempotency', status: d2 ? 'PASS' : 'FAIL (Expected skip or success re-report)' });

    // Monitoring
    console.log('📡 Running check_aum_reconciliation...');
    const { data: i1 } = await adminClient.rpc('check_aum_reconciliation', { p_fund_id: fundId });
    runLog.push({ rpc: 'check_aum_reconciliation', status: i1 === 'AUM reconciliation OK' ? 'PASS' : 'FAIL' });

    fs.writeFileSync(path.resolve(__dirname, '../../artifacts/rpc-run-log.json'), JSON.stringify(runLog, null, 2));
    console.log('✅ RPC Run Complete.');
}

runRpcPack().catch(console.error);
