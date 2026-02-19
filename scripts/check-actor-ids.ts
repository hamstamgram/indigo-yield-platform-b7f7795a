import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const FUND_ID = "58f8bcad-56b0-4369-a6c6-34c5d4aaa961"; // Euro Yield Fund (IND-EURC)
const SAM_ID = "a4e69247-b268-4ccb-bf64-da9aabd14cff";
const ANNE_ID = "85101af0-774d-41ae-baf8-20e31ea6851a";
const FEES_ID = "169bb053-36cb-4f6e-93ea-831f0dfeaf1d";
const RYAN_ID = "61a8c8b1-88a9-486d-b10c-f7b2b353a41a";

async function main() {
  const ids = [SAM_ID, ANNE_ID, FEES_ID, RYAN_ID];

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", ids);

  console.log("Found profiles for fixed IDs:", profiles);
  console.log(
    "IDs not found:",
    ids.filter((id) => !profiles?.some((p) => p.id === id))
  );
}

main().catch(console.error);
