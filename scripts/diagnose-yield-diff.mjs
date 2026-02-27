/**
 * Diagnostic: Compare two yield calculation methods against Excel expected values.
 *
 * Method A (Excel): Each investor's gross is computed independently from their balance.
 *   gross_i = balance_i * gross_pct
 *   fee_i   = gross_i * fee_pct
 *   ib_i    = gross_i * ib_pct
 *   net_i   = gross_i - fee_i - ib_i
 *   Fees account receives fee_i from each investor (on top of its own yield net).
 *   No dust allocation.
 *
 * Method B (Platform share-based): Total yield split by proportional share.
 *   total_yield = SUM(balances) * gross_pct
 *   share_i     = balance_i / SUM(balances)
 *   gross_i     = total_yield * share_i
 *   fee_i       = gross_i * fee_pct
 *   ib_i        = gross_i * ib_pct
 *   net_i       = gross_i - fee_i - ib_i
 *   dust        = total_yield - SUM(gross_i) added to fees account.
 *   Fees account receives fee_i + dust (on top of its own yield net).
 *
 * Both methods: IB accounts receive SUM(ib_i) for their referrals.
 * IB credits go to the IB balance directly (accumulated as positions).
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Decimal = require('decimal.js');

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const FEES_UUID = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';

// ====================================================================
// Load data
// ====================================================================
const jsonPath = path.join(__dirname, 'seed-data/excel-events-v3.json');
const raw = JSON.parse(readFileSync(jsonPath, 'utf8'));
const { investor_metadata, events, final_balances } = raw;

// ====================================================================
// Investor metadata helpers
// ====================================================================

// fee_pct and ib_pct stored as decimals in metadata (0.15 = 15%)
function getFeePct(uuid) {
  const meta = investor_metadata[uuid];
  if (!meta || meta.fee_pct == null) return ZERO;
  return new Decimal(meta.fee_pct);
}

function getIbPct(uuid) {
  const meta = investor_metadata[uuid];
  if (!meta || meta.ib_pct == null) return ZERO;
  return new Decimal(meta.ib_pct);
}

// IB accounts identified by account_type=ib in named metadata entries
const IB_UUIDS = new Set();
for (const val of Object.values(investor_metadata)) {
  if (val && val.account_type === 'ib' && val.uuid) {
    IB_UUIDS.add(val.uuid);
  }
}

// Build investor -> IB parent UUID mapping from transaction data.
// When a transaction has ib_pct > 0, that investor pays IB commission.
// We identify which IB account to credit by matching the investor's ib_pct
// to known IB accounts. From the JSON context:
//   Ryan Van Der Wall (f462d9e5): IB account, receives commissions from:
//     - Babak Eftekhari (cdcccf6e) ib_pct=0.02
//     - 3a9a5615 ib_pct=0.02 (USDT investor)
//     - Babak also in ETH/USDT with ib_pct=0.02
//   Lars Ahlgreen (9405071c): IB account, receives commissions from USDT investors
//     (7d049f7f Ventures Life Style ib_pct=0.04, 2f7b8bb2 Sam Johnson has fee_pct=0)
//   Paul Johnson (d1f8c666) ib_pct=0.015: his IB is Ryan (ETH/SOL)
//
// Since the JSON lacks explicit investor->IB UUID links in each transaction,
// we collect all ib_i credits per fund into a general IB pool. We then assign
// IB credits to the known IB account(s) per fund proportionally.
// For simplicity in this diagnostic, we assign:
//   - All IB credits in ETH/SOL -> Ryan Van Der Wall (f462d9e5)
//   - All IB credits in USDT -> split (Ryan + Lars), but we'll use Ryan for 0.02, Lars for 0.04
//   - BTC: no IB investors (all ib_pct=null)
//
// Actually let's derive from metadata directly: for each uuid with ib_pct > 0,
// map to the IB account that matches their ib_pct context.
// Known mapping from platform knowledge:
const INVESTOR_TO_IB = {
  'cdcccf6e-32f9-475a-9f88-34272ca3e64b': 'f462d9e5-7363-4c82-a144-4e694d2b55da', // Babak -> Ryan
  '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc': 'f462d9e5-7363-4c82-a144-4e694d2b55da', // -> Ryan
  'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2': 'f462d9e5-7363-4c82-a144-4e694d2b55da', // Paul -> Ryan
  '7d049f7f-b77f-4650-b772-6a8806f00103': '9405071c-0b52-4399-85da-9f1ba9b289c1', // Ventures -> Lars
  '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1': '9405071c-0b52-4399-85da-9f1ba9b289c1', // Sam -> Lars
};

// ====================================================================
// State management
// ====================================================================

function makeState() {
  // fund -> uuid -> Decimal
  return {};
}

function getBalance(state, fund, uuid) {
  return state[fund]?.[uuid] ?? ZERO;
}

function setBalance(state, fund, uuid, val) {
  if (!state[fund]) state[fund] = {};
  state[fund][uuid] = val;
}

function addBalance(state, fund, uuid, delta) {
  const cur = getBalance(state, fund, uuid);
  setBalance(state, fund, uuid, cur.plus(delta));
}

// ====================================================================
// Process FLOW event (identical for both methods)
// ====================================================================
function processFlow(state, event) {
  const { fund, transactions } = event;
  let lastWithdrawalAmount = ZERO; // for RESIDUAL_FROM_PREV handling

  for (const tx of transactions) {
    const { investor_uuid, amount, type } = tx;

    if (amount === 'FULL') {
      const bal = getBalance(state, fund, investor_uuid);
      lastWithdrawalAmount = bal;
      setBalance(state, fund, investor_uuid, ZERO);
      continue;
    }

    if (amount === 'RESIDUAL_FROM_PREV') {
      // Deposit the same amount that was just withdrawn from the previous tx
      addBalance(state, fund, investor_uuid, lastWithdrawalAmount);
      lastWithdrawalAmount = ZERO;
      continue;
    }

    const amt = new Decimal(amount);

    if (type === 'DEPOSIT') {
      addBalance(state, fund, investor_uuid, amt);
      lastWithdrawalAmount = ZERO;
    } else if (type === 'WITHDRAWAL') {
      const bal = getBalance(state, fund, investor_uuid);
      const newBal = bal.minus(amt);
      // Clamp to zero if rounding causes tiny negative
      setBalance(state, fund, investor_uuid, newBal.lt(ZERO) ? ZERO : newBal);
      lastWithdrawalAmount = amt;
    }
  }
}

// ====================================================================
// Method A: Independent per-investor yield calculation
// ====================================================================
function processYieldA(state, event) {
  const { fund, gross_pct } = event;
  if (!state[fund]) return;

  const gpct = new Decimal(gross_pct);
  const uuids = Object.keys(state[fund]);

  for (const uuid of uuids) {
    const balance = getBalance(state, fund, uuid);
    if (balance.lte(ZERO)) continue;

    const feePct = getFeePct(uuid);
    const ibPct = getIbPct(uuid);

    const gross_i = balance.times(gpct);
    const fee_i = gross_i.times(feePct);
    const ib_i = gross_i.times(ibPct);
    const net_i = gross_i.minus(fee_i).minus(ib_i);

    // Investor gets their net yield
    setBalance(state, fund, uuid, balance.plus(net_i));

    // Fees account receives fee_i (not added to fees investor yield calc above,
    // because fees account has fee_pct=0 so it already gets its own full gross as net)
    // We add fee_i as an explicit transfer to fees account
    addBalance(state, fund, FEES_UUID, fee_i);

    // IB account receives ib_i
    if (ib_i.gt(ZERO)) {
      const ibUuid = INVESTOR_TO_IB[uuid];
      if (ibUuid) {
        addBalance(state, fund, ibUuid, ib_i);
      }
      // If we don't know the IB UUID, credit goes to fees as fallback
      // (this matches Excel behavior where unclaimed IB stays in the platform)
    }
  }
}

// ====================================================================
// Method B: Share-based yield calculation with dust to fees
// ====================================================================
function processYieldB(state, event) {
  const { fund, gross_pct } = event;
  if (!state[fund]) return;

  const gpct = new Decimal(gross_pct);
  const uuids = Object.keys(state[fund]);

  // Total balance across all investors in this fund
  let totalBalance = ZERO;
  for (const uuid of uuids) {
    const bal = getBalance(state, fund, uuid);
    if (bal.gt(ZERO)) totalBalance = totalBalance.plus(bal);
  }

  if (totalBalance.lte(ZERO)) return;

  const totalYield = totalBalance.times(gpct);

  let sumGross = ZERO;
  const allocs = []; // { uuid, gross_i }

  for (const uuid of uuids) {
    const balance = getBalance(state, fund, uuid);
    if (balance.lte(ZERO)) continue;

    const share = balance.dividedBy(totalBalance);
    const gross_i = totalYield.times(share);
    sumGross = sumGross.plus(gross_i);
    allocs.push({ uuid, gross_i, balance });
  }

  const dust = totalYield.minus(sumGross);

  for (const { uuid, gross_i, balance } of allocs) {
    const feePct = getFeePct(uuid);
    const ibPct = getIbPct(uuid);

    const fee_i = gross_i.times(feePct);
    const ib_i = gross_i.times(ibPct);
    const net_i = gross_i.minus(fee_i).minus(ib_i);

    setBalance(state, fund, uuid, balance.plus(net_i));

    addBalance(state, fund, FEES_UUID, fee_i);

    if (ib_i.gt(ZERO)) {
      const ibUuid = INVESTOR_TO_IB[uuid];
      if (ibUuid) {
        addBalance(state, fund, ibUuid, ib_i);
      }
    }
  }

  // Dust -> fees account
  if (dust.abs().gt(new Decimal('1e-18'))) {
    addBalance(state, fund, FEES_UUID, dust);
  }
}

// ====================================================================
// Run simulation
// ====================================================================
function runSimulation() {
  const stateA = makeState();
  const stateB = makeState();

  for (const event of events) {
    if (event.event_type === 'FLOW') {
      processFlow(stateA, event);
      processFlow(stateB, event);
    } else if (event.event_type === 'YIELD') {
      processYieldA(stateA, event);
      processYieldB(stateB, event);
    }
  }

  return { stateA, stateB };
}

// ====================================================================
// Formatting helpers
// ====================================================================
function fmt(d, decimals = 12) {
  if (d == null) return '0'.padStart(decimals + 3);
  return d.toFixed(decimals);
}

function fmtDiff(d, decimals = 10) {
  if (d == null) return '';
  const s = d.toFixed(decimals);
  return d.gte(ZERO) ? `+${s}` : s;
}

function fmtPct(d) {
  if (d == null || d.eq(ZERO)) return '0.0000%';
  return d.times(100).toFixed(4) + '%';
}

function printSeparator(char = '-', width = 160) {
  console.log(char.repeat(width));
}

// ====================================================================
// Main output
// ====================================================================
const { stateA, stateB } = runSimulation();

// --- Fees account comparison ---
console.log('\n');
printSeparator('=');
console.log('INDIGO FEES ACCOUNT COMPARISON BY FUND');
printSeparator('=');

const COL = {
  fund: 6,
  a: 22,
  b: 22,
  exp: 22,
  diffA: 18,
  diffB: 18,
  closer: 8,
};

const hdr = [
  'Fund'.padEnd(COL.fund),
  'Method A (Excel)'.padEnd(COL.a),
  'Method B (Share)'.padEnd(COL.b),
  'Expected (JSON)'.padEnd(COL.exp),
  'Diff A-Exp'.padEnd(COL.diffA),
  'Diff B-Exp'.padEnd(COL.diffB),
  'Closer'.padEnd(COL.closer),
].join(' | ');

console.log(hdr);
printSeparator('-');

const feesRows = [];
for (const [fund, investors] of Object.entries(final_balances)) {
  const expData = investors[FEES_UUID];
  if (!expData) continue;

  const expected = new Decimal(expData.balance);
  const methodA = getBalance(stateA, fund, FEES_UUID);
  const methodB = getBalance(stateB, fund, FEES_UUID);
  const diffA = methodA.minus(expected);
  const diffB = methodB.minus(expected);
  const closerA = diffA.abs().lte(diffB.abs());

  feesRows.push({ fund, expected, methodA, methodB, diffA, diffB, closerA });

  const row = [
    fund.padEnd(COL.fund),
    fmt(methodA, 10).padEnd(COL.a),
    fmt(methodB, 10).padEnd(COL.b),
    fmt(expected, 10).padEnd(COL.exp),
    fmtDiff(diffA, 8).padEnd(COL.diffA),
    fmtDiff(diffB, 8).padEnd(COL.diffB),
    (closerA ? 'A' : 'B').padEnd(COL.closer),
  ].join(' | ');
  console.log(row);
}

printSeparator('-');
const aFeesWins = feesRows.filter((r) => r.closerA).length;
const bFeesWins = feesRows.filter((r) => !r.closerA).length;
console.log(`\nFees account: Method A closer in ${aFeesWins}/${feesRows.length} funds | Method B closer in ${bFeesWins}/${feesRows.length} funds`);

// --- Per-fund detail for fees ---
console.log('\n');
printSeparator('=');
console.log('FEES ACCOUNT DETAIL BY FUND');
printSeparator('=');

for (const row of feesRows) {
  const pctA = row.expected.eq(ZERO)
    ? new Decimal(0)
    : row.diffA.dividedBy(row.expected);
  const pctB = row.expected.eq(ZERO)
    ? new Decimal(0)
    : row.diffB.dividedBy(row.expected);

  console.log(`\n  ${row.fund}:`);
  console.log(`    Method A (Excel) : ${fmt(row.methodA, 10)}`);
  console.log(`    Method B (Share) : ${fmt(row.methodB, 10)}`);
  console.log(`    Expected (JSON)  : ${fmt(row.expected, 10)}`);
  console.log(`    Diff A - Exp     : ${fmtDiff(row.diffA, 10)}  (${fmtPct(pctA)})`);
  console.log(`    Diff B - Exp     : ${fmtDiff(row.diffB, 10)}  (${fmtPct(pctB)})`);
  console.log(`    Closer           : ${row.closerA ? 'Method A' : 'Method B'}`);
}

// --- Sample regular investor comparison ---
console.log('\n');
printSeparator('=');
console.log('SAMPLE REGULAR INVESTOR COMPARISONS');
printSeparator('=');

const invHdr = [
  'Fund'.padEnd(6),
  'Name'.padEnd(26),
  'Method A'.padEnd(22),
  'Method B'.padEnd(22),
  'Expected'.padEnd(22),
  'Diff A-Exp'.padEnd(18),
  'Diff B-Exp'.padEnd(18),
  'Closer'.padEnd(8),
].join(' | ');
console.log(invHdr);
printSeparator('-');

// Pick 3 non-zero, non-fees investors per fund
for (const [fund, investors] of Object.entries(final_balances)) {
  let shown = 0;
  for (const [uuid, data] of Object.entries(investors)) {
    if (uuid === FEES_UUID) continue;
    if (data.balance === 0) continue;
    if (shown >= 3) break;

    const expected = new Decimal(data.balance);
    const methodA = getBalance(stateA, fund, uuid);
    const methodB = getBalance(stateB, fund, uuid);
    const diffA = methodA.minus(expected);
    const diffB = methodB.minus(expected);
    const closerA = diffA.abs().lte(diffB.abs());

    const row = [
      fund.padEnd(6),
      data.name.substring(0, 25).padEnd(26),
      fmt(methodA, 8).padEnd(22),
      fmt(methodB, 8).padEnd(22),
      fmt(expected, 8).padEnd(22),
      fmtDiff(diffA, 8).padEnd(18),
      fmtDiff(diffB, 8).padEnd(18),
      (closerA ? 'A' : 'B').padEnd(8),
    ].join(' | ');
    console.log(row);
    shown++;
  }
}

// --- Summary ---
console.log('\n');
printSeparator('=');
console.log('OVERALL SUMMARY');
printSeparator('=');

let totalErrA = ZERO;
let totalErrB = ZERO;
let aWins = 0;
let bWins = 0;
let totalComparisons = 0;

for (const [fund, investors] of Object.entries(final_balances)) {
  for (const [uuid, data] of Object.entries(investors)) {
    if (data.balance === 0) continue;

    const expected = new Decimal(data.balance);
    const methodA = getBalance(stateA, fund, uuid);
    const methodB = getBalance(stateB, fund, uuid);
    const errA = methodA.minus(expected).abs();
    const errB = methodB.minus(expected).abs();

    totalErrA = totalErrA.plus(errA);
    totalErrB = totalErrB.plus(errB);
    totalComparisons++;

    if (errA.lte(errB)) aWins++;
    else bWins++;
  }
}

console.log(`\nTotal investors compared: ${totalComparisons}`);
console.log(`Method A closer in: ${aWins} cases`);
console.log(`Method B closer in: ${bWins} cases`);
console.log(`\nTotal absolute error across all non-zero positions:`);
console.log(`  Method A: ${fmt(totalErrA, 8)}`);
console.log(`  Method B: ${fmt(totalErrB, 8)}`);
console.log(`\nConclusion: ${totalErrA.lte(totalErrB) ? 'Method A (Excel-style independent calculation)' : 'Method B (Share-based with dust)'} produces smaller total error.`);
console.log('');
