import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function fix() {
    console.log("Creating user from GoTrue Admin API...");
    const { data, error } = await supabase.auth.admin.createUser({
        email: 'qa.admin@indigo.fund',
        password: 'TestAdmin2026!',
        email_confirm: true,
        user_metadata: { full_name: "QA Admin" }
    });

    if (error) {
        console.error("Error creating user via GoTrue:", error);
        process.exit(1);
    } else {
        console.log("✅ Successfully created qa.admin@indigo.fund with TestAdmin2026! via formal GoTrue Admin API!");
    }
}

fix();
