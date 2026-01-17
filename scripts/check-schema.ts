#!/usr/bin/env npx ts-node --esm
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log("Checking actual table columns and enum values...\n");

  // Check profiles columns and account_type values
  const { data: profiles, error: pe } = await supabase.from("profiles").select("account_type, status").limit(20);
  if (pe) console.log("profiles error:", pe.message);
  else {
    const accountTypes = [...new Set(profiles?.map(p => p.account_type))];
    const statuses = [...new Set(profiles?.map(p => p.status))];
    console.log("profiles account_types:", accountTypes);
    console.log("profiles statuses:", statuses);
  }

  // Check funds columns and required values
  const { data: funds, error: fe } = await supabase.from("funds").select("fund_class, status, asset").limit(5);
  if (fe) console.log("funds error:", fe.message);
  else {
    const fundClasses = [...new Set(funds?.map(f => f.fund_class))];
    const statuses = [...new Set(funds?.map(f => f.status))];
    console.log("funds fund_classes:", fundClasses);
    console.log("funds statuses:", statuses);
    console.log("funds assets:", [...new Set(funds?.map(f => f.asset))]);
  }

  // Check transactions_v2 types
  const { data: txs, error: te } = await supabase.from("transactions_v2").select("type").limit(50);
  if (te) console.log("transactions_v2 error:", te.message);
  else {
    const types = [...new Set(txs?.map(t => t.type))];
    console.log("transactions_v2 types:", types);
  }
}

checkSchema();
