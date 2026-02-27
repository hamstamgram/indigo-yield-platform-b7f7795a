import fs from 'fs';
const data = JSON.parse(fs.readFileSync('scripts/seed-data/excel-events-v3.json', 'utf-8'));
const FEES_ID = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
const INDIGO_LP = 'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13';

console.log('=== FLOW events involving Indigo Fees or Indigo LP ===');
for (const ev of data.events) {
  if (ev.event_type !== 'FLOW') continue;
  for (const tx of ev.transactions) {
    if (tx.investor_uuid === FEES_ID || tx.investor_uuid === INDIGO_LP) {
      console.log(`  ${ev.fund} ${ev.date} ${tx.type}: ${tx.investor_name} ${tx.amount}`);
    }
  }
}

console.log('\n=== Events on hardcoded adjustment dates ===');
const dates = ['2025-04-16','2025-07-11','2025-10-03','2025-11-03','2025-12-04','2025-12-23','2026-01-02','2026-01-05','2026-01-08'];
for (const ev of data.events) {
  if (dates.includes(ev.date)) {
    if (ev.event_type === 'FLOW') {
      const txNames = ev.transactions.map(t => `${t.investor_name}(${t.type} ${t.amount})`).join(', ');
      console.log(`  ${ev.fund} ${ev.date} FLOW: ${txNames}`);
    } else {
      console.log(`  ${ev.fund} ${ev.date} YIELD gp=${ev.gross_pct}`);
    }
  }
}
