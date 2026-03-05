import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROOT ROOT ROOT - go up one level from scripts/
const dotEnvPath = path.resolve(__dirname, "..", ".env");
console.log("Loading .env from:", dotEnvPath);
dotenv.config({ path: dotEnvPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

console.log("URL:", supabaseUrl);
console.log("Key length:", supabaseKey?.length);

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env at", dotEnvPath);
    console.log("Available env keys:", Object.keys(process.env).filter(k => k.includes("SUPABASE")));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Executing test query...");
    try {
        const { data, count, error, status, statusText } = await supabase
            .from("transactions_v2")
            .select("*", { count: "exact", head: true })
            .eq("is_voided", false);

        if (error) {
            console.error("Query Error:", error);
            console.error("Status:", status, statusText);
        } else {
            console.log("Success! Count:", count);
        }
    } catch (err) {
        console.error("Async Error:", err);
    }
}

test();
