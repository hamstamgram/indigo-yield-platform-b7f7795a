import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const actors = [
  {
    id: "a4e69247-b268-4ccb-bf64-da9aabd14cff",
    email: "sam-sim@indigo.fund",
    first_name: "Sam",
    last_name: "Sim",
  },
  {
    id: "85101af0-774d-41ae-baf8-20e31ea6851a",
    email: "anne-sim@indigo.fund",
    first_name: "Anne",
    last_name: "Sim",
  },
  {
    id: "169bb053-36cb-4f6e-93ea-831f0dfeaf1d",
    email: "fees@indigo.fund",
    first_name: "Indigo",
    last_name: "Fees",
    is_system_account: true,
  },
  {
    id: "61a8c8b1-88a9-486d-b10c-f7b2b353a41a",
    email: "ryan-ib@indigo.fund",
    first_name: "Ryan",
    last_name: "IB",
    account_type: "ib",
  },
];

async function main() {
  console.log("Setting up simulation actors...");

  for (const actor of actors) {
    const { error } = await supabase.from("profiles").upsert({
      ...actor,
      status: "active",
      fee_pct: 20,
    });

    if (error) {
      console.error(`Failed to create actor ${actor.email}:`, error.message);
    } else {
      console.log(`Actor created: ${actor.email}`);
    }
  }

  // Also assign 'investor' role to Sam and Anne, and 'ib' to Ryan
  const roles = [
    { user_id: "a4e69247-b268-4ccb-bf64-da9aabd14cff", role: "investor" },
    { user_id: "85101af0-774d-41ae-baf8-20e31ea6851a", role: "investor" },
    { user_id: "61a8c8b1-88a9-486d-b10c-f7b2b353a41a", role: "ib" },
  ];

  for (const r of roles) {
    const { error } = await supabase.from("user_roles").upsert(r);
    if (error) console.warn(`Role assignment failed for ${r.user_id}:`, error.message);
  }
}

main().catch(console.error);
