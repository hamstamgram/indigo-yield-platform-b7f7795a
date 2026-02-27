/**
 * Compute EXACT correct deposit amounts from fund-balances.json + yield formula.
 * deposit = balance_after - (balance_before * (1 + gross_pct * (1 - fee_pct - ib_pct)))
 */
import { readFileSync } from 'fs';
import Decimal from 'decimal.js';

Decimal.set({ precision: 40 });

const ev = JSON.parse(readFileSync('scripts/seed-data/excel-events-v3.json', 'utf8'));
const fb = JSON.parse(readFileSync('scripts/seed-data/fund-balances.json', 'utf8'));

function norm(n) {
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Get fund-balances entries for a specific fund+investor
function getBalances(fund, name) {
  const nk = norm(name);
  return fb.filter(e => e.fund === fund && norm(e.investor) === nk).map(e => e.balance);
}

// For Kabbaj BTC July 11:
// balance_before (last June entry) = fund-balances Kabbaj BTC June last entry
const kabbajBTC = getBalances('BTC', 'Family Kabbaj');
console.log('=== Kabbaj BTC fund-balances entries ===');
const kFb = fb.filter(e => e.fund === 'BTC' && norm(e.investor) === 'family kabbaj');
for (const e of kFb) console.log(`  ${e.month}: ${e.balance}`);

// After Jun 30 yield, before Jul 11: entry for 2025-06 or first 2025-07 carryover
// The first July entry IS the carryover (= last June balance)
// Actually, fund-balances has a July entry that's the same as the last June entry

// Kabbaj positions before each yield event:
const targets = [
  { fund: 'BTC', date: '2025-07-11', investor: 'Family Kabbaj', uuid: 'f917cd8b-2d12-428c-ae3c-210b7ee3ae75', feePct: 0.2, ibPct: 0, grossPct: 0.003831980431 },
  { fund: 'BTC', date: '2025-12-09', investor: 'Thomas Puech', uuid: '44801beb-4476-4a9b-9751-4e70267f6953', feePct: 0, ibPct: 0, grossPct: 0.001144688645 },
  { fund: 'BTC', date: '2026-01-13', investor: 'Thomas Puech', uuid: '44801beb-4476-4a9b-9751-4e70267f6953', feePct: 0, ibPct: 0, grossPct: 0.001723941234 },
];

for (const t of targets) {
  console.log(`\n=== ${t.investor} ${t.fund} ${t.date} ===`);

  // Find the event
  const flowEvent = ev.events.find(e => e.fund === t.fund && e.date === t.date && e.event_type === 'FLOW');
  const tx = flowEvent.transactions.find(tx => tx.investor_uuid === t.uuid && tx.type === 'DEPOSIT');
  const jsonDeposit = tx.amount;

  // Find fund-balances entries for this investor
  const entries = fb.filter(e => e.fund === t.fund && norm(e.investor) === norm(t.investor));

  // Find balance BEFORE this event: the entry just before the event's date
  // Sort by month
  const byMonth = {};
  for (const e of entries) {
    if (!byMonth[e.month]) byMonth[e.month] = [];
    byMonth[e.month].push(e.balance);
  }

  // Find the event date's month and previous month
  const eventMonth = t.date.slice(0, 7);
  const prevMonth = new Date(t.date);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMonthStr = prevMonth.toISOString().slice(0, 7);

  console.log(`  Event month: ${eventMonth}, prev month: ${prevMonthStr}`);
  console.log(`  Prev month entries: ${JSON.stringify(byMonth[prevMonthStr])}`);
  console.log(`  Event month entries: ${JSON.stringify(byMonth[eventMonth])}`);

  // balance_before = last entry of previous month (or first entry of current month if it's a carryover)
  const prevEntries = byMonth[prevMonthStr] || [];
  const currEntries = byMonth[eventMonth] || [];

  // The first entry in the current month that differs from the previous month's last entry
  // is the post-yield entry. The carryover entry is the same as the last previous month entry.
  const lastPrev = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1] : 0;

  // Find the first current month entry that's significantly different from lastPrev
  // (that would be after the first yield event in this month)
  let balBefore = lastPrev;
  let balAfter = null;

  // For same-month events (e.g., Dec 9 has events on Dec 8 too):
  // We need the entry JUST before this specific event date.
  // The fund-balances has one entry per event-pair. We need to count which event-pair this is.

  // Count how many same-fund events are in this month before this date
  const monthEvents = ev.events.filter(e => e.fund === t.fund && e.date.startsWith(eventMonth));
  const eventPairsBefore = new Set(monthEvents.filter(e => e.date < t.date).map(e => e.date)).size;

  console.log(`  Event-pairs before this date in same month: ${eventPairsBefore}`);

  // The entry after eventPairsBefore event-pairs (0-indexed from first new entry after carryover)
  // is the balance before this event.

  // Carryover entries at start of month = entries that equal lastPrev
  let carryoverCount = 0;
  for (const e of currEntries) {
    if (Math.abs(e - lastPrev) < 0.000001) carryoverCount++;
    else break;
  }

  console.log(`  Carryover count: ${carryoverCount}`);

  // After carryovers, each event-pair adds 2 entries (post-yield + post-flow).
  // But actually from the analysis, same-day yield+flow = 2 entries (post-yield, post-flow).
  // So entry at index (carryover + eventPairsBefore * 2) = balance_before_yield for this event.
  // Entry at index (carryover + eventPairsBefore * 2 + 1) = balance_after_flow for this event.

  const beforeIdx = carryoverCount + eventPairsBefore * 2;
  const afterIdx = beforeIdx + 1; // post-flow

  console.log(`  beforeIdx: ${beforeIdx}, afterIdx: ${afterIdx}`);

  if (beforeIdx < currEntries.length) {
    balBefore = currEntries[beforeIdx];
    console.log(`  balance_before (from idx ${beforeIdx}): ${balBefore}`);
  } else {
    console.log(`  balance_before (fallback to lastPrev): ${balBefore}`);
  }

  if (afterIdx < currEntries.length) {
    balAfter = currEntries[afterIdx];
    console.log(`  balance_after (from idx ${afterIdx}): ${balAfter}`);
  }

  // Compute yield
  const before = new Decimal(balBefore);
  const grossPct = new Decimal(t.grossPct);
  const netRate = grossPct.mul(new Decimal(1).minus(t.feePct).minus(t.ibPct));
  const yieldNet = before.mul(netRate);
  const postYield = before.plus(yieldNet);

  console.log(`  yield_net: ${yieldNet.toFixed(10)}`);
  console.log(`  post_yield: ${postYield.toFixed(10)}`);

  if (balAfter !== null) {
    const after = new Decimal(balAfter);
    const correctDeposit = after.minus(postYield);
    const jsonDep = new Decimal(jsonDeposit);
    const diff = jsonDep.minus(correctDeposit);

    console.log(`  balance_after: ${after.toFixed(10)}`);
    console.log(`  correct_deposit: ${correctDeposit.toFixed(10)}`);
    console.log(`  json_deposit:    ${jsonDep.toFixed(10)}`);
    console.log(`  diff: ${diff.toFixed(10)} (positive = JSON overestimates)`);
  }
}
