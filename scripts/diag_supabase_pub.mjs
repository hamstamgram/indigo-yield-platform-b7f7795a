import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

console.log("Testing with PUBLISHABLE KEY...");
console.log("URL:", supabaseUrl);
console.log("Key length:", supabaseKey?.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, count, error } = await supabase
        .from("transactions_v2")
        .select("*", { count: "exact", head: true })
        .eq("is_voided", false);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Success! Count:", count);
    }
}

test();
