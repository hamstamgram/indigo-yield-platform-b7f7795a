
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin credentials from previous verification fix
const ADMIN_EMAIL = 'testadmin@indigo.fund';
const ADMIN_PASSWORD = 'Indigo!Admin2026#Secure';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration in .env');
    process.exit(1);
}

// Client for Auth/Admin actions
const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const TEST_EMAIL = `verify-inv-${Date.now()}@indigo.fund`;
const TEST_PASSWORD = 'Indigo!Verify!2026#Master';
let investorId: string;
let fundId: string;
let fundAsset: string;
let activeAdminId: string;
let authenticatedClient: any;

async function runStep(name: string, fn: () => Promise<any>) {
    console.log(`\n▶️  STEP: ${name}`);
    try {
        const result = await fn();
        console.log(`✅ SUCCESS: ${name}`);
        return result;
    } catch (error: any) {
        console.error(`❌ FAILED: ${name}`);
        console.error(error.message);
        process.exit(1);
    }
}

async function main() {
    console.log('🚀 INITIALIZING MASTER PLATFORM VERIFICATION (AUTHENTICATED)');
    console.log(`🔗 Remote: ${SUPABASE_URL}`);

    // 0. Setup: Authenticate as Admin to get real JWT context
    await runStep('Setup: Admin Authentication', async () => {
        const { data: authData, error: authError } = await serviceClient.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        if (authError) throw authError;

        activeAdminId = authData.user.id;
        console.log(`   Logged in as: ${ADMIN_EMAIL} (${activeAdminId})`);

        // Create a new client with the Admin's JWT
        authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${authData.session.access_token}`
                }
            },
            auth: { persistSession: false }
        });

        // Get Fund (using service client for discovery)
        const { data: funds, error: fundError } = await serviceClient
            .from('funds')
            .select('id, asset, code')
            .eq('status', 'active')
            .limit(1);
        if (fundError) throw fundError;
        if (!funds || funds.length === 0) throw new Error('No active funds found.');
        fundId = funds[0].id;
        fundAsset = funds[0].asset;

        console.log(`   Target Fund: ${funds[0].code}`);
    });

    // 1. Investor Management
    await runStep('Investor Creation', async () => {
        // 1.1 Create Auth User (using service client)
        const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            email_confirm: true,
            user_metadata: { first_name: 'Verification', last_name: 'Instance' }
        });
        if (authError) throw authError;
        investorId = authUser.user.id;

        // 1.2 Upsert Profile (to avoid trigger conflicts)
        const { error: profileError } = await serviceClient.from('profiles').upsert({
            id: investorId,
            email: TEST_EMAIL,
            first_name: 'Verification',
            last_name: 'Instance',
            status: 'active',
            fee_pct: 0.02
        });
        if (profileError) throw profileError;
        console.log(`   Investor Created/Synced: ${investorId}`);
    });

    // 2. Initial Deposit
    await runStep('Transaction: Initial Deposit (1,000,000)', async () => {
        // Use AUTHENTICATED client for RPC
        const { data, error } = await authenticatedClient.rpc('admin_create_transaction', {
            p_investor_id: investorId,
            p_fund_id: fundId,
            p_type: 'DEPOSIT',
            p_amount: 1000000,
            p_tx_date: new Date().toISOString().split('T')[0],
            p_notes: 'Master Verification Initial Deposit',
            p_reference_id: `verify_dep_${Date.now()}`,
            p_admin_id: activeAdminId
        });
        if (error) throw error;
        console.log('   Deposit transaction confirmed.');
    });

    // 3. Yield preview & Apply
    await runStep('Yield Lifecycle: Preview -> Apply (1%)', async () => {
        // Preview
        const { data: preview, error: pError } = await authenticatedClient.rpc('preview_daily_yield_to_fund_v3', {
            p_fund_id: fundId,
            p_yield_date: new Date().toISOString().split('T')[0],
            p_new_aum: 1010000,
            p_purpose: 'reporting'
        });
        if (pError) throw pError;
        console.log('   Yield Preview successful.');

        // Apply
        const { data: apply, error: aError } = await authenticatedClient.rpc('apply_daily_yield_to_fund_v3', {
            p_fund_id: fundId,
            p_yield_date: new Date().toISOString().split('T')[0],
            p_gross_yield_pct: 0.01,
            p_created_by: activeAdminId,
            p_purpose: 'transaction'
        });
        if (aError) throw aError;
        console.log('   Yield Application successful.');
    });

    // 4. Withdrawal
    await runStep('Transaction: Withdrawal (500,000)', async () => {
        const { data, error } = await authenticatedClient.rpc('admin_create_transaction', {
            p_investor_id: investorId,
            p_fund_id: fundId,
            p_type: 'WITHDRAWAL',
            p_amount: -500000,
            p_tx_date: new Date().toISOString().split('T')[0],
            p_notes: 'Master Verification Withdrawal',
            p_reference_id: `verify_wd_${Date.now()}`,
            p_admin_id: activeAdminId
        });
        if (error) throw error;
        console.log('   Withdrawal transaction confirmed.');
    });

    // 5. Final Reconciliation
    await runStep('Integrity: AUM Reconciliation', async () => {
        const { data, error } = await authenticatedClient.rpc('check_aum_reconciliation', {
            p_fund_id: fundId,
            p_tolerance_pct: 0.01
        });
        if (error) throw error;
        const result = data as any;
        console.log(`   Reconciliation: ${result.message}`);
    });

    console.log('\n✨ MASTER VERIFICATION COMPLETE ✨');
    console.log(`Test Investor: ${TEST_EMAIL}`);
}

main();
