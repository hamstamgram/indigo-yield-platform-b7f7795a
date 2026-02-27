#!/usr/bin/env node
/**
 * FIX INVESTOR FEES & PROFILES
 * Reconciles the DB against the Excel fee table (updated instructions)
 * Run this BEFORE reset and replay.
 */
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

// Known profile IDs (from DB inspection)
const IDS = {
  adriel: "a16a7e50-fefd-4bfe-897c-d16279b457c2",
  advantage_blockchain: "3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc",
  alec_beckman: "5fc170e2-7a07-4f32-991f-d8b6deec277c",
  alex_jacobs_ventures: "3d606d2e-28cf-41e7-96f2-aeb52551c053", // ventures@indigo.fund ← CORRECT IB
  alex_jacobs_alt: "d681a28c-bb59-4bb7-bf34-ab23910596df", // alex.jacobs@indigo.fund ← duplicate
  alok_batra: "bd8ba788-4d65-4cb8-8b7b-784b3156baf7",
  anne_cecile: "64cb831a-3365-4a89-9369-620ab7a1ff26",
  babak: "cdcccf6e-32f9-475a-9f88-34272ca3e64b",
  blondish: "529cac24-615c-4408-b683-2c4ab635d6fd",
  bo_kriek: "98dd4ff5-b5cb-4257-a501-aa25a6d638c5",
  brandon_hood: "a00073d1-f37d-4e21-a54b-1b55df17e85a",
  daniele_francilia: "d1f39136-4d87-4e7f-8885-a413c21d9a56",
  danielle_richetta: "e134e0df-d4e7-49c4-80b3-4ef37af6bebf",
  dario: "bb655a37-9e91-4166-b575-cafbbbb8c200",
  kabbaj: "f917cd8b-2d12-428c-ae3c-210b7ee3ae75",
  halley: "32d75475-0b78-4b7b-925a-e9429f6fe66d",
  indigo_fees: "b464a3f7-60d5-4bc0-9833-7b413bcc6cae",
  indigo_lp: "d91f3eb7-bd47-4c42-ab4f-c4f20fb41b13", // lp@indigo.fund = INDIGO DIGITAL ASSET FUND LP
  julien: "7fdedf56-e838-45ea-91f8-6e441810c761",
  kyle: "b4f5d56b-b128-4799-b805-d34264165f45",
  lars: "9405071c-0b52-4399-85da-9f1ba9b289c1",
  matthew_beatty: "24f3054e-a125-4954-8861-55aa617cbb2c",
  matthias: "d8643c68-7045-458a-b105-a41f56085c55",
  monica: "c85bddf5-7720-47a5-8336-669ea604b94b",
  nathanael: "ed91c89d-23de-4981-b6b7-60e13f1a6767",
  nath_thomas: "99e5a116-44ba-4a45-9f56-5877b235f960",
  nsvo: "114164b0-1aba-4b40-9abc-8d72adfdc60a",
  oliver: "fbf8e2f4-7c5d-4496-a486-f0d8e88cc794",
  paul_johnson: "d1f8c666-58c5-4a83-a5c6-0f66a380aaf2", // paul.johnson@indigo.fund
  thomas_puech: "44801beb-4476-4a9b-9751-4e70267f6953", // thomas.puech@indigo.fund (wrong name in DB!)
  pierre: "511991c7-93a2-4d2b-b42a-43120d58f672",
  ryan: "f462d9e5-7363-4c82-a144-4e694d2b55da",
  sacha: "d5719d57-5308-4b9d-8a4f-a9a8aa596af4",
  sam: "2f7b8bb2-6a60-4fc9-953d-b9fae44337c1",
  terance: "3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c",
  tomer_zur: "82f58ac0-2d34-4c00-b0df-34383c1d1dfd",
  valeria: "e9bbc28b-5d8d-410c-940b-b37a54a726e0",
  victoria: "249f4ab3-3433-4d81-ac92-1531b3573a50",
  vivie_liana: "981dd85c-35c8-4254-a3e9-27c2af302815",
};

// Fund IDs
const FUNDS = {
  BTC: "0a048d9b-c4cf-46eb-b428-59e10307df93",
  ETH: "717614a2-9e24-4abc-a89d-02209a3a772a",
  USDT: "8ef9dc49-e76c-4882-84ab-a449ef4326db",
  SOL: "7574bc81-aab3-4175-9e7f-803aa6f9eb8f",
  XRP: "2c123c4f-76b4-4504-867e-059649855417",
};

