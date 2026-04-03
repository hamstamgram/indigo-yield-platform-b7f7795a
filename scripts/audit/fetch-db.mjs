// scripts/audit/fetch-db.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';

let _client = null;
function getClient() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return _client;
}

/**
 * Fetch all yield_distributions for a fund (non-voided), ordered by date.
 */
export async function fetchDistributions(fundId) {
  const { data, error } = await getClient()
    .from('yield_distributions')
    .select(
      'id, effective_date, gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, opening_aum, closing_aum, investor_count'
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false')
    .order('effective_date');
  if (error) throw new Error(`fetchDistributions: ${error.message}`);
  return data;
}

/**
 * Fetch all yield_allocations for a fund (non-voided), with investor profile names.
 */
export async function fetchAllocations(fundId) {
  const { data, error } = await getClient()
    .from('yield_allocations')
    .select(
      `id, distribution_id, investor_id, position_value_at_calc, ownership_pct,
       gross_amount, fee_pct, fee_amount, ib_pct, ib_amount, net_amount,
       fee_credit, ib_credit, adb_share`
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false');
  if (error) throw new Error(`fetchAllocations: ${error.message}`);
  return data;
}

/**
 * Fetch all DEPOSIT/WITHDRAWAL transactions for a fund (non-voided).
 */
export async function fetchTransactions(fundId) {
  const { data, error } = await getClient()
    .from('transactions_v2')
    .select(
      'id, tx_date, type, amount, balance_before, balance_after, investor_id, notes'
    )
    .eq('fund_id', fundId)
    .in('type', ['DEPOSIT', 'WITHDRAWAL'])
    .or('is_voided.is.null,is_voided.eq.false')
    .order('tx_date');
  if (error) throw new Error(`fetchTransactions: ${error.message}`);
  return data;
}

/**
 * Fetch current investor_positions for a fund.
 */
export async function fetchPositions(fundId) {
  const { data, error } = await getClient()
    .from('investor_positions')
    .select('investor_id, current_value, is_active, cumulative_yield_earned')
    .eq('fund_id', fundId);
  if (error) throw new Error(`fetchPositions: ${error.message}`);
  return data;
}

/**
 * Fetch all fee_allocations for a fund (non-voided).
 */
export async function fetchFeeAllocations(fundId) {
  const { data, error } = await getClient()
    .from('fee_allocations')
    .select(
      'id, distribution_id, investor_id, fee_percentage, fee_amount, base_net_income, period_start, period_end, purpose'
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false')
    .order('period_start');
  if (error) throw new Error(`fetchFeeAllocations: ${error.message}`);
  return data;
}

/**
 * Fetch all ib_allocations for a fund (non-voided).
 */
export async function fetchIBAllocations(fundId) {
  const { data, error } = await getClient()
    .from('ib_allocations')
    .select(
      'id, distribution_id, ib_investor_id, source_investor_id, ib_percentage, ib_fee_amount, effective_date, source_net_income'
    )
    .eq('fund_id', fundId)
    .or('is_voided.is.null,is_voided.eq.false')
    .order('effective_date');
  if (error) throw new Error(`fetchIBAllocations: ${error.message}`);
  return data;
}

/**
 * Fetch profiles for all investors in a fund's positions.
 * Returns Map<investor_id, display_name>.
 */
export async function fetchInvestorNames(fundId) {
  // First get investor IDs from positions
  const positions = await fetchPositions(fundId);
  const investorIds = positions.map((p) => p.investor_id);

  if (investorIds.length === 0) return new Map();

  const { data, error } = await getClient()
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', investorIds);
  if (error) throw new Error(`fetchInvestorNames: ${error.message}`);

  const nameMap = new Map();
  for (const p of data) {
    const displayName = `${p.first_name} ${p.last_name}`.trim();
    nameMap.set(p.id, displayName);
  }
  return nameMap;
}

/**
 * Fetch DUST_SWEEP and DUST transactions for a fund.
 * These handle full-exit dust routing (residual balance → Indigo Fees).
 * Critical for accurate balance reconstruction.
 */
export async function fetchDustTransactions(fundId) {
  const { data, error } = await getClient()
    .from('transactions_v2')
    .select('id, tx_date, type, amount, investor_id')
    .eq('fund_id', fundId)
    .in('type', ['DUST_SWEEP', 'DUST'])
    .or('is_voided.is.null,is_voided.eq.false')
    .order('tx_date');
  if (error) throw new Error(`fetchDustTransactions: ${error.message}`);
  return data;
}
