import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://nkfimvovosdehmyyjubn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k",
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("=== RESTORING ADRIEL VIA SQL/RPC ===");

    // We can't insert into auth.users directly from the Data API because it's a separate schema.
    // The 'unexpected_failure' from GoTrue usually means the database identity is completely out of sync
    // or the user was hard-deleted from `auth.users` but still exists in `auth.identities`.

    // Let's try to just sign up normally using the public signup, and then hook it to a profile.
    console.log("Attempting standard signup...");
    const { data, error } = await supabase.auth.signUp({
        email: 'adriel@indigo.fund',
        password: 'IndigoInvestor2026!',
        options: {
            data: { full_name: "Adriel Cohen" }
        }
    });

    if (error) {
        console.error("Standard signup failed:", error);

        if (error.status === 422) {
            console.log("Email exists. The user is stuck in a half-deleted state in GoTrue.");
            console.log("I will notify the user that to fully restore Adriel, they might need to go to the Supabase Dashboard -> Authentication -> Users, search 'adriel@indigo.fund', and manually delete/recreate it or reset the password.");
        }
    } else {
        console.log("Standard signup succeeded! ID:", data.user?.id);
        // Link profile
        if (data.user) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                email: 'adriel@indigo.fund',
                first_name: 'Adriel',
                last_name: 'Cohen',
                role: 'super_admin',
                is_admin: true
            });
            console.log("Profile linked!");
        }
    }
}
run();
