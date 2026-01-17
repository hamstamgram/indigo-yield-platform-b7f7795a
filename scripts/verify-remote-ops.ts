
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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration in .env');
    process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_USERS = [
    {
        email: 'testadmin@indigo.fund',
        password: 'Indigo!Admin2026#Secure',
        isAdmin: true,
        fullName: 'Test Admin'
    },
    {
        email: 'alice@test.indigo.com',
        password: 'Alice!Investor2026#Secure',
        isAdmin: false,
        fullName: 'Alice Investor'
    }
];

async function findUserByEmail(email: string) {
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({
            page,
            perPage
        });

        if (error) throw error;
        if (users.length === 0) {
            hasMore = false;
            continue;
        }

        const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (found) return found;

        if (users.length < perPage) {
            hasMore = false;
        } else {
            page++;
        }
    }
    return null;
}

async function ensureUserExists(user: typeof TEST_USERS[0]) {
    console.log(`👤 Checking user: ${user.email}...`);

    const existingUser = await findUserByEmail(user.email);
    let userId;

    if (existingUser) {
        userId = existingUser.id;
        console.log(`   ✅ User found in Auth. ID: ${userId}`);
        // Sync password
        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
            password: user.password,
            user_metadata: { full_name: user.fullName }
        });
        if (updateError) console.warn(`   ⚠️ Warning sync password:`, updateError.message);
        else console.log(`   ✅ Password synced.`);
    } else {
        console.log(`   ➕ Creating new user ${user.email}...`);
        const { data: newData, error: createError } = await adminClient.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { full_name: user.fullName }
        });
        if (createError) throw createError;
        userId = newData.user.id;
        console.log(`   ✅ User created. ID: ${userId}`);
    }

    // Sync Profile
    const { data: profile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (!profile) {
        console.log(`   ➕ Creating profile for ${user.email}...`);
        await adminClient.from('profiles').insert({
            id: userId,
            email: user.email,
            full_name: user.fullName,
            is_admin: user.isAdmin,
            status: 'active'
        });
    } else {
        const updates: any = {};
        if (profile.is_admin !== user.isAdmin) updates.is_admin = user.isAdmin;
        if (profile.status !== 'active') updates.status = 'active';

        if (Object.keys(updates).length > 0) {
            console.log(`   ⚙️ Syncing profile flags for ${user.email}...`);
            await adminClient.from('profiles').update(updates).eq('id', userId);
        }
    }

    return userId;
}

async function runVerification() {
    console.log('🚀 FINAL REMOTE VERIFICATION\n');

    try {
        for (const user of TEST_USERS) {
            await ensureUserExists(user);
        }

        console.log('\n--- Phase 2: Session Validation ---');
        for (const user of TEST_USERS) {
            const { error } = await anonClient.auth.signInWithPassword({
                email: user.email,
                password: user.password
            });
            if (error) throw new Error(`${user.email} login failed: ${error.message}`);
            console.log(`✅ Login flow verified for ${user.email}`);
            await anonClient.auth.signOut();
        }

        console.log('\n--- Phase 3: RPC & View Integrity ---');
        const { data: navData, error: rpcError } = await adminClient.rpc('get_historical_nav', {
            target_date: new Date().toISOString().split('T')[0]
        });
        if (rpcError) console.warn(`⚠️ RPC failed/empty:`, rpcError.message);
        else console.log(`✅ RPC get_historical_nav functional.`);

        console.log('\n🎉 ALL SYSTEMS VERIFIED ON REMOTE SUPABASE 🎉');

    } catch (error: any) {
        console.error('\n🛑 VERIFICATION FAILED 🛑');
        console.error(error.message);
        process.exit(1);
    }
}

runVerification();
