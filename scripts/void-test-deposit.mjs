import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://nkfimvovosdehmyyjubn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("=== VOIDING DUPLICATE E2E TRANSACTIONS ===");

    const toVoid = [
        '33ebee17-714e-422e-9e8c-d9c2b5226965',
        '15ab894e-023f-417d-b620-043b98563fef',
        '05afd269-6812-4b26-a211-71b500eeef96'
    ];

    for (const txId of toVoid) {
        console.log(`Voiding ${txId}...`);
        const { data, error } = await supabase.rpc('void_transaction', {
            p_transaction_id: txId,
            p_admin_id: 'e06a15fb-0c5d-44d8-961a-8d5950715f37',
            p_reason: 'Voiding E2E test duplicate'
        });

        if (error) {
            console.error(`Failed to void ${txId}:`, error);
        } else {
            console.log(`Successfully voided ${txId}`);
        }
    }
}
run();
