/**
 * Verify deposit amounts in excel-events-v3.json by cross-referencing with fund-balances.json.
 *
 * For each same-day YIELD+FLOW event, compute the correct deposit as:
 *   deposit = snapshot_after - (position_before + yield_net)
 * where yield_net = position_before * gross_pct * (1 - fee_pct)
 *
 * If the computed deposit differs from the JSON deposit, report the discrepancy.
 */
import { readFileSync } from 'fs';
import Decimal from 'decimal.js';

Decimal.set({ precision: 40 });

const ev = JSON.parse(readFileSync('scripts/seed-data/excel-events-v3.json', 'utf8'));
const fb = JSON.parse(readFileSync('scripts/seed-data/fund-balances.json', 'utf8'));

function norm(n) {
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
const ALIASES = { 'family kabbaj': 'kabbaj', 'kabbaj': 'kabbaj' };

// Build a position tracker using fund-balances snapshots
// For each fund+investor, track all balance entries in order
const balancesByFundInvestor = {};
for (const entry of fb) {
  const key = `${entry.fund}|${norm(entry.investor)}`;
  if (!balancesByFundInvestor[key]) balancesByFundInvestor[key] = [];
  balancesByFundInvestor[key].push(entry.balance);
}

// For each fund, track the "snapshot index" — which fund-balances entry we're at
// after each event. Fund-balances has ONE entry per event-pair (YIELD+FLOW) per investor.
const snapshotIndex = {};

// Process events in chronological order (YIELD before FLOW on same date)
const sortedEvents = [...ev.events].sort((a, b) => {
  const d = a.date.localeCompare(b.date);
  if (d !== 0) return d;
  const f = a.fund.localeCompare(b.fund);
  if (f !== 0) return f;
  if (a.event_type === 'YIELD' && b.event_type === 'FLOW') return -1;
  if (a.event_type === 'FLOW' && b.event_type === 'YIELD') return 1;
  return 0;
});

// Group by date+fund to find same-day pairs
const byDateFund = {};
for (const e of sortedEvents) {
  const key = `${e.date}|${e.fund}`;
  if (!byDateFund[key]) byDateFund[key] = [];
  byDateFund[key].push(e);
}

// Track positions per fund per investor
const positions = {}; // key: fund|investor_uuid -> Decimal

function getPos(fund, uuid) {
  const key = `${fund}|${uuid}`;
  return positions[key] || new Decimal(0);
}

function setPos(fund, uuid, val) {
  positions[`${fund}|${uuid}`] = val;
}

// Process each date+fund group
const fixes = [];

for (const key of Object.keys(byDateFund).sort()) {
  const events = byDateFund[key];
  const yieldEvent = events.find(e => e.event_type === 'YIELD');
  const flowEvent = events.find(e => e.event_type === 'FLOW');

  if (yieldEvent && flowEvent) {
    // Same-day YIELD+FLOW — check deposit amounts
    const grossPct = new Decimal(yieldEvent.gross_pct);

    for (const tx of flowEvent.transactions) {
      if (tx.type !== 'DEPOSIT' || tx.amount === 'FULL' || tx.amount === 'RESIDUAL_FROM_PREV') continue;

      const uuid = tx.investor_uuid;
      const fund = yieldEvent.fund;
      const jsonDeposit = new Decimal(tx.amount);

      // Get position before yield
      const posBefore = getPos(fund, uuid);

      if (posBefore.isZero()) {
        // New investor — deposit is their first entry, no yield to compute
        continue;
      }

      // Compute yield
      const feePct = ev.investor_metadata[uuid]?.fee_pct || 0;
      const ibPct = ev.investor_metadata[uuid]?.ib_pct || 0;
      const netRate = grossPct.mul(new Decimal(1).minus(feePct).minus(ibPct));
      const yieldNet = posBefore.mul(netRate);
      const postYield = posBefore.plus(yieldNet);

      // Look up the snapshot (fund-balances entry after this event pair)
      const nk = norm(tx.investor_name);
      const lookupName = nk;
      const balKey = `${fund}|${lookupName}`;
      const balEntries = balancesByFundInvestor[balKey];

      if (!balEntries) continue;

      // Find the snapshot that includes this deposit
      // The snapshot after deposit = posBefore + yield + deposit
      // We need to find the entry that matches: entry ≈ postYield + jsonDeposit
      const expectedSnapshot = postYield.plus(jsonDeposit);

      // Find best matching entry
      let bestIdx = -1;
      let bestDiff = new Decimal(Infinity);
      for (let i = 0; i < balEntries.length; i++) {
        const d = new Decimal(balEntries[i]).minus(expectedSnapshot).abs();
        if (d.lt(bestDiff)) { bestDiff = d; bestIdx = i; }
      }

      if (bestIdx >= 0 && bestDiff.lt(0.01)) {
        const snapshot = new Decimal(balEntries[bestIdx]);
        const correctDeposit = snapshot.minus(postYield);
        const diff = jsonDeposit.minus(correctDeposit);

        if (diff.abs().gt(0.0001)) {
          fixes.push({
            fund,
            date: yieldEvent.date,
            investor: tx.investor_name,
            uuid: tx.investor_uuid,
            jsonDeposit: jsonDeposit.toFixed(10),
            correctDeposit: correctDeposit.toFixed(10),
            diff: diff.toFixed(10),
            posBefore: posBefore.toFixed(10),
            snapshot: snapshot.toFixed(10),
          });
        }
      }
    }
  }

  // Update positions after processing this date+fund
  // Apply yield to all positions in this fund
  if (yieldEvent) {
    const grossPct = new Decimal(yieldEvent.gross_pct);
    const fund = yieldEvent.fund;

    // Apply yield to all investors with positions
    for (const k of Object.keys(positions)) {
      if (k.startsWith(`${fund}|`)) {
        const uuid = k.split('|')[1];
        const pos = positions[k];
        if (pos.gt(0)) {
          const feePct = ev.investor_metadata[uuid]?.fee_pct || 0;
          const ibPct = ev.investor_metadata[uuid]?.ib_pct || 0;
          const netRate = grossPct.mul(new Decimal(1).minus(feePct).minus(ibPct));
          positions[k] = pos.mul(new Decimal(1).plus(netRate));
        }
      }
    }
  }

  // Apply flow events
  if (flowEvent) {
    for (const tx of flowEvent.transactions) {
      const fund = flowEvent.fund.split('|')[0] || (yieldEvent || flowEvent).fund;
      if (tx.type === 'DEPOSIT') {
        if (tx.amount !== 'FULL' && tx.amount !== 'RESIDUAL_FROM_PREV') {
          const current = getPos(fund, tx.investor_uuid);
          setPos(fund, tx.investor_uuid, current.plus(new Decimal(tx.amount)));
        }
      } else if (tx.type === 'WITHDRAWAL') {
        if (tx.amount === 'FULL') {
          setPos(fund, tx.investor_uuid, new Decimal(0));
        } else {
          const current = getPos(fund, tx.investor_uuid);
          setPos(fund, tx.investor_uuid, current.minus(new Decimal(tx.amount)));
        }
      }
    }
  }

  // For FLOW-only events (no yield), just process the transactions
  if (!yieldEvent && flowEvent) {
    // Already handled above
  }
}

console.log('=== DEPOSIT AMOUNT CORRECTIONS NEEDED ===\n');
if (fixes.length === 0) {
  console.log('All deposit amounts match!');
} else {
  for (const f of fixes) {
    console.log(`${f.fund} ${f.date} ${f.investor}:`);
    console.log(`  JSON deposit:    ${f.jsonDeposit}`);
    console.log(`  Correct deposit: ${f.correctDeposit}`);
    console.log(`  Difference:      ${f.diff} (overestimate)`);
    console.log(`  Position before: ${f.posBefore}`);
    console.log(`  Snapshot after:  ${f.snapshot}`);
    console.log('');
  }
  console.log(`Total fixes needed: ${fixes.length}`);
}
