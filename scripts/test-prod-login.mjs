import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://nkfimvovosdehmyyjubn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("=== TESTING PUBLIC LOGIN API ===");
    // Using the publishable anon key the user provided

    // Test 1: Log in with the newly restored qa.admin/adriel account
    console.log("Attempting to sign in as adriel@indigo.fund...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'adriel@indigo.fund',
        password: 'TestAdmin2026!'
    });

    if (error) {
        console.error("Login Failed:");
        console.error(error.message);
        console.error(error.status);
        console.error(error.name);
    } else {
        console.log("Login succeeded! Token:", data.session?.access_token.substring(0, 10) + "...");
    }
}
run();
