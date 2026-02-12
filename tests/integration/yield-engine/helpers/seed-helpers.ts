/**
 * Seed Helpers for Yield Engine Integration Tests
 *
 * Creates test data for funds, investors, positions, and AUM.
 * All data is registered for automatic cleanup.
 */

import { v4 as uuidv4 } from "uuid";
import {
  supabase,
  registerTestFund,
  registerTestProfile,
  registerTestPosition,
  registerTestAumRecord,
  registerTestTransaction,
  registerTestDistribution,
} from "./supabase-client";

// Constants for test data
export const TEST_PREFIX = "test_";
export const DEFAULT_FEE_BPS = 3000; // 30%
export const DEFAULT_FEE_PCT = 30;

interface CreateFundOptions {
  name?: string;
  perf_fee_bps?: number;
  status?: string;
}

interface CreateInvestorOptions {
  email?: string;
  fee_pct?: number;
  account_type?: "investor" | "ib" | "fees_account";
  ib_parent_id?: string;
  ib_percentage?: number;
  is_system_account?: boolean;
}

interface CreatePositionOptions {
  current_value: string;
  cost_basis?: string;
  shares?: string;
  is_active?: boolean;
}

interface CreateAumOptions {
  fund_id: string;
  aum_date: string;
  total_aum: string;
  purpose?: "transaction" | "reporting";
}

/**
 * Create a test fund
 */
export async function createTestFund(
  options: CreateFundOptions = {}
): Promise<{ id: string; code: string; asset: string }> {
  const id = uuidv4();
  const code = `${TEST_PREFIX}${id.substring(0, 8)}`;
  // Always generate unique asset to avoid collision with existing active funds
  const testAsset = `T${id.substring(0, 6).toUpperCase()}`;

  const { error } = await supabase.from("funds").insert({
    id,
    code,
    name: options.name || `Test Fund ${code}`,
    asset: testAsset,
    fund_class: "standard",
    perf_fee_bps: options.perf_fee_bps ?? DEFAULT_FEE_BPS,
    status: options.status || "active",
    inception_date: "2024-01-01",
    min_investment: 0,
    min_withdrawal_amount: 0,
  });

  if (error) throw new Error(`Failed to create fund: ${error.message}`);

  registerTestFund(id);
  return { id, code, asset: testAsset };
}

/**
 * Create a test investor profile.
 * Creates auth.users entry first, then profile.
 */
export async function createTestInvestor(
  options: CreateInvestorOptions = {}
): Promise<{ id: string; email: string }> {
  const id = uuidv4();
  const email = options.email || `${TEST_PREFIX}${id.substring(0, 8)}@test.local`;

  // Create auth.users entry first (required for FK constraint)
  const { error: authError } = await supabase.rpc("test_create_auth_user", {
    p_user_id: id,
    p_email: email,
  });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  // Create profile (use upsert to handle auth trigger creating profile first)
  const profileData = {
    id,
    email,
    account_type: options.account_type || "investor",
    fee_pct: options.fee_pct ?? DEFAULT_FEE_PCT,
    ib_parent_id: options.ib_parent_id || null,
    ib_percentage: options.ib_percentage ?? 0,
    is_system_account: options.is_system_account ?? false,
    is_admin: false,
    status: "active",
    kyc_status: "approved",
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profileData, {
    onConflict: "id",
  });

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  // If IB account, also insert into user_roles (required by trg_validate_ib_parent_role)
  if (options.account_type === "ib") {
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: id,
      role: "ib",
    });
    if (roleError && !roleError.message.includes("duplicate")) {
      throw new Error(`Failed to create IB user role: ${roleError.message}`);
    }
  }

  registerTestProfile(id);
  return { id, email };
}

/**
 * Create a fees account (system account for receiving platform fees)
 */
export async function createFeesAccount(): Promise<{ id: string; email: string }> {
  const id = uuidv4();
  return createTestInvestor({
    email: `${TEST_PREFIX}fees_${id.substring(0, 8)}@indigo.local`,
    account_type: "fees_account",
    fee_pct: 0,
    is_system_account: true,
  });
}

/**
 * Create an admin user for testing RPCs that require admin authentication
 */
export async function createTestAdmin(): Promise<{ id: string; email: string }> {
  const id = uuidv4();
  const email = `${TEST_PREFIX}admin_${id.substring(0, 8)}@indigo.local`;

  // Create auth.users entry
  const { error: authError } = await supabase.rpc("test_create_auth_user", {
    p_user_id: id,
    p_email: email,
  });

  if (authError) {
    throw new Error(`Failed to create admin auth user: ${authError.message}`);
  }

  // Create profile with is_admin = true
  const { error: profileError } = await supabase.from("profiles").insert({
    id,
    email,
    account_type: "investor",
    fee_pct: 0,
    is_admin: true,
    status: "active",
    kyc_status: "approved",
  });

  if (profileError && !profileError.message.includes("duplicate")) {
    throw new Error(`Failed to create admin profile: ${profileError.message}`);
  }

  registerTestProfile(id);
  return { id, email };
}

/**
 * Create an IB (Introducing Broker) investor
 */
export async function createTestIB(
  options: { commission_pct?: number } = {}
): Promise<{ id: string; email: string }> {
  return createTestInvestor({
    account_type: "ib",
    ib_percentage: options.commission_pct ?? 10,
  });
}

