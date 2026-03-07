import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://nkfimvovosdehmyyjubn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("=== LINKING ADRIEL'S PROFILE ===");
    const email = 'adriel@indigo.fund';
    const password = 'IndigoInvestor2026!';

    // Get Auth user
    const { data: users } = await supabase.auth.admin.listUsers();
    const actualUser = users?.users.find(u => u.email === email);

    if (actualUser) {
        console.log(`Found Auth User ${actualUser.id}. Resetting password and linking profile...`);

        await supabase.auth.admin.updateUserById(actualUser.id, {
            password,
            user_metadata: { full_name: "Adriel Cohen" },
            email_confirm: true
        });

        const { error: profErr } = await supabase.from('profiles').upsert({
            id: actualUser.id,
            email: email,
            first_name: 'Adriel',
            last_name: 'Cohen',
            role: 'super_admin',
            is_admin: true
        });

        if (profErr) {
            console.error("Profile link error:", profErr);
        } else {
            console.log("SUCCESS! Adriel is fully restored and linked.");
        }
    } else {
        console.error("Auth user still missing??");
    }
}
run();
