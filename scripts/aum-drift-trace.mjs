import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Decimal = require('decimal.js');
Decimal.set({ precision: 40 });

const data = JSON.parse(fs.readFileSync('scripts/seed-data/excel-events-v3.json', 'utf-8'));

// Platform DB opening_aum values for BTC (from yield_distributions query)
const dbDists = [
  {date:'2024-07-31', opening_aum:'3.4680000000'},
  {date:'2024-08-21', opening_aum:'3.4900000000'},
  {date:'2024-08-31', opening_aum:'5.4999999999'},
  {date:'2024-09-30', opening_aum:'5.5099999999'},
  {date:'2024-10-31', opening_aum:'21.8792999999'},
  {date:'2024-11-09', opening_aum:'21.9899999999'},
  {date:'2024-11-30', opening_aum:'21.7500000000'},
  {date:'2024-12-14', opening_aum:'21.8400000000'},
  {date:'2024-12-31', opening_aum:'10.1878628968'},
  {date:'2025-01-31', opening_aum:'10.2399627070'},
  {date:'2025-02-28', opening_aum:'10.2999624885'},
  {date:'2025-03-31', opening_aum:'10.3399623428'},
  {date:'2025-04-16', opening_aum:'3.6550658566'},
  {date:'2025-04-30', opening_aum:'15.6999804196'},
  {date:'2025-05-13', opening_aum:'15.7599803449'},
  {date:'2025-05-30', opening_aum:'13.6698817464'},
  {date:'2025-06-11', opening_aum:'13.6039802276'},
  {date:'2025-06-30', opening_aum:'15.6445801686'},
  {date:'2025-07-11', opening_aum:'15.6576801519'},
  {date:'2025-07-24', opening_aum:'28.0930800757'},
  {date:'2025-07-25', opening_aum:'30.2160440703'},
  {date:'2025-07-31', opening_aum:'29.9576800695'},
  {date:'2025-08-20', opening_aum:'30.5776800557'},
  {date:'2025-08-25', opening_aum:'30.5499800010'},
  {date:'2025-08-31', opening_aum:'31.4751799918'},
  {date:'2025-09-30', opening_aum:'31.4899799823'},
  {date:'2025-10-03', opening_aum:'31.5999799124'},
  {date:'2025-10-23', opening_aum:'32.0594798996'},
  {date:'2025-10-31', opening_aum:'32.2019798491'},
  {date:'2025-11-05', opening_aum:'32.2099798443'},
  {date:'2025-11-10', opening_aum:'31.5062162888'},
  {date:'2025-11-17', opening_aum:'32.0367163124'},
  {date:'2025-11-27', opening_aum:'36.9080163243'},
  {date:'2025-12-08', opening_aum:'42.5310163297'},
  {date:'2025-12-09', opening_aum:'43.6797628342'},
  {date:'2025-12-15', opening_aum:'44.3867625627'},
  {date:'2025-12-23', opening_aum:'45.5696850293'},
  {date:'2026-01-05', opening_aum:'32.8053394189'},
  {date:'2026-01-13', opening_aum:'31.5556160657'},
  {date:'2026-01-19', opening_aum:'32.3455926934'},
];

// BTC yield events from seed
const btcYields = data.events.filter(e => e.fund === 'BTC' && e.event_type === 'YIELD');
const btcFlows = data.events.filter(e => e.fund === 'BTC' && e.event_type === 'FLOW');
const flowDates = new Set(btcFlows.map(f => f.date));

console.log('BTC AUM DRIFT ANALYSIS');
console.log('Date         | Platform AUM     | Excel AUM Before | Diff           | Same-day Flow?');
console.log('-'.repeat(95));

for (let i = 0; i < dbDists.length && i < btcYields.length; i++) {
  const db = dbDists[i];
  const ev = btcYields[i];

  if (db.date !== ev.date) {
    console.log(`DATE MISMATCH: DB=${db.date} vs Seed=${ev.date}`);
    continue;
  }

  const gp = new Decimal(String(ev.gross_pct));
  const aumAfter = new Decimal(ev.aum_after);
  // Excel AUM Before = aum_after / (1 + gross_pct) -- ONLY valid for yield-only events
  const excelAumBefore = aumAfter.div(gp.plus(1));
  const platformAum = new Decimal(db.opening_aum);
  const diff = platformAum.minus(excelAumBefore);
  const hasFlow = flowDates.has(ev.date);
  const mark = diff.abs().gt('0.001') ? ' ***' : (diff.abs().gt('0.00001') ? ' **' : (diff.abs().gt('0.0000001') ? ' *' : ''));
  console.log(
    db.date + ' | ' +
    platformAum.toFixed(10).padStart(16) + ' | ' +
    excelAumBefore.toFixed(10).padStart(16) + ' | ' +
    diff.toFixed(10).padStart(14) + ' | ' +
    (hasFlow ? 'YES' : 'no') + mark
  );
}
