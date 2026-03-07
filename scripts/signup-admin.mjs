import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use the ANON key for public sign up!
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
);

async function run() {
    console.log("Signing up fresh admin...");

    // We use a fresh email to avoid conflicts with the existing adriel@indigo.fund
    const { data, error } = await supabase.auth.signUp({
        email: 'qa.admin@indigo.fund',
        password: 'TestAdmin2026!',
    });

    if (error) {
        console.error("Sign up error:", error);
    } else {
        console.log("Sign up success! User ID:", data.user?.id);
    }
}
run();
