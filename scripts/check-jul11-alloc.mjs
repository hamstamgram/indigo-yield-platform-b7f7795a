import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const s = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const fb = JSON.parse(readFileSync('scripts/seed-data/fund-balances.json', 'utf8'));

async function main() {
  // Get July 11 BTC yield distribution
  const { data: dists } = await s.from('yield_distributions')
    .select('id, period_end, gross_yield_amount, total_net_amount, total_fee_amount, dust_amount')
    .eq('fund_id', '0a048d9b-c4cf-46eb-b428-59e10307df93')
    .eq('is_voided', false)
    .order('period_end');

  // Find yield events around July 11
  for (const d of dists.filter(d => d.period_end >= '2025-06-01' && d.period_end <= '2025-08-01')) {
    console.log(`${d.period_end}: gross=${Number(d.gross_yield_amount).toFixed(10)} net=${Number(d.total_net_amount).toFixed(10)} fee=${Number(d.total_fee_amount).toFixed(10)} dust=${Number(d.dust_amount).toFixed(10)}`);
  }

  // Get July 11 distribution
  const jul11 = dists.find(d => d.period_end === '2025-07-11');
  if (!jul11) { console.log('No July 11 dist'); return; }

  console.log('\n=== PLATFORM: July 11 BTC Yield Distribution ===');
  console.log(`Gross: ${Number(jul11.gross_yield_amount).toFixed(10)}`);

  const { data: allocs, error: allocErr } = await s.from('yield_allocations')
    .select('investor_id, gross_amount, net_amount, ownership_pct, fee_pct, fee_amount, ib_amount, position_value_at_calc, profiles:investor_id(first_name, last_name)')
    .eq('distribution_id', jul11.id)
    .eq('is_voided', false);
  if (allocErr) { console.log('alloc error:', allocErr.message); return; }
  if (!allocs || allocs.length === 0) { console.log('No allocations found'); return; }

  console.log('\nInvestor'.padEnd(30) + 'Position'.padStart(14) + 'Own%'.padStart(10) + 'Gross'.padStart(14) + 'Fee'.padStart(14) + 'Net'.padStart(14) + 'Fee%'.padStart(8));
  for (const a of allocs.sort((x, y) => Number(y.gross_amount) - Number(x.gross_amount))) {
    const name = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.trim();
    console.log(
      name.padEnd(30) +
      Number(a.position_value_at_calc).toFixed(8).padStart(14) +
      (Number(a.ownership_pct) * 100).toFixed(4).padStart(10) + '%' +
      Number(a.gross_amount).toFixed(10).padStart(14) +
      Number(a.fee_amount).toFixed(10).padStart(14) +
      Number(a.net_amount).toFixed(10).padStart(14) +
      Number(a.fee_pct).toFixed(1).padStart(8)
    );
  }

  // Now compare against Excel: compute implied yield from fund-balances
  console.log('\n=== EXCEL: Implied July 11 BTC yields (from fund-balances) ===');
  // Get BTC balances grouped by investor for July
  const btcJul = fb.filter(e => e.fund === 'BTC' && e.month === '2025-07');
  const btcJun = fb.filter(e => e.fund === 'BTC' && e.month === '2025-06');

  // For each investor, find their balance just before July 11 (last June entry)
  // and their balance just after July 11 (first non-carried July entry)
  const investors = [...new Set(btcJul.map(e => e.investor))];

  // Group by investor
  const byInvestor = {};
  for (const e of btcJul) {
    if (!byInvestor[e.investor]) byInvestor[e.investor] = [];
    byInvestor[e.investor].push(e.balance);
  }
  const byInvestorJun = {};
  for (const e of btcJun) {
    if (!byInvestorJun[e.investor]) byInvestorJun[e.investor] = [];
    byInvestorJun[e.investor].push(e.balance);
  }

  // Find deposits on July 11 from events
  const ev = JSON.parse(readFileSync('scripts/seed-data/excel-events-v3.json', 'utf8'));
  const jul11Flow = ev.events.find(e => e.fund === 'BTC' && e.date === '2025-07-11' && e.event_type === 'FLOW');
  const depositMap = {};
  if (jul11Flow) {
    for (const tx of jul11Flow.transactions) {
      depositMap[tx.investor_name] = Number(tx.amount);
    }
  }

  console.log('Investor'.padEnd(30) + 'Before'.padStart(14) + 'After'.padStart(14) + 'Deposit'.padStart(14) + 'ImpliedNet'.padStart(14));
  for (const inv of investors) {
    const junEntries = byInvestorJun[inv] || [];
    const julEntries = byInvestor[inv] || [];
    const before = junEntries.length > 0 ? junEntries[junEntries.length - 1] : (julEntries.length > 0 ? julEntries[0] : 0);
    const after = julEntries.length > 1 ? julEntries[1] : (julEntries.length > 0 ? julEntries[0] : 0);
    const deposit = depositMap[inv] || 0;
    const impliedNet = after - before - deposit;
    if (Math.abs(impliedNet) > 0.00001 || deposit > 0) {
      console.log(
        inv.padEnd(30) +
        before.toFixed(10).padStart(14) +
        after.toFixed(10).padStart(14) +
        deposit.toFixed(10).padStart(14) +
        impliedNet.toFixed(10).padStart(14)
      );
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
