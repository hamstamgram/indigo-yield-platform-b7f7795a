/**
 * Compare platform balances against BOTH fund-balances.json and final_balances from excel-events-v3.json
 * to determine which is the true ground truth.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const s = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const fb = JSON.parse(readFileSync('scripts/seed-data/fund-balances.json', 'utf8'));
const ev = JSON.parse(readFileSync('scripts/seed-data/excel-events-v3.json', 'utf8'));
const finalBal = ev.final_balances;

const FUND_IDS = {
  BTC: '0a048d9b-c4cf-46eb-b428-59e10307df93',
  ETH: '717614a2-9e24-4abc-a89d-02209a3a772a',
  SOL: '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
  USDT: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
  XRP: '2c123c4f-76b4-4504-867e-059649855417',
};

function norm(n) {
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
const ALIASES = { 'kabbaj': 'family kabbaj' };

async function main() {
  let drifts = [];

  for (const [fund, fundId] of Object.entries(FUND_IDS)) {
    const { data: pos } = await s
      .from('investor_positions')
      .select('investor_id, current_value, profiles:investor_id (first_name, last_name)')
      .eq('fund_id', fundId)
      .eq('is_active', true);

    // Get latest month entries from fund-balances
    const latestMonths = {};
    for (const b of fb.filter(x => x.fund === fund)) {
      if (!latestMonths[fund] || b.month > latestMonths[fund]) latestMonths[fund] = b.month;
    }
    const latestMonth = latestMonths[fund];
    const entries = fb.filter(b => b.fund === fund && b.month === latestMonth);

    for (const p of pos) {
      const name = `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim();
      const plat = Number(p.current_value);
      const nk = norm(name);
      const lookupName = ALIASES[nk] || nk;

      // Last fund-balances entry
      const invEntries = entries.filter(e => norm(e.investor) === lookupName);
      const lastFB = invEntries.length > 0 ? invEntries[invEntries.length - 1].balance : null;

      // Best match fund-balances entry
      let bestFB = null;
      let bestDiff = Infinity;
      for (const e of invEntries) {
        const d = Math.abs(plat - e.balance);
        if (d < bestDiff) { bestDiff = d; bestFB = e.balance; }
      }

      // Final balances from excel-events-v3
      const fEntry = finalBal[fund]?.[p.investor_id];
      const fBal = fEntry ? fEntry.balance : null;

      const diffBestFB = bestFB !== null ? plat - bestFB : null;
      const diffLastFB = lastFB !== null ? plat - lastFB : null;
      const diffFinal = fBal !== null ? plat - fBal : null;

      drifts.push({ fund, name, plat, bestFB, lastFB, fBal, diffBestFB, diffLastFB, diffFinal });
    }
  }

  // Show all entries with any drift > 0.001
  console.log('Fund  | Investor                    | Platform         | BestMatch(FB)   | LastEntry(FB)   | Final(v3)       | Diff-Best       | Diff-Last       | Diff-Final');
  console.log('-'.repeat(170));

  for (const d of drifts) {
    const anyDrift = (d.diffBestFB !== null && Math.abs(d.diffBestFB) > 0.0005) ||
                     (d.diffFinal !== null && Math.abs(d.diffFinal) > 0.0005);
    if (!anyDrift) continue;

    const fmt = (v) => v !== null ? v.toFixed(8).padStart(16) : 'N/A'.padStart(16);
    console.log(
      d.fund.padEnd(6) +
      d.name.padEnd(30) +
      fmt(d.plat) +
      fmt(d.bestFB) +
      fmt(d.lastFB) +
      fmt(d.fBal) +
      fmt(d.diffBestFB) +
      fmt(d.diffLastFB) +
      fmt(d.diffFinal)
    );
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  let fbPass = 0, fbFail = 0, finalPass = 0, finalFail = 0;
  for (const d of drifts) {
    if (d.diffBestFB !== null) {
      if (Math.abs(d.diffBestFB) < 0.01) fbPass++; else fbFail++;
    }
    if (d.diffFinal !== null) {
      if (Math.abs(d.diffFinal) < 0.01) finalPass++; else finalFail++;
    }
  }
  console.log(`fund-balances.json (best match): ${fbPass} PASS / ${fbFail} FAIL`);
  console.log(`final_balances (excel-events-v3): ${finalPass} PASS / ${finalFail} FAIL`);
}

main().catch(e => { console.error(e); process.exit(1); });