/**
 * Create an investor with an IB parent.
 * V5 reads ib_percentage from the REFERRED investor's profile (not the IB's).
 */
export async function createInvestorWithIB(
  ibId: string,
  options: CreateInvestorOptions & { ib_commission_pct?: number } = {}
): Promise<{ id: string; email: string }> {
  const { ib_commission_pct, ...rest } = options;
  return createTestInvestor({
    ...rest,
    ib_parent_id: ibId,
    ib_percentage: ib_commission_pct ?? 10,
  });
}

/**
 * Create an investor position using test helper RPC (bypasses canonical guard)
 */
export async function createTestPosition(
  investor_id: string,
  fund_id: string,
  options: CreatePositionOptions
): Promise<void> {
  const { error } = await supabase.rpc("test_create_position", {
    p_investor_id: investor_id,
    p_fund_id: fund_id,
    p_current_value: options.current_value,
    p_cost_basis: options.cost_basis || options.current_value,
    p_shares: options.shares || options.current_value,
    p_is_active: options.is_active ?? true,
  });

  if (error) throw new Error(`Failed to create position: ${error.message}`);
  registerTestPosition(investor_id, fund_id);
}

/**
 * Create a fund daily AUM record using test helper RPC (bypasses canonical guard)
 */
export async function createTestAum(options: CreateAumOptions): Promise<string> {
  const id = uuidv4();

  const { error } = await supabase.rpc("test_create_aum", {
    p_id: id,
    p_fund_id: options.fund_id,
    p_aum_date: options.aum_date,
    p_total_aum: options.total_aum,
    p_purpose: options.purpose || "transaction",
  });

  if (error) throw new Error(`Failed to create AUM record: ${error.message}`);
  registerTestAumRecord(id);
  return id;
}

/**
 * Create a deposit transaction using test helper RPC (bypasses canonical guard)
 */
export async function createTestDeposit(
  investor_id: string,
  fund_id: string,
  amount: string,
  tx_date: string,
  asset: string
): Promise<string> {
  const id = uuidv4();
  const reference_id = `${TEST_PREFIX}deposit-${id}`;

  const { error } = await supabase.rpc("test_create_transaction", {
    p_id: id,
    p_investor_id: investor_id,
    p_fund_id: fund_id,
    p_type: "DEPOSIT",
    p_asset: asset,
    p_amount: amount,
    p_tx_date: tx_date,
    p_reference_id: reference_id,
  });

  if (error) throw new Error(`Failed to create deposit: ${error.message}`);
  registerTestTransaction(id);
  return id;
}

/**
 * Seed a standard test scenario with:
 * - 1 fund (BTC, 30% perf fee)
 * - 1 fees account
 * - N investors with positions
 */
export async function seedBasicScenario(config: {
  investors: Array<{
    balance: string;
    fee_pct?: number;
    deposit_day?: number;
    ib_parent_id?: string;
  }>;
  period_start: string;
  period_end: string;
  gross_yield: string;
}): Promise<{
  fund: { id: string; code: string };
  feesAccount: { id: string; email: string };
  investors: Array<{ id: string; email: string; balance: string }>;
}> {
  // Create fund (auto-generated unique asset)
  const fund = await createTestFund();

  // Create fees account
  const feesAccount = await createFeesAccount();

  // Create investors and positions
  const investors: Array<{ id: string; email: string; balance: string }> = [];
  for (const inv of config.investors) {
    const investor = await createTestInvestor({
      fee_pct: inv.fee_pct ?? DEFAULT_FEE_PCT,
      ib_parent_id: inv.ib_parent_id,
    });

    await createTestPosition(investor.id, fund.id, {
      current_value: inv.balance,
    });

    investors.push({ ...investor, balance: inv.balance });
  }

  // Create AUM records for period
  const startAum = investors.reduce((sum, inv) => sum + parseFloat(inv.balance), 0);
  await createTestAum({
    fund_id: fund.id,
    aum_date: config.period_start,
    total_aum: startAum.toString(),
    purpose: "transaction",
  });

  const endAum = startAum + parseFloat(config.gross_yield);
  await createTestAum({
    fund_id: fund.id,
    aum_date: config.period_end,
    total_aum: endAum.toString(),
    purpose: "transaction",
  });

  return { fund, feesAccount, investors };
}

/**
 * Get conservation identity values from a distribution
 */
export async function getDistributionConservation(distributionId: string): Promise<{
  gross_yield_amount: string;
  total_net_amount: string;
  total_fee_amount: string;
  total_ib_amount: string;
  dust_amount: string;
  conservation_holds: boolean;
}> {
  const { data, error } = await supabase
    .from("yield_distributions")
    .select("gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, dust_amount")
    .eq("id", distributionId)
    .single();

  if (error) throw new Error(`Failed to get distribution: ${error.message}`);

  const gross = parseFloat(data.gross_yield_amount);
  const net = parseFloat(data.total_net_amount);
  const fee = parseFloat(data.total_fee_amount);
  const ib = parseFloat(data.total_ib_amount);
  const dust = parseFloat(data.dust_amount);

  // Conservation: gross = net + fee + ib + dust
  const sum = net + fee + ib + dust;
  const conservation_holds = Math.abs(gross - sum) < 0.0000001; // 10^-7 tolerance

  return {
    ...data,
    conservation_holds,
  };
}
