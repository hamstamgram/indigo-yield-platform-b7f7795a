const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function setup() {
  console.log("═".repeat(70));
  console.log("  SETTING UP BABAK WITH PROPER FEE STRUCTURE");
  console.log("═".repeat(70));

  // 1. Find Lars (the IB)
  console.log("\n1. Finding Lars (IB)...");
  const { data: lars, error: larsErr } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", "%lars%")
    .single();

  if (!lars) {
    console.log("Lars not found:", larsErr?.message);
    return;
  }
  console.log(`   Found Lars: ${lars.id}`);
  console.log(`   Lars account_type: ${lars.account_type}`);

  // 2. Find or create INDIGO Fees account
  console.log("\n2. Finding/creating INDIGO Fees account...");
  let { data: indigoFees } = await supabase
    .from("profiles")
    .select("*")
    .eq("account_type", "fees_account")
    .single();

  if (!indigoFees) {
    console.log("   Creating INDIGO Fees account...");
    // First create auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: "fees@indigo.fund",
      password: "IndigoFees123!",
      email_confirm: true
    });

    if (authErr && !authErr.message.includes('already')) {
      console.log("   Auth error:", authErr.message);
    }

    const feesUserId = authUser?.user?.id;
    if (feesUserId) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: feesUserId,
          email: "fees@indigo.fund",
          first_name: "INDIGO",
          last_name: "Fees",
          account_type: "fees_account",
          is_system_account: true,
          include_in_reporting: false,
          status: "active"
        });

      if (profileErr) {
        console.log("   Profile error:", profileErr.message);
      } else {
        console.log("   Created INDIGO Fees account:", feesUserId);
        indigoFees = { id: feesUserId };
      }
    }
  } else {
    console.log(`   Found INDIGO Fees: ${indigoFees.id}`);
  }

  // 3. Check if Babak exists
  console.log("\n3. Finding/creating Babak...");
  let { data: babak } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", "%babak%")
    .single();

  if (!babak) {
    console.log("   Babak not found, creating...");

    // Create auth user first
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: "babak@example.com",
      password: "Babak123!",
      email_confirm: true
    });

    if (authErr) {
      console.log("   Auth error:", authErr.message);
      // Try to get existing user
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === "babak@example.com");
      if (existing) {
        babak = { id: existing.id };
      } else {
        return;
      }
    } else {
      babak = { id: authUser.user.id };
    }

    // Create profile with fee settings
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({
        id: babak.id,
        email: "babak@example.com",
        first_name: "Babak",
        last_name: "Investor",
        account_type: "investor",
        status: "active",
        fee_pct: 18,           // Babak's 18% performance fee
        ib_parent_id: lars.id, // Lars is his IB
        ib_percentage: 2       // Lars gets 2% of gross yield
      });

    if (profileErr) {
      console.log("   Profile error:", profileErr.message);
      return;
    }
    console.log(`   Created Babak: ${babak.id}`);
  } else {
    console.log(`   Found existing Babak: ${babak.id}`);
    console.log(`   Current fee_pct: ${babak.fee_pct}`);
    console.log(`   Current ib_parent_id: ${babak.ib_parent_id}`);
    console.log(`   Current ib_percentage: ${babak.ib_percentage}`);

    // Update fee settings if needed
    if (babak.fee_pct !== 18 || babak.ib_parent_id !== lars.id || babak.ib_percentage !== 2) {
      console.log("   Updating fee settings...");
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          fee_pct: 18,
          ib_parent_id: lars.id,
          ib_percentage: 2
        })
        .eq("id", babak.id);

      if (updateErr) {
        console.log("   Update error:", updateErr.message);
      } else {
        console.log("   Updated Babak's fee settings");
      }
    }
  }

  // 4. Get the ETH fund
  console.log("\n4. Getting ETH fund...");
  const { data: fund } = await supabase
    .from("funds")
    .select("*")
    .eq("asset", "ETH")
    .eq("status", "active")
    .single();

  if (!fund) {
    console.log("   No ETH fund found");
    return;
  }
  console.log(`   Found fund: ${fund.code} (${fund.id})`);

  // 5. Create a position for Babak if needed
  console.log("\n5. Checking/creating Babak's position...");
  let { data: position } = await supabase
    .from("investor_positions")
    .select("*")
    .eq("investor_id", babak.id)
    .eq("fund_id", fund.id)
    .single();

  if (!position) {
    console.log("   Creating position with 10 ETH...");
    const { error: posErr } = await supabase
      .from("investor_positions")
      .insert({
        investor_id: babak.id,
        fund_id: fund.id,
        current_value: 10,
        total_invested: 10,
        total_yield_earned: 0,
        last_yield_date: null
      });

    if (posErr) {
      console.log("   Position error:", posErr.message);
      return;
    }
    console.log("   Created position: 10 ETH");
    position = { current_value: 10 };
  } else {
    console.log(`   Existing position: ${position.current_value} ETH`);
  }

  // 6. Create a deposit transaction
  console.log("\n6. Ensuring deposit transaction exists...");
  const { data: existingTx } = await supabase
    .from("transactions_v2")
    .select("*")
    .eq("investor_id", babak.id)
    .eq("fund_id", fund.id)
    .eq("type", "DEPOSIT")
    .single();

  if (!existingTx) {
    const { error: txErr } = await supabase.rpc("record_investor_deposit", {
      p_investor_id: babak.id,
      p_fund_id: fund.id,
      p_amount: 10,
      p_tx_date: new Date().toISOString().split("T")[0],
      p_reference: "BABAK-INIT-DEPOSIT"
    });

    if (txErr) {
      console.log("   Transaction error:", txErr.message);
      // Try direct insert as fallback
      console.log("   Trying direct deposit...");
    } else {
      console.log("   Created deposit transaction");
    }
  } else {
    console.log("   Deposit transaction exists");
  }

  // 7. Preview yield for Babak
  console.log("\n7. Previewing yield to verify fee structure...");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yieldDate = yesterday.toISOString().split("T")[0];

  // Simulate AUM increase (e.g., fund grew from 100 to 101 ETH = 1% yield)
  const { data: totalPositions } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", fund.id);

  const currentAUM = totalPositions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 100;
  const newAUM = currentAUM * 1.01; // 1% yield

  console.log(`   Current AUM: ${currentAUM} ETH`);
  console.log(`   New AUM: ${newAUM} ETH (simulating 1% yield)`);

  const { data: preview, error: previewErr } = await supabase.rpc("preview_daily_yield_to_fund_v3", {
    p_fund_id: fund.id,
    p_yield_date: yieldDate,
    p_new_aum: newAUM,
    p_purpose: "reporting"
  });

  if (previewErr) {
    console.log("   Preview error:", previewErr.message);
    return;
  }

  console.log("\n" + "═".repeat(70));
  console.log("  YIELD PREVIEW RESULT");
  console.log("═".repeat(70));

  console.log(`\nFund: ${preview.fundCode} (${preview.fundAsset})`);
  console.log(`Yield Date: ${preview.yieldDate}`);
  console.log(`Opening AUM: ${preview.currentAUM} ${preview.fundAsset}`);
  console.log(`New AUM: ${preview.newAUM} ${preview.fundAsset}`);
  console.log(`Gross Yield: ${preview.grossYield} ${preview.fundAsset}`);
  console.log(`Yield %: ${preview.yieldPercentage?.toFixed(4)}%`);

  console.log("\n--- Distributions ---");
  preview.distributions?.forEach(d => {
    console.log(`\n  ${d.investorName}:`);
    console.log(`    Current Balance: ${d.currentBalance} ETH`);
    console.log(`    Allocation: ${d.allocationPct?.toFixed(2)}%`);
    console.log(`    Gross Yield: ${d.grossYield?.toFixed(6)} ETH`);
    console.log(`    Fee %: ${d.feePct}%`);
    console.log(`    Fee Amount: ${d.feeAmount?.toFixed(6)} ETH`);
    console.log(`    IB %: ${d.ibPct}%`);
    console.log(`    IB Amount: ${d.ibAmount?.toFixed(6)} ETH`);
    console.log(`    Net Yield: ${d.netYield?.toFixed(6)} ETH`);
  });

  if (preview.ibCredits?.length > 0) {
    console.log("\n--- IB Credits ---");
    preview.ibCredits.forEach(ib => {
      console.log(`  ${ib.ibName}: ${ib.ibAmount?.toFixed(6)} ETH (${ib.ibPct}% from ${ib.sourceInvestorName})`);
    });
  }

  console.log("\n--- Totals ---");
  console.log(`  Total Fees: ${preview.totalFees?.toFixed(6)} ETH`);
  console.log(`  Total IB Fees: ${preview.totalIbFees?.toFixed(6)} ETH`);
  console.log(`  INDIGO Fees Credit: ${preview.indigoFeesCredit?.toFixed(6)} ETH`);
  console.log(`  Net to Investors: ${preview.netYield?.toFixed(6)} ETH`);

  // Verify Babak's fee structure
  const babakDist = preview.distributions?.find(d => d.investorName?.includes("Babak"));
  if (babakDist) {
    console.log("\n" + "═".repeat(70));
    console.log("  BABAK FEE VERIFICATION");
    console.log("═".repeat(70));
    console.log(`\n  Expected: 18% fee, 2% to Lars, 16% to INDIGO`);
    console.log(`  Actual Fee %: ${babakDist.feePct}%`);
    console.log(`  Actual IB %: ${babakDist.ibPct}%`);

    if (babakDist.feePct === 18 && babakDist.ibPct === 2) {
      console.log("\n  ✓ FEE STRUCTURE IS CORRECT!");
    } else {
      console.log("\n  ✗ FEE STRUCTURE MISMATCH!");
      console.log(`    Expected fee_pct: 18%, got: ${babakDist.feePct}%`);
      console.log(`    Expected ib_pct: 2%, got: ${babakDist.ibPct}%`);
    }
  } else {
    console.log("\n  Babak not found in distributions - checking if position exists...");
  }

  console.log("\n" + "═".repeat(70));
}

setup().catch(console.error);
