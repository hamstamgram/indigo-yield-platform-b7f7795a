import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://nkfimvovosdehmyyjubn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("=== CLEANING DUPLICATE TRANSACTIONS FROM LIVE DB ===");

    const { data: txs, error } = await supabase
        .from('transactions_v2')
        .select('id, amount, created_at')
        .eq('amount', 1250)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch DB error:", error.message);
        return;
    }

    console.log(`Found ${txs.length} transactions for 1250 SOL...`);
    console.log(txs.map(t => `${t.id} - ${t.created_at}`));

    if (txs.length > 1) {
        // Keep the oldest one (the real seed), delete the newest ones (from the E2E tests running just now)
        const toDelete = txs.slice(0, txs.length - 1).map(tx => tx.id);
        console.log(`Deleting ${toDelete.length} recently created E2E test duplicate(s):`, toDelete);

        const { error: delErr } = await supabase.from('transactions_v2').delete().in('id', toDelete);
        if (delErr) {
            console.error("Error deleting:", delErr);
        } else {
            console.log("Deleted successfully.");
            // We might also need to delete any yield operations or withdrawals the E2E test created
            // We'll let the user know not to run E2E against live!
        }
    } else {
        console.log("Only one 1250 SOL transaction exists. No duplicates to clean.");
    }
}
run();
