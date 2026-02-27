/**
 * Analyze the remaining 9 balance drifts in detail.
 * For each failing investor, trace through events and compare running balance.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const s = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const ev = JSON.parse(readFileSync('scripts/seed-data/excel-events-v3.json', 'utf8'));
const fb = JSON.parse(readFileSync('scripts/seed-data/fund-balances.json', 'utf8'));

const FUND_IDS = {
  BTC: '0a048d9b-c4cf-46eb-b428-59e10307df93',
  ETH: '717614a2-9e24-4abc-a89d-02209a3a772a',
  USDT: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
  XRP: '2c123c4f-76b4-4504-867e-059649855417',
};

// Find same-day YIELD+FLOW in BTC
console.log('=== BTC: Same-day YIELD+FLOW events ===');
const btcEvents = ev.events.filter(e => e.fund === 'BTC');
const btcByDate = {};
for (const e of btcEvents) {
  if (!btcByDate[e.date]) btcByDate[e.date] = [];
  btcByDate[e.date].push(e);
}
for (const [date, events] of Object.entries(btcByDate)) {
  const hasYield = events.some(e => e.event_type === 'YIELD');
  const hasFlow = events.some(e => e.event_type === 'FLOW');
  if (hasYield && hasFlow) {
    console.log(`\nDate: ${date} — ${events.length} events`);
    for (const e of events) {
      if (e.event_type === 'FLOW') {
        for (const tx of e.transactions || []) {
          console.log(`  FLOW: ${tx.investor_name} ${tx.type} ${tx.amount}`);
        }
      } else {
        console.log(`  YIELD: gross_pct=${e.gross_pct}`);
        // Check for Kabbaj or Thomas Puech
        for (const [id, a] of Object.entries(e.allocations || {})) {
          const meta = ev.investor_metadata[id];
          if (id === 'f917cd8b-2d12-428c-ae3c-210b7ee3ae75' || id === '44801beb-4476-4a9b-9751-4e70267f6953') {
            console.log(`    >>> ${a.name || id}: gross=${a.gross} net=${a.net} fee=${a.fee}`);
          }
        }
      }
    }
  }
}

// Platform transactions for Kabbaj BTC
async function main() {
  const kabbajId = 'f917cd8b-2d12-428c-ae3c-210b7ee3ae75';
  const puechId = '44801beb-4476-4a9b-9751-4e70267f6953';
  const btcFund = FUND_IDS.BTC;

  console.log('\n=== Platform: Kabbaj BTC transactions ===');
  const { data: kTx } = await s.from('transactions_v2')
    .select('type,amount,tx_date,source,reference_id')
    .eq('investor_id', kabbajId)
    .eq('fund_id', btcFund)
    .eq('is_voided', false)
    .order('tx_date');
  for (const t of kTx) {
    console.log(`  ${t.tx_date} ${t.type.padEnd(12)} ${Number(t.amount).toFixed(10)}`);
  }
  console.log('  SUM:', kTx.reduce((s, t) => s + Number(t.amount), 0).toFixed(10));

  console.log('\n=== Platform: Thomas Puech BTC transactions ===');
  const { data: pTx } = await s.from('transactions_v2')
    .select('type,amount,tx_date,source,reference_id')
    .eq('investor_id', puechId)
    .eq('fund_id', btcFund)
    .eq('is_voided', false)
    .order('tx_date');
  for (const t of pTx) {
    console.log(`  ${t.tx_date} ${t.type.padEnd(12)} ${Number(t.amount).toFixed(10)}`);
  }
  console.log('  SUM:', pTx.reduce((s, t) => s + Number(t.amount), 0).toFixed(10));

  // Fund-balances for Kabbaj and Thomas BTC
  console.log('\n=== Fund-balances: Kabbaj BTC ===');
  const kFb = fb.filter(e => e.fund === 'BTC' && e.investor.toLowerCase().includes('kabbaj'));
  for (const e of kFb) console.log(`  ${e.month}: ${e.balance}`);

  console.log('\n=== Fund-balances: Thomas Puech BTC ===');
  const pFb = fb.filter(e => e.fund === 'BTC' && e.investor.includes('Thomas Puech'));
  for (const e of pFb) console.log(`  ${e.month}: ${e.balance}`);

  // XRP: Ryan's platform transactions
  console.log('\n=== Platform: Ryan XRP transactions ===');
  const ryanId = 'f462d9e5-7363-4c82-a144-4e694d2b55da';
  const { data: rTx } = await s.from('transactions_v2')
    .select('type,amount,tx_date,source,reference_id')
    .eq('investor_id', ryanId)
    .eq('fund_id', FUND_IDS.XRP)
    .eq('is_voided', false)
    .order('tx_date');
  let running = 0;
  for (const t of rTx) {
    running += Number(t.amount);
    console.log(`  ${t.tx_date} ${t.type.padEnd(12)} ${Number(t.amount).toFixed(10)} running=${running.toFixed(10)}`);
  }

  // Indigo Fees XRP transactions
  console.log('\n=== Platform: Indigo Fees XRP transactions ===');
  const feesId = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  const { data: fTx } = await s.from('transactions_v2')
    .select('type,amount,tx_date,source,reference_id')
    .eq('investor_id', feesId)
    .eq('fund_id', FUND_IDS.XRP)
    .eq('is_voided', false)
    .order('tx_date');
  let fRunning = 0;
  for (const t of fTx) {
    fRunning += Number(t.amount);
    console.log(`  ${t.tx_date} ${t.type.padEnd(12)} ${Number(t.amount).toFixed(10)} running=${fRunning.toFixed(10)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
