import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://nkfimvovosdehmyyjubn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("=== FORCING ADRIEL'S PASSWORD TO TestAdmin2026! ===");
    const userId = 'a16a7e50-fefd-4bfe-897c-d16279b457c2';
    const password = 'TestAdmin2026!';

    const { data, error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { full_name: "Adriel Cohen" },
        email_confirm: true
    });

    if (updErr) {
        console.error("Password update error:", updErr);
    } else {
        console.log("SUCCESS! Adriel's password has been forcefully overwritten.");
    }
}
run();
