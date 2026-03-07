import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://nkfimvovosdehmyyjubn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    const { data: profiles } = await supabase.from('profiles').select('id, email').ilike('email', '%@test.indigo.com');
    const testIds = profiles ? profiles.map(p => p.id) : [];

    if (testIds.length > 0) {
        console.log(`Cascade deleting ${testIds.length} profiles from all tables...`);
        await supabase.from('transactions_v2').delete().in('investor_id', testIds);
        await supabase.from('investor_positions').delete().in('investor_id', testIds);
        await supabase.from('ib_commission_schedule').delete().in('investor_id', testIds);
        await supabase.from('investor_distributions').delete().in('investor_id', testIds);
        await supabase.from('bank_accounts').delete().in('investor_id', testIds);

        // Delete the profiles (removes them from the UI)
        await supabase.from('profiles').delete().in('id', testIds);

        // Delete the auth users
        for (const p of profiles) {
            await supabase.auth.admin.deleteUser(p.id);
        }
        console.log("Deleted profiles!");
    } else {
        console.log("No test profiles left to delete.");
    }

    // Funds
    const { data: funds } = await supabase.from('funds').select('id').or('name.ilike.E2E_Test_Fund_%,name.ilike.Expert Neg Fund%,name.ilike.FeesComp Fund%,name.ilike.Dust Fund%,name.ilike.Zero Fund%,name.ilike.Void Fund%');
    const fundIds = funds ? funds.map(f => f.id) : [];

    if (fundIds.length > 0) {
        console.log(`Cascade deleting ${fundIds.length} funds...`);
        await supabase.from('transactions_v2').delete().in('fund_id', fundIds);
        await supabase.from('investor_positions').delete().in('fund_id', fundIds);
        await supabase.from('yield_distributions').delete().in('fund_id', fundIds);
        await supabase.from('monthly_statements').delete().in('fund_id', fundIds);

        await supabase.from('funds').delete().in('id', fundIds);
        console.log("Deleted funds!");
    } else {
        console.log("No test funds left to delete.");
    }
}
run();
