import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseAnonKey) {
    console.error("Missing ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDust() {
    console.log("1. Authenticating as Admin...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'nathanael@indigo.fund',
        password: 'password123'
    });

    if (authError || !authData.session) {
        console.error("Admin Login Failed:", authError?.message);
        process.exit(1);
    }
    console.log("Admin logged in successfully.\n");

    console.log("2. Invoking internal_route_to_fees...");

    const payload = {
        p_from_investor_id: 'ae33cb93-3cdf-400e-8a95-1550d81a0d70', // hammadou
        p_fund_id: '2c123c4f-76b4-4504-867e-059649855417', // XRP Fund
        p_amount: 0.50, // 50 cents dust
        p_effective_date: '2026-03-05',
        p_reason: 'Dust sweep from full withdrawal (test script)',
        p_admin_id: authData.user.id
    };

    const { data, error } = await supabase.rpc('internal_route_to_fees', payload);

    if (error) {
        console.error("❌ RPC Failed:", error.message);
    } else {
        console.log("✅ RPC Succeeded:", data);
    }
}

testDust();
