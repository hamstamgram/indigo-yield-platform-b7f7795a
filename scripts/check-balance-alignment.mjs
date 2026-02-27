/**
 * Check which Excel fund-balances entry matches the platform balance.
 * Tests hypothesis: the 3rd entry (index 2) for each investor in Jan 2026
 * corresponds to the last seeded event (2026-01-19) and should match platform.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const bal = JSON.parse(readFileSync('scripts/seed-data/fund-balances.json', 'utf8'));

const FUND_IDS = {
  BTC: '0a048d9b-c4cf-46eb-b428-59e10307df93',
  ETH: '717614a2-9e24-4abc-a89d-02209a3a772a',
  SOL: '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
  USDT: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
  XRP: '2c123c4f-76b4-4504-867e-059649855417',
};

function normalizeName(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const NAME_ALIASES = { 'kabbaj': 'family kabbaj' };

async function main() {
  for (const [fundName, fundId] of Object.entries(FUND_IDS)) {
    console.log(`\n=== ${fundName} ===`);

    // Get platform positions
    const { data: positions } = await supabase
      .from('investor_positions')
      .select('investor_id, current_value, profiles:investor_id (first_name, last_name)')
      .eq('fund_id', fundId)
      .eq('is_active', true);

    // Get IB schedules
    const { data: ibScheds } = await supabase
      .from('ib_commission_schedule')
      .select('investor_id, ib_percentage, effective_date')
      .eq('fund_id', fundId);

    const ibByInvestor = {};
    if (ibScheds) {
      for (const s of ibScheds) ibByInvestor[s.investor_id] = s;
    }

    // Get Jan 2026 balance entries
    const janEntries = bal.filter(b => b.fund === fundName && b.month === '2026-01');
    const byInvestor = {};
    for (const b of janEntries) {
      let nk = normalizeName(b.investor);
      if (NAME_ALIASES[nk]) nk = NAME_ALIASES[nk];
      if (byInvestor[nk] === undefined) byInvestor[nk] = { name: b.investor, entries: [] };
      byInvestor[nk].entries.push(b.balance);
    }

    console.log('Name'.padEnd(35) + 'Platform'.padStart(15) + 'Best Match'.padStart(15) + 'At Idx'.padStart(8) + 'Diff'.padStart(14) + '  IB  Status');

    for (const p of positions.sort((a, b) => (a.profiles?.last_name || '').localeCompare(b.profiles?.last_name || ''))) {
      const name = `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim();
      const platformBal = Number(p.current_value);
      const nk = normalizeName(name);
      const excelData = byInvestor[nk];

      if (!excelData || excelData.entries.length === 0) {
        console.log(name.padEnd(35) + platformBal.toFixed(2).padStart(15) + 'N/A (no Excel)'.padStart(15));
        continue;
      }

      // Find the entry with smallest absolute difference
      let bestIdx = 0;
      let bestDiff = Math.abs(platformBal - excelData.entries[0]);
      for (let i = 1; i < excelData.entries.length; i++) {
        const diff = Math.abs(platformBal - excelData.entries[i]);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }

      const bestEntry = excelData.entries[bestIdx];
      const diff = platformBal - bestEntry;
      const hasIB = ibByInvestor[p.investor_id] !== undefined;
      const status = Math.abs(diff) < 0.02 ? 'EXACT' : Math.abs(diff) < 1.0 ? 'CLOSE' : 'DRIFT';

      console.log(
        name.padEnd(35) +
        platformBal.toFixed(2).padStart(15) +
        bestEntry.toFixed(2).padStart(15) +
        `[${bestIdx}/${excelData.entries.length}]`.padStart(8) +
        diff.toFixed(4).padStart(14) +
        (hasIB ? '  IB' : '    ') +
        '  ' + status
      );
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