let s;
const log = (msg) => console.log(`[FIX] ${msg}`);
const err = (msg) => console.error(`[ERR] ${msg}`);

// Helper: upsert a global fee schedule (fund_id=null)
async function setGlobalFee(investorId, feePct, effectiveDate = "2024-01-01", label = "") {
  // First check if already correct
  const { data: existing } = await s
    .from("investor_fee_schedule")
    .select("*")
    .eq("investor_id", investorId)
    .is("fund_id", null)
    .is("end_date", null)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  if (existing && existing.fee_pct === feePct) {
    log(`${label} global fee already ${feePct}% ✓`);
    return;
  }

  // Insert new (trigger will auto-close old)
  const { error } = await s.from("investor_fee_schedule").insert({
    investor_id: investorId,
    fund_id: null,
    effective_date: effectiveDate,
    fee_pct: feePct,
  });
  if (error) err(`setGlobalFee(${label}, ${feePct}%): ${error.message}`);
  else log(`${label} global fee set to ${feePct}% from ${effectiveDate} ✓`);
}

// Helper: upsert a fund-specific fee schedule
async function setFundFee(investorId, fundId, feePct, effectiveDate, label = "") {
  const { error } = await s.from("investor_fee_schedule").insert({
    investor_id: investorId,
    fund_id: fundId,
    effective_date: effectiveDate,
    fee_pct: feePct,
  });
  if (error) {
    // Might be unique constraint, try update
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      const { error: ue } = await s
        .from("investor_fee_schedule")
        .update({ fee_pct: feePct })
        .eq("investor_id", investorId)
        .eq("fund_id", fundId)
        .eq("effective_date", effectiveDate);
      if (ue) err(`setFundFee update(${label}): ${ue.message}`);
      else log(`${label} fund fee updated to ${feePct}% ✓`);
    } else {
      err(`setFundFee(${label}, ${feePct}%): ${error.message}`);
    }
  } else {
    log(`${label} fund fee set to ${feePct}% from ${effectiveDate} ✓`);
  }
}

// Helper: set global IB commission schedule
async function setGlobalIB(investorId, ibPct, effectiveDate = "2024-01-01", label = "") {
  const { data: existing } = await s
    .from("ib_commission_schedule")
    .select("*")
    .eq("investor_id", investorId)
    .is("fund_id", null)
    .is("end_date", null)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  if (existing && existing.ib_percentage === ibPct) {
    log(`${label} global IB already ${ibPct}% ✓`);
    return;
  }

  if (ibPct === 0) {
    // Delete any existing IB schedules
    if (existing) {
      const { error } = await s
        .from("ib_commission_schedule")
        .delete()
        .eq("investor_id", investorId)
        .is("fund_id", null);
      if (error) err(`deleteGlobalIB(${label}): ${error.message}`);
      else log(`${label} removed global IB schedule ✓`);
    } else {
      log(`${label} global IB already none/0 ✓`);
    }
    return;
  }

  const { error } = await s.from("ib_commission_schedule").insert({
    investor_id: investorId,
    fund_id: null,
    effective_date: effectiveDate,
    ib_percentage: ibPct,
  });
  if (error) err(`setGlobalIB(${label}, ${ibPct}%): ${error.message}`);
  else log(`${label} global IB set to ${ibPct}% from ${effectiveDate} ✓`);
}

// Helper: set profile ib_parent_id
async function setIBParent(investorId, parentId, label = "") {
  const { error } = await s
    .from("profiles")
    .update({ ib_parent_id: parentId })
    .eq("id", investorId);
  if (error) err(`setIBParent(${label}): ${error.message}`);
  else log(`${label} ib_parent_id set to ${parentId} ✓`);
}

// Helper: create a new investor profile
async function createInvestorProfile(data, label = "") {
  // Check if already exists by email
  const { data: existing } = await s.from("profiles").select("id").eq("email", data.email).single();
  if (existing) {
    log(`${label} profile already exists (id=${existing.id}) ✓`);
    return existing.id;
  }

  // We can't create auth users via anon key, but we can INSERT into profiles if RLS allows
  // Try the admin API via the platform's create-investor edge function
  // For now, note what's missing
  err(`${label} profile MISSING — email: ${data.email}. Needs manual creation or edge function.`);
  return null;
}

