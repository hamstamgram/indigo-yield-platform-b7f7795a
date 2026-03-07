import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
    console.log("=== FORCING ALL LOCALLY SEEDED USERS TO HAVE TestAdmin2026! PASSWORD ===");

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("List users error:", error);
        return;
    }

    for (const user of users) {
        const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
            password: 'TestAdmin2026!',
            email_confirm: true
        });

        if (updErr) {
            console.error(`Password update error for ${user.email}:`, updErr);
        } else {
            console.log(`SUCCESS! password set for ${user.email}`);
        }
    }
}
run();
