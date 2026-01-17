
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

async function runAccountingFlow() {
    console.log('💰 Running End-to-End Accounting Flow Verification...');

    // 1. Auth Admin
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'testadmin@indigo.fund',
        password: 'Indigo!Admin2026#Secure'
    });
    if (!authData.session) throw new Error('Admin auth failed');

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
    });

    const fundId = '717614a2-9e24-4abc-a89d-02209a3a772a'; // ETH Fund
    const investorId = '55586442-5f33-41c3-8820-22709280cd3e';
    const today = new Date().toISOString().split('T')[0];

    // STEP A: Initial Deposit (1,000,000)
    console.log('👉 STEP A: Initial Deposit of 1,000,000...');
    await adminClient.rpc('apply_deposit_with_crystallization', {
        p_fund_id: fundId, p_investor_id: investorId, p_amount: 1000000, p_new_total_aum: 1000000,
        p_tx_date: today, p_admin_id: authData.user.id, p_notes: 'Phase 3: Initial Flow', p_purpose: 'transaction'
    });

    // STEP B: Yield Preview & Apply (1%)
    console.log('👉 STEP B: Applying 1% Daily Yield...');
    const { data: yieldResult } = await adminClient.rpc('apply_daily_yield_to_fund_v3', {
        p_fund_id: fundId, p_yield_rate: 0.01, p_valuation_date: today, p_admin_id: authData.user.id,
        p_notes: 'Phase 3: Yield Test', p_dry_run: false
    });

    // STEP C: Partial Withdrawal (500,000)
    console.log('👉 STEP C: Partial Withdrawal of 500,000...');
    await adminClient.rpc('apply_withdrawal_with_crystallization', {
        p_fund_id: fundId, p_investor_id: investorId, p_amount: 500000, p_new_total_aum: 1510000, // Assuming 1M + 10k yield - 500k
        p_tx_date: today, p_admin_id: authData.user.id, p_notes: 'Phase 3: Exit Test', p_purpose: 'transaction'
    });

    // STEP D: Integrity Check
    console.log('👉 STEP D: Final Integrity Check...');
    const { data: recon } = await adminClient.rpc('check_aum_reconciliation', { p_fund_id: fundId });
    console.log(`📊 Result: ${recon}`);

    console.log('✅ Accounting Flow Complete.');
}

runAccountingFlow().catch(console.error);
