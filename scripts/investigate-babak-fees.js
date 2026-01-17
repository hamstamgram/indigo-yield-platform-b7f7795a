const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function investigate() {
  console.log("═".repeat(70));
  console.log("  INVESTIGATING BABAK'S FEE STRUCTURE");
  console.log("═".repeat(70));

  // 1. First, let's see the profiles table structure
  console.log("\n1. Getting all profiles with all columns...");
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("*")
    .limit(20);

  if (profilesErr) {
    console.log("Error:", profilesErr.message);
    return;
  }

  if (profiles?.length > 0) {
    console.log("\nProfile columns:", Object.keys(profiles[0]).join(", "));
    console.log("\nAll profiles:");
    profiles.forEach(p => {
      const name = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name || p.email;
      console.log(`  - ${name} | Email: ${p.email} | Type: ${p.account_type} | IB: ${p.ib_id?.slice(0,8) || 'none'}`);
    });
  }

  // 2. Find Babak by name or email
  console.log("\n2. Finding Babak...");
  let babak = profiles?.find(p =>
    (p.first_name?.toLowerCase().includes('babak')) ||
    (p.last_name?.toLowerCase().includes('babak')) ||
    (p.display_name?.toLowerCase().includes('babak')) ||
    (p.email?.toLowerCase().includes('babak'))
  );

  if (!babak) {
    console.log("  Babak not found by name, listing all investors...");
    const investors = profiles?.filter(p => p.account_type === 'investor');
    investors?.forEach(p => {
      const name = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name || p.email;
      console.log(`  - ${name} | ${p.email}`);
    });
    return;
  }

  console.log("\nBabak's profile:");
  console.log(JSON.stringify(babak, null, 2));

  // 3. Find his IB
  if (babak.ib_id) {
    console.log("\n3. Finding IB (Lars)...");
    const { data: ib } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", babak.ib_id)
      .single();

    if (ib) {
      console.log("\nIB profile:");
      console.log(JSON.stringify(ib, null, 2));
    }
  }

  // 4. Check investor_positions
  console.log("\n4. Checking Babak's positions...");
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("*, funds(code, asset)")
    .eq("investor_id", babak.id);

  console.log("\nBabak's positions:");
  positions?.forEach(p => console.log(`  - Fund: ${p.funds?.code} | Value: ${p.current_value} ${p.funds?.asset}`));

  // 5. Check fee_overrides
  console.log("\n5. Checking fee_overrides table...");
  const { data: allOverrides, error: overrideErr } = await supabase
    .from("fee_overrides")
    .select("*");

  if (overrideErr) {
    console.log("  fee_overrides error:", overrideErr.message);
  } else {
    console.log("\nAll fee overrides:");
    console.log(JSON.stringify(allOverrides, null, 2));
  }

  // 6. Check funds
  console.log("\n6. Checking fund fee settings...");
  const { data: funds } = await supabase
    .from("funds")
    .select("*")
    .eq("status", "active");

  console.log("\nActive funds:");
  funds?.forEach(f => {
    console.log(`  - ${f.code} (${f.asset})`);
    console.log(`    Management fee: ${f.management_fee_percent || 0}%`);
    console.log(`    Performance fee: ${f.performance_fee_percent || 0}%`);
    console.log(`    Fee recipient: ${f.fee_recipient_id || 'not set'}`);
  });

  // 7. Preview yield
  if (positions?.length > 0) {
    const fundId = positions[0].fund_id;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yieldDate = yesterday.toISOString().split("T")[0];

    console.log("\n7. Previewing yield...");
    console.log(`   Fund: ${fundId}`);
    console.log(`   Date: ${yieldDate}`);

    const { data: preview, error: previewErr } = await supabase.rpc("preview_daily_yield_to_fund_v3", {
      p_fund_id: fundId,
      p_yield_date: yieldDate,
      p_new_aum: 100,
      p_purpose: "reporting"
    });

    if (previewErr) {
      console.log("Preview error:", previewErr.message);
    } else {
      console.log("\nYield preview:");
      console.log(JSON.stringify(preview, null, 2));
    }
  }

  // 8. Check for INDIGO Fees account
  console.log("\n8. Looking for fee recipient accounts...");
  const { data: feeAccounts } = await supabase
    .from("profiles")
    .select("id, email, account_type, first_name, last_name, display_name")
    .or("email.ilike.%fee%,email.ilike.%indigo%,display_name.ilike.%fee%");

  console.log("\nPotential fee accounts:");
  feeAccounts?.forEach(p => {
    const name = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name || p.email;
    console.log(`  - ${name} | ${p.email} | ${p.account_type}`);
  });

  // 9. Check the yield preview function definition
  console.log("\n9. Looking at investor fee rates in positions...");
  const { data: positionsWithFees } = await supabase
    .from("investor_positions")
    .select("investor_id, fund_id, current_value, fee_rate, ib_fee_rate, funds(code)");

  console.log("\nPositions with fee rates:");
  positionsWithFees?.forEach(p => {
    console.log(`  - Investor: ${p.investor_id.slice(0,8)}... | Fund: ${p.funds?.code} | Value: ${p.current_value} | Fee: ${p.fee_rate || 0}% | IB Fee: ${p.ib_fee_rate || 0}%`);
  });

  console.log("\n" + "═".repeat(70));
}

investigate().catch(console.error);
