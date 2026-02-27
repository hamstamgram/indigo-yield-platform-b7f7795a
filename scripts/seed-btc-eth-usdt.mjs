/**
 * Re-seed BTC/ETH/USDT deposits/withdrawals and replay all yield months via V5.
 * Only pure BTC/ETH/USDT transactions go to their funds.
 * BTC BOOST, BTC TAC, ETH TAC are external pools - excluded.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ADMIN_ID = 'a16a7e50-fefd-4bfe-897c-d16279b457c2';

const FUND_IDS = {
  BTC:  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  ETH:  '717614a2-9e24-4abc-a89d-02209a3a772a',
  USDT: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
};

const CURRENCY_TO_FUND = { 'BTC': 'BTC', 'ETH': 'ETH', 'USDT': 'USDT' };

const INVESTOR_MAP = {
  'Jose Molla':              '203caf71-a9ac-4e2a-bbd3-b45dd51758d4',
  'Kyle Gulamerian':         'b4f5d56b-b128-4799-b805-d34264165f45',
  'Matthias Reiser':         'd8643c68-7045-458a-b105-a41f56085c55',
  'Thomas Puech':            '44801beb-4476-4a9b-9751-4e70267f6953',
  'Danielle Richetta':       'e134e0df-d4e7-49c4-80b3-4ef37af6bebf',
  'danielle Richetta':       'e134e0df-d4e7-49c4-80b3-4ef37af6bebf',
  'Nathanael Cohen':         'ed91c89d-23de-4981-b6b7-60e13f1a6767',
  'Nathanaël Cohen':         'ed91c89d-23de-4981-b6b7-60e13f1a6767',
  'Blondish':                '529cac24-615c-4408-b683-2c4ab635d6fd',
  'Victoria Pariente-Cohen': '249f4ab3-3433-4d81-ac92-1531b3573a50',
  'INDIGO Fees':             'b464a3f7-60d5-4bc0-9833-7b413bcc6cae',
  'Indigo Fees':             'b464a3f7-60d5-4bc0-9833-7b413bcc6cae',
  'Kabbaj':                  'f917cd8b-2d12-428c-ae3c-210b7ee3ae75',
  'Oliver Loisel':           'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794',
  'Sam Johnson':             '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1',
  'Paul Johnson':            'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2',
  'NSVO Holdings':           '114164b0-1aba-4b40-9abc-8d72adfdc60a',
  'ALOK PAVAN BATRA':        'bd8ba788-4d65-4cb8-8b7b-784b3156baf7',
  'Nath & Thomas':           '99e5a116-44ba-4a45-9f56-5877b235f960',
  'Vivie & Liana':           '981dd85c-35c8-4254-a3e9-27c2af302815',
  'Babak Eftekhari':         'cdcccf6e-32f9-475a-9f88-34272ca3e64b',
  'INDIGO DIGITAL ASSET FUND LP': 'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13',
  'Julien Grunebaum':        '7fdedf56-e838-45ea-91f8-6e441810c761',
  'Daniele Francilia':       'd1f39136-4d87-4e7f-8885-a413c21d9a56',
  'Pierre Bezencon':         '511991c7-93a2-4d2b-b42a-43120d58f672',
  'Matthew Beatty':          '24f3054e-a125-4954-8861-55aa617cbb2c',
  'Bo De Kriek':             '98dd4ff5-b5cb-4257-a501-aa25a6d638c5',
  'Dario Deiana':            'bb655a37-9e91-4166-b575-cafbbbb8c200',
  'Alain Bensimon':          '20396ec2-c919-46ef-b3a3-8005a8a34bd3',
  'Anne Cecile Noique':      '64cb831a-3365-4a89-9369-620ab7a1ff26',
  'Terance Chen':            '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c',
  'Sacha Oshry':             'd5719d57-5308-4b9d-8a4f-a9a8aa596af4',
  'Monica Levy Chicheportiche': 'c85bddf5-7720-47a5-8336-669ea604b94b',
  'Valeria Cruz':            'e9bbc28b-5d8d-410c-940b-b37a54a726e0',
  'Ventures Life Style':     '7d049f7f-b77f-4650-b772-6a8806f00103',
  'Advantage Blockchain':    '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc',
  'HALLEY86':                '32d75475-0b78-4b7b-925a-e9429f6fe66d',
  'INDIGO Ventures':         'af16a20d-df70-4357-9b10-efcd25d0c1aa',
  'Tomer Zur':               '82f58ac0-2d34-4c00-b0df-34383c1d1dfd',
  'Tomer Mazar':             'bf0f3364-c008-4e2e-aec9-c55f1832eedb',
};

function lastDayOfMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setBackfillMode() {
  console.log('\n=== Set system_mode = backfill ===');
  const { error } = await supabase.from('system_config').update({ value: '"backfill"' }).eq('key', 'system_mode');
  if (error) throw new Error('backfill failed: ' + error.message);
  const { data } = await supabase.from('system_config').select('value').eq('key', 'system_mode').single();
  console.log('system_mode:', data?.value);
}

async function seedTransactions() {
  console.log('\n=== Seed BTC/ETH/USDT transactions (pure currency only) ===');
  const allTxs = JSON.parse(readFileSync('scripts/seed-data/transactions.json', 'utf8'));
  const txs = allTxs
    .filter(t => CURRENCY_TO_FUND[t.currency])
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`Total: ${txs.length} (BTC=${txs.filter(t=>t.currency==='BTC').length} ETH=${txs.filter(t=>t.currency==='ETH').length} USDT=${txs.filter(t=>t.currency==='USDT').length})`);

  let ok = 0, errs = 0;
  const errList = [];

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const fundKey = CURRENCY_TO_FUND[tx.currency];
    const investorId = INVESTOR_MAP[tx.investor];

    if (!investorId) {
      const msg = `UNKNOWN investor "${tx.investor}" [${i}]`;
      console.warn('  WARN:', msg);
      errList.push(msg); errs++; continue;
    }

    const { data, error } = await supabase.rpc('apply_investor_transaction', {
      p_fund_id: FUND_IDS[fundKey],
      p_investor_id: investorId,
      p_tx_type: tx.type,
      p_amount: tx.amount,
      p_tx_date: tx.date,
      p_reference_id: `v5-${fundKey.toLowerCase()}-${tx.date}-${i}`,
      p_admin_id: ADMIN_ID,
      p_notes: `V5 reseed [${i}]: ${tx.currency} ${tx.type} ${tx.amount} ${tx.investor}`,
      p_purpose: 'transaction',
    });

    if (error) {
      const msg = `[${i}] ${tx.date} ${fundKey} ${tx.type} ${tx.amount} ${tx.investor}: ${error.message}`;
      console.error('  ERR:', msg);
      errList.push(msg); errs++;
    } else if (data && data.error) {
      const msg = `[${i}] RPC error: ${JSON.stringify(data)}`;
      console.error('  RPC ERR:', msg);
      errList.push(msg); errs++;
    } else {
      const idem = data?.message?.includes('idempotent');
      console.log(`  [${i+1}/${txs.length}] ${tx.date} ${fundKey} ${tx.type} ${tx.amount.toFixed(4)} ${tx.investor}${idem?' (idempotent)':''}`);
      ok++;
    }

    await sleep(80);
  }

  console.log(`\nSeed: ${ok} OK, ${errs} errors`);
  if (errList.length) errList.forEach(e => console.log('  -', e));
  return errs === 0;
}

async function verifyPositions() {
  console.log('\n=== Positions after seeding ===');
  for (const [asset, fundId] of Object.entries(FUND_IDS)) {
    const { data } = await supabase.from('investor_positions').select('current_value').eq('fund_id', fundId).eq('is_active', true);
    const total = (data||[]).reduce((s,p)=>s+Number(p.current_value),0);
    console.log(`  ${asset}: ${(data||[]).length} positions, total=${total.toFixed(6)}`);
  }
}

async function replayYieldMonths() {
  console.log('\n=== Replay yield months via V5 ===');
  const perf = JSON.parse(readFileSync('scripts/seed-data/performance.json', 'utf8'));

  // Last segment per fund+month
  const monthMap = {};
  for (const row of perf) {
    if (!FUND_IDS[row.fund]) continue;
    monthMap[`${row.fund}|${row.month}`] = row;
  }

  const months = Object.values(monthMap)
    .sort((a,b) => a.month.localeCompare(b.month) || a.fund.localeCompare(b.fund));

  console.log(`Replaying ${months.length} fund-months`);
  let ok=0, errs=0;
  const results = [];

  for (const row of months) {
    const { fund, month, closingAum } = row;
    const periodEnd = lastDayOfMonth(month);
    process.stdout.write(`  ${fund} ${month} AUM=${closingAum} ... `);

    const { data, error } = await supabase.rpc('apply_segmented_yield_distribution_v5', {
      p_fund_id: FUND_IDS[fund],
      p_period_end: periodEnd,
      p_recorded_aum: closingAum,
      p_admin_id: ADMIN_ID,
      p_purpose: 'transaction',
    });

    if (error) {
      console.log(`ERROR: ${error.message}`);
      errs++;
      results.push({ fund, month, status: 'error', message: error.message });
    } else {
      const res = data || {};
      const gross = Number(res.gross_yield || 0);
      const cons = res.conservation_check === true;
      const segs = res.segment_count || 1;
      console.log(`OK gross=${gross.toFixed(6)} segs=${segs} cons=${cons}`);
      if (!cons && gross !== 0) console.warn(`    WARN: conservation FAIL for ${fund} ${month}`);
      ok++;
      results.push({ fund, month, status: 'ok', gross, cons, segs });
    }
    await sleep(200);
  }

  console.log(`\nYield replay: ${ok} OK, ${errs} errors`);
  return { ok, errs, results };
}

async function runIntegrityAudit() {
  console.log('\n=== Integrity audit ===');
  const allFunds = Object.values(FUND_IDS);
  const { data: yds } = await supabase
    .from('yield_distributions')
    .select('fund_id, period_end, gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, dust_amount')
    .in('fund_id', allFunds).eq('is_voided', false).order('period_end');

  const fn = Object.fromEntries(Object.entries(FUND_IDS).map(([k,v])=>[v,k]));
  console.log(`Live yield distributions: ${yds?.length || 0}`);

  let violations = 0;
  for (const yd of (yds || [])) {
    const g = Number(yd.gross_yield_amount||0);
    const n = Number(yd.total_net_amount||0);
    const f = Number(yd.total_fee_amount||0);
    const ib = Number(yd.total_ib_amount||0);
    const d = Number(yd.dust_amount||0);
    const r = g-(n+f+ib+d);
    if (Math.abs(r) > 1e-8) {
      console.error(`  CONSERVATION FAIL: ${fn[yd.fund_id]} ${yd.period_end} residual=${r}`);
      violations++;
    }
  }
  console.log(violations===0 ? '  Conservation: ALL PASS' : `  Conservation: ${violations} VIOLATIONS`);

  for (const [asset, fundId] of Object.entries(FUND_IDS)) {
    const { data } = await supabase.from('investor_positions').select('current_value').eq('fund_id', fundId).eq('is_active', true);
    const total = (data||[]).reduce((s,p)=>s+Number(p.current_value),0);
    console.log(`  ${asset}: ${(data||[]).length} active, total=${total.toFixed(6)}`);
  }

  return violations === 0;
}

async function restoreLiveMode() {
  console.log('\n=== Restore system_mode = live ===');
  const { error } = await supabase.from('system_config').update({ value: '"live"' }).eq('key', 'system_mode');
  if (error) throw new Error('live restore failed: ' + error.message);
  const { data } = await supabase.from('system_config').select('value').eq('key', 'system_mode').single();
  console.log('system_mode:', data?.value);
}

async function main() {
  const t0 = Date.now();
  console.log('=== BTC/ETH/USDT V5 Seed and Replay ===');
  console.log('Started:', new Date().toISOString());

  try {
    await setBackfillMode();
    const seedOk = await seedTransactions();
    if (!seedOk) console.warn('\nWARN: some seed errors — continuing with replay');
    await verifyPositions();
    const { ok, errs, results } = await replayYieldMonths();
    const intOk = await runIntegrityAudit();
    await restoreLiveMode();

    const elapsed = ((Date.now()-t0)/1000).toFixed(1);
    console.log(`\n=== DONE in ${elapsed}s ===`);
    console.log(`Seed: ${seedOk?'OK':'ERRORS'} | Yield: ${ok} OK, ${errs} errors | Integrity: ${intOk?'PASS':'FAIL'}`);

    writeFileSync('/tmp/v5-btc-eth-usdt-results.json', JSON.stringify({
      timestamp: new Date().toISOString(), elapsed, seedOk,
      yield_ok: ok, yield_errors: errs, integrity_ok: intOk, results
    }, null, 2));
    console.log('Results: /tmp/v5-btc-eth-usdt-results.json');

  } catch (e) {
    console.error('\nFATAL:', e.message);
    try { await restoreLiveMode(); } catch {}
    process.exit(1);
  }
}

main();
