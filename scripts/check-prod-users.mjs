import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nkfimvovosdehmyyjubn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    console.log("=== USERS IN AUTH ===");
    const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
    if (userErr) console.error("Error fetching users:", userErr);
    else {
        users.users.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`));
    }

    console.log("\n=== PROFILES ===");
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, email, first_name, last_name, role');
    if (profErr) console.error("Error fetching profiles:", profErr);
    else {
        profiles.forEach(p => console.log(`- ${p.first_name} ${p.last_name} (${p.email}) - ${p.role} (ID: ${p.id})`));
    }

    console.log("\n=== FUNDS ===");
    const { data: funds, error: fundErr } = await supabase.from('funds').select('id, name, asset, status');
    if (fundErr) console.error("Error fetching funds:", fundErr);
    else {
        funds.forEach(f => console.log(`- ${f.name} [${f.asset}] (ID: ${f.id})`));
    }
}

run();