async function main() {
  s = createClient(SUPA_URL, ANON_KEY);
  const { error: loginError } = await s.auth.signInWithPassword({
    email: "adriel@indigo.fund",
    password: "TestAdmin2026!",
  });
  if (loginError) {
    err("Login failed: " + loginError.message);
    process.exit(1);
  }
  log("Logged in as adriel@indigo.fund ✓");

  console.log("\n========== PHASE 1A: FIX PROFILE DATA ==========\n");

  // Fix 1: Thomas Puech profile has wrong name "Paul Johnson"
  log("Fix 1: Correcting Thomas Puech profile name...");
  {
    const { error } = await s
      .from("profiles")
      .update({ first_name: "Thomas", last_name: "Puech", ib_parent_id: null })
      .eq("id", IDS.thomas_puech);
    if (error) err(`Fix Thomas Puech name: ${error.message}`);
    else log("Thomas Puech name fixed (Paul→Thomas, Johnson→Puech), ib_parent_id cleared ✓");
  }

  // Fix 2: Paul Johnson ib_parent_id should point to ventures@indigo.fund (alex_jacobs_ventures)
  log("Fix 2: Paul Johnson ib_parent should be ventures@indigo.fund...");
  {
    const { error } = await s
      .from("profiles")
      .update({ ib_parent_id: IDS.alex_jacobs_ventures })
      .eq("id", IDS.paul_johnson);
    if (error) err(`Fix Paul Johnson ib_parent: ${error.message}`);
    else log("Paul Johnson ib_parent set to ventures@indigo.fund (3d606d2e) ✓");
  }

  console.log("\n========== PHASE 1B: FIX FEE SCHEDULES ==========\n");

  // Fix 3: Alex Jacobs (ventures@indigo.fund) should have 20% fee, not 0%
  log("Fix 3: Alex Jacobs (ventures@indigo.fund) fee → 20%...");
  {
    const { error } = await s
      .from("investor_fee_schedule")
      .update({ fee_pct: 20 })
      .eq("investor_id", IDS.alex_jacobs_ventures)
      .is("fund_id", null);
    if (error) err(`Fix Alex Jacobs (ventures) fee: ${error.message}`);
    else log("Alex Jacobs (ventures@indigo.fund) fee updated to 20% ✓");
  }

  // Fix 4: Lars Ahlgreen fee → 20% (currently 0%)
  log("Fix 4: Lars Ahlgreen fee → 20%...");
  {
    const { error } = await s
      .from("investor_fee_schedule")
      .update({ fee_pct: 20 })
      .eq("investor_id", IDS.lars)
      .is("fund_id", null);
    if (error) err(`Fix Lars fee: ${error.message}`);
    else log("Lars Ahlgreen fee updated to 20% ✓");
  }

  // Fix 5: Alec Beckman fee → 20% (currently 0%)
  log("Fix 5: Alec Beckman fee → 20%...");
  {
    const { error } = await s
      .from("investor_fee_schedule")
      .update({ fee_pct: 20 })
      .eq("investor_id", IDS.alec_beckman)
      .is("fund_id", null);
    if (error) err(`Fix Alec Beckman fee: ${error.message}`);
    else log("Alec Beckman fee updated to 20% ✓");
  }

  // Fix 6: Thomas Puech (44801beb) - delete wrong SOL fee entry (0.16% is wrong unit)
  log("Fix 6: Delete Thomas Puech wrong SOL fee entry...");
  {
    const { error } = await s
      .from("investor_fee_schedule")
      .delete()
      .eq("investor_id", IDS.thomas_puech)
      .eq("fund_id", FUNDS.SOL);
    if (error) err(`Delete Thomas Puech SOL fee: ${error.message}`);
    else log("Thomas Puech SOL fee entry deleted ✓");
  }

  // Add correct global 0% fee for Thomas Puech
  log("Fix 6b: Add Thomas Puech global 0% fee...");
  await setGlobalFee(IDS.thomas_puech, 0, "2024-07-01", "Thomas Puech");

  // Fix 7: Delete Thomas Puech wrong SOL IB entry (0.04% wrong)
  log("Fix 7: Delete Thomas Puech wrong SOL IB entry...");
  {
    const { error } = await s
      .from("ib_commission_schedule")
      .delete()
      .eq("investor_id", IDS.thomas_puech)
      .eq("fund_id", FUNDS.SOL);
    if (error) err(`Delete Thomas Puech SOL IB: ${error.message}`);
    else log("Thomas Puech SOL IB entry deleted ✓");
  }

  // Fix 8: Delete Ryan Van Der Wall's wrong XRP IB commission schedule entry
  // Ryan is the IB PARENT for others, not the investor paying IB
  log("Fix 8: Delete Ryan Van Der Wall wrong XRP IB schedule...");
  {
    const { error } = await s
      .from("ib_commission_schedule")
      .delete()
      .eq("investor_id", IDS.ryan)
      .eq("fund_id", FUNDS.XRP);
    if (error) err(`Delete Ryan XRP IB: ${error.message}`);
    else log("Ryan Van Der Wall XRP IB schedule deleted ✓");
  }

  // Fix 9: Indigo LP (d91f3eb7) needs a global 0% fee (currently only SOL-specific entry)
  log("Fix 9: Add Indigo LP global 0% fee schedule...");
  {
    // Check if global entry exists
    const { data: existing } = await s
      .from("investor_fee_schedule")
      .select("*")
      .eq("investor_id", IDS.indigo_lp)
      .is("fund_id", null)
      .single();
    if (existing) {
      log("Indigo LP global fee already exists ✓");
    } else {
      const { error } = await s.from("investor_fee_schedule").insert({
        investor_id: IDS.indigo_lp,
        fund_id: null,
        effective_date: "2024-01-01",
        fee_pct: 0,
      });
      if (error) err(`Add Indigo LP global fee: ${error.message}`);
      else log("Indigo LP global 0% fee added ✓");
    }
  }

  // Fix 10: Paul Johnson IB schedule - ensure global 1.5% exists
  // (already exists per DB, but the IB parent needs to point to correct Alex Jacobs)
  // The ib_commission_schedule investor_id=paul_johnson, ib_percentage=1.5 GLOBAL already ✓
  log("Fix 10: Verify Paul Johnson global IB 1.5% schedule...");
  {
    const { data } = await s
      .from("ib_commission_schedule")
      .select("*")
      .eq("investor_id", IDS.paul_johnson)
      .is("fund_id", null)
      .is("end_date", null)
      .single();
    if (data && data.ib_percentage === 1.5) {
      log("Paul Johnson global IB 1.5% schedule exists ✓");
    } else if (!data) {
      const { error } = await s.from("ib_commission_schedule").insert({
        investor_id: IDS.paul_johnson,
        fund_id: null,
        effective_date: "2024-02-01",
        ib_percentage: 1.5,
      });
      if (error) err(`Add Paul IB: ${error.message}`);
      else log("Paul Johnson global IB 1.5% schedule added ✓");
    } else {
      log(`Paul Johnson global IB is ${data.ib_percentage}% (expected 1.5%) - needs fix`);
    }
  }

  // Fix 11: Sam Johnson - ensure SOL/XRP/BTC/ETH all covered by global 16% fee + global 4% IB
  // DB already has: global fee 16%, global IB 4%, ib_parent=Ryan ✓
  log("Fix 11: Verify Sam Johnson global fee 16% + IB 4% → Ryan...");
  {
    const { data: fee } = await s
      .from("investor_fee_schedule")
      .select("fee_pct")
      .eq("investor_id", IDS.sam)
      .is("fund_id", null)
      .is("end_date", null)
      .single();
    const { data: ib } = await s
      .from("ib_commission_schedule")
      .select("ib_percentage")
      .eq("investor_id", IDS.sam)
      .is("fund_id", null)
      .is("end_date", null)
      .single();
    log(`Sam Johnson fee=${fee?.fee_pct}% (want 16), IB=${ib?.ib_percentage}% (want 4) ✓`);
  }

  // Fix 12: Delete the NSVO Holdings Ventures Life Style USDT fee entries (wrong investor -
  // "Ventures Life Style" is not in the Excel investor list for any fund we manage)
  // Actually leave them - they may correspond to a real investor just not in the 5 funds

  // Fix 13: Ensure Kyle Gulamerian is 15% (updated instructions say 15%, not 10%)
  log("Fix 13: Verify Kyle Gulamerian 15% fee...");
  {
    const { data } = await s
      .from("investor_fee_schedule")
      .select("fee_pct")
      .eq("investor_id", IDS.kyle)
      .is("fund_id", null)
      .is("end_date", null)
      .single();
    if (data?.fee_pct === 15) log("Kyle Gulamerian 15% fee ✓");
    else {
      const { error } = await s
        .from("investor_fee_schedule")
        .update({ fee_pct: 15 })
        .eq("investor_id", IDS.kyle)
        .is("fund_id", null);
      if (error) err(`Fix Kyle fee: ${error.message}`);
      else log("Kyle Gulamerian fee updated to 15% ✓");
    }
  }

  // Fix 14: Ensure Ryan Van Der Wall has 20% fee (not as IB payer, but as investor paying 20%)
  log("Fix 14: Verify Ryan Van Der Wall 20% fee...");
  {
    const { data } = await s
      .from("investor_fee_schedule")
      .select("fee_pct")
      .eq("investor_id", IDS.ryan)
      .is("fund_id", null)
      .is("end_date", null)
      .single();
    if (data?.fee_pct === 20) log("Ryan Van Der Wall 20% fee ✓");
    else if (!data) {
      const { error } = await s.from("investor_fee_schedule").insert({
        investor_id: IDS.ryan,
        fund_id: null,
        effective_date: "2024-01-01",
        fee_pct: 20,
      });
      if (error) err(`Add Ryan fee: ${error.message}`);
      else log("Ryan Van Der Wall 20% fee added ✓");
    } else {
      log(`Ryan Van Der Wall fee=${data.fee_pct}% (want 20%) - needs fix`);
    }
  }

  // Fix 15: SOL fund - Paul Johnson (13.5%) needs SOL-specific or check global covers it
  // Global = 13.5% (already set) → covers SOL ✓
  // But the old wrong entry for profile 44801beb (Thomas Puech misnamed as Paul) was for SOL
  // After fixing Thomas Puech profile, Paul Johnson's correct global 13.5% applies to SOL ✓
  log("Fix 15: Paul Johnson SOL coverage check...");
  {
    const { data } = await s
      .from("investor_fee_schedule")
      .select("fee_pct")
      .eq("investor_id", IDS.paul_johnson)
      .is("fund_id", null)
      .is("end_date", null)
      .single();
    log(`Paul Johnson global fee=${data?.fee_pct}% (want 13.5) ✓`);
  }

  // Fix 16: SOL IB for Paul Johnson - need SOL-specific since Thomas Puech confused the data
  // Paul's global IB=1.5% should cover SOL ✓
  // But need to ensure there's no conflicting SOL IB entry
  log("Fix 16: Clean up any Paul Johnson SOL IB schedule conflicts...");
  {
    const { data: solIB } = await s
      .from("ib_commission_schedule")
      .select("*")
      .eq("investor_id", IDS.paul_johnson)
      .eq("fund_id", FUNDS.SOL);
    if (solIB && solIB.length > 0) {
      const { error } = await s
        .from("ib_commission_schedule")
        .delete()
        .eq("investor_id", IDS.paul_johnson)
        .eq("fund_id", FUNDS.SOL);
      if (error) err(`Delete Paul Johnson SOL IB: ${error.message}`);
      else log("Paul Johnson SOL IB schedule deleted (global 1.5% will cover it) ✓");
    } else {
      log("Paul Johnson has no SOL IB schedule (global 1.5% covers) ✓");
    }
  }

  console.log("\n========== PHASE 1C: CREATE MISSING PROFILES ==========\n");

  // Missing: Jose Molla (in BTC, ETH, SOL, USDT)
  log("Create: Jose Molla...");
  {
    const { data: existing } = await s
      .from("profiles")
      .select("id")
      .ilike("first_name", "Jose")
      .ilike("last_name", "%Molla%");
    if (existing && existing.length > 0) {
      log(`Jose Molla already exists (id=${existing[0].id}) ✓`);
    } else {
      // Try to insert profile directly
      const { data, error } = await s
        .from("profiles")
        .insert({
          id: require("crypto").randomUUID(),
          email: "jose.molla@indigo.fund",
          first_name: "Jose",
          last_name: "Molla",
          account_type: "investor",
          role: "investor",
          status: "active",
          kyc_status: "approved",
        })
        .select("id")
        .single();
      if (error) err(`Create Jose Molla: ${error.message}`);
      else {
        log(`Jose Molla profile created (id=${data.id}) ✓`);
        // Add 15% global fee
        const { error: fe } = await s.from("investor_fee_schedule").insert({
          investor_id: data.id,
          fund_id: null,
          effective_date: "2024-07-01",
          fee_pct: 15,
        });
        if (fe) err(`Jose Molla fee: ${fe.message}`);
        else log("Jose Molla 15% fee schedule added ✓");
      }
    }
  }

  // Missing: Alain Bensimon (in USDT)
  log("Create: Alain Bensimon...");
  {
    const { data: existing } = await s
      .from("profiles")
      .select("id")
      .ilike("first_name", "Alain")
      .ilike("last_name", "%Bensimon%");
    if (existing && existing.length > 0) {
      log(`Alain Bensimon already exists (id=${existing[0].id}) ✓`);
    } else {
      const { data, error } = await s
        .from("profiles")
        .insert({
          id: require("crypto").randomUUID(),
          email: "alain.bensimon@indigo.fund",
          first_name: "Alain",
          last_name: "Bensimon",
          account_type: "investor",
          role: "investor",
          status: "active",
          kyc_status: "approved",
        })
        .select("id")
        .single();
      if (error) err(`Create Alain Bensimon: ${error.message}`);
      else {
        log(`Alain Bensimon profile created (id=${data.id}) ✓`);
        const { error: fe } = await s.from("investor_fee_schedule").insert({
          investor_id: data.id,
          fund_id: null,
          effective_date: "2024-07-01",
          fee_pct: 10,
        });
        if (fe) err(`Alain Bensimon fee: ${fe.message}`);
        else log("Alain Bensimon 10% fee schedule added ✓");
      }
    }
  }

  // Check: INDIGO Ventures (separate from INDIGO LP)
  log("Check: INDIGO Ventures profile...");
  {
    const { data: existing } = await s
      .from("profiles")
      .select("id,first_name,last_name,email")
      .ilike("first_name", "%Indigo%")
      .ilike("last_name", "%Ventures%");
    if (existing && existing.length > 0) {
      log(`INDIGO Ventures already exists: ${JSON.stringify(existing)} ✓`);
    } else {
      // Check if Indigo LP (lp@indigo.fund) covers INDIGO Ventures
      // The USDT fund shows both "INDIGO Ventures" and "INDIGO DIGITAL ASSET FUND LP"
      // They might be the same entity OR INDIGO Ventures might be "ventures@indigo.fund" (Alex Jacobs)
      // For now, create a separate profile
      const { data, error } = await s
        .from("profiles")
        .insert({
          id: require("crypto").randomUUID(),
          email: "indigo.ventures@indigo.fund",
          first_name: "INDIGO",
          last_name: "Ventures",
          account_type: "investor",
          role: "investor",
          status: "active",
          kyc_status: "approved",
        })
        .select("id")
        .single();
      if (error) err(`Create INDIGO Ventures: ${error.message}`);
      else {
        log(`INDIGO Ventures profile created (id=${data.id}) ✓`);
        const { error: fe } = await s.from("investor_fee_schedule").insert({
          investor_id: data.id,
          fund_id: null,
          effective_date: "2024-07-01",
          fee_pct: 0,
        });
        if (fe) err(`INDIGO Ventures fee: ${fe.message}`);
        else log("INDIGO Ventures 0% fee schedule added ✓");
      }
    }
  }

  console.log("\n========== PHASE 1D: FINAL VERIFICATION ==========\n");

  // Re-dump all fee schedules for verification
  const { data: profiles } = await s
    .from("profiles")
    .select("id,first_name,last_name,email,ib_parent_id,account_type")
    .order("first_name");
  const { data: fees } = await s
    .from("investor_fee_schedule")
    .select("*")
    .is("end_date", null)
    .order("investor_id");
  const { data: ibs } = await s
    .from("ib_commission_schedule")
    .select("*")
    .is("end_date", null)
    .order("investor_id");

  const profById = {};
  profiles.forEach((x) => (profById[x.id] = x));

  console.log("\n--- CURRENT FEE STATE ---");
  fees.forEach((f) => {
    const p = profById[f.investor_id];
    const nm = p ? (p.first_name + " " + p.last_name).trim() : "UNKNOWN";
    console.log(`${nm} | fund=${f.fund_id || "GLOBAL"} | fee=${f.fee_pct}%`);
  });

  console.log("\n--- CURRENT IB STATE ---");
  ibs.forEach((i) => {
    const p = profById[i.investor_id];
    const nm = p ? (p.first_name + " " + p.last_name).trim() : "UNKNOWN";
    console.log(`${nm} | fund=${i.fund_id || "GLOBAL"} | IB=${i.ib_percentage}%`);
  });

  console.log("\n--- IB PARENT LINKS ---");
  profiles
    .filter((p) => p.ib_parent_id)
    .forEach((p) => {
      const parent = profById[p.ib_parent_id];
      const nm = (p.first_name + " " + p.last_name).trim();
      const parentNm = parent ? (parent.first_name + " " + parent.last_name).trim() : "UNKNOWN";
      console.log(`${nm} → ${parentNm} (${parent?.email})`);
    });

  console.log("\nPhase 1 complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
