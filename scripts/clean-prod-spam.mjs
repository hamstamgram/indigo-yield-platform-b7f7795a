import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nkfimvovosdehmyyjubn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("=== CLEANING PROFILES & USERS ===");

    // Find all test profiles
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', '%@test.indigo.com');

    if (pErr) {
        console.error("Error fetching test profiles:", pErr);
        return;
    }

    const testIds = profiles.map(p => p.id);
    console.log(`Found ${testIds.length} test profiles/users to delete.`);

    for (const p of profiles) {
        console.log(`Deleting Auth User: ${p.email}`);
        const { error: delErr } = await supabase.auth.admin.deleteUser(p.id);
        if (delErr) {
            console.error(`Failed to delete user ${p.id} (${p.email}):`, delErr);
        } else {
            console.log(`  -> Successfully deleted ${p.email} from auth!`);
        }
    }

    // Double tap delete profiles just in case ON DELETE CASCADE isn't set up
    if (testIds.length > 0) {
        const { error: delProfErr } = await supabase
            .from('profiles')
            .delete()
            .in('id', testIds);
        if (delProfErr) console.error("Failed to delete from profiles table:", delProfErr);
    }

    console.log("\n=== CLEANING FUNDS ===");
    const { data: funds, error: fErr } = await supabase
        .from('funds')
        .select('id, name')
        .ilike('name', 'E2E_Test_Fund_%');

    if (fErr) {
        console.error("Error fetching test funds:", fErr);
        return;
    }

    const fundIds = funds.map(f => f.id);
    console.log(`Found ${fundIds.length} test funds to delete.`);

    if (fundIds.length > 0) {
        const { error: delFundErr } = await supabase
            .from('funds')
            .delete()
            .in('id', fundIds);

        if (delFundErr) {
            console.error(`Failed to delete funds:`, delFundErr);
        } else {
            console.log(`Successfully deleted ${fundIds.length} dummy funds.`);
        }
    }

    console.log("\nDONE.");
}

run();
