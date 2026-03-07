import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nkfimvovosdehmyyjubn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("=== CASCADE CLEANING BLOCKING SPAM ===");

    // Find all remaining test profiles
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', '%@test.indigo.com');

    if (pErr) return console.error("Error fetching test profiles:", pErr);

    const testIds = profiles.map(p => p.id);
    console.log(`Found ${testIds.length} remaining test profiles to cascade delete.`);

    if (testIds.length > 0) {
        // 1. Delete transactions for these users
        console.log("Deleting linked transactions...");
        const { error: txErr } = await supabase
            .from('transactions_v2')
            .delete()
            .in('investor_id', testIds);
        if (txErr) console.error("Error deleting transactions:", txErr);

        // 2. Delete positions for these users
        console.log("Deleting linked positions...");
        const { error: posErr } = await supabase
            .from('investor_positions')
            .delete()
            .in('investor_id', testIds);
        if (posErr) console.error("Error deleting positions:", posErr);

        // 3. Delete IB links
        console.log("Deleting linked IB settings...");
        const { error: ibErr } = await supabase
            .from('ib_commitments')
            .delete()
            .in('investor_id', testIds);
        if (ibErr) console.error("Error deleting IB settings:", ibErr);
    }

    for (const p of profiles) {
        console.log(`Deleting Auth User: ${p.email}`);
        const { error: delErr } = await supabase.auth.admin.deleteUser(p.id);
        if (delErr) {
            console.error(`Failed to delete user ${p.id} (${p.email}):`, delErr);
        } else {
            console.log(`  -> Successfully deleted ${p.email} from auth!`);
        }
    }

    if (testIds.length > 0) {
        const { error: delProfErr } = await supabase
            .from('profiles')
            .delete()
            .in('id', testIds);
    }

    console.log("\n=== CLEANING REMAINING FUNDS ===");
    const { data: funds, error: fErr } = await supabase
        .from('funds')
        .select('id, name')
        .or('name.ilike.E2E_Test_Fund_%,name.ilike.Expert Neg Fund%,name.ilike.FeesComp Fund%,name.ilike.Dust Fund%,name.ilike.Zero Fund%,name.ilike.Void Fund%');

    if (fErr) return console.error("Error fetching test funds:", fErr);

    const fundIds = funds.map(f => f.id);
    console.log(`Found ${fundIds.length} test funds to delete.`);

    if (fundIds.length > 0) {
        // Delete transactions pointing to these funds
        const { error: fTxErr } = await supabase.from('transactions_v2').delete().in('fund_id', fundIds);
        const { error: fPosErr } = await supabase.from('investor_positions').delete().in('fund_id', fundIds);

        const { error: delFundErr } = await supabase
            .from('funds')
            .delete()
            .in('id', fundIds);

        if (delFundErr) console.error(`Failed to delete funds:`, delFundErr);
        else console.log(`Successfully deleted ${fundIds.length} dummy funds.`);
    }

    console.log("\nDONE.");
}

run();
