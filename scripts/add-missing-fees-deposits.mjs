/**
 * Add missing hardcoded Indigo Fees deposits to excel-events-v3.json.
 *
 * Missing deposits identified from Excel formula analysis:
 * 1. ETH 2025-11-03: Tea-Fi hack refund (Indigo's share) = +0.0359 ETH
 * 2. USDT 2025-11-03: Indigo LP withdrawal delta = +26.13 USDT
 */
import fs from 'fs';

const INPUT = 'scripts/seed-data/excel-events-v3.json';
const OUTPUT = 'scripts/seed-data/excel-events-v3.json';

const FEES_UUID = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
const ETH_FUND_ID = '717614a2-9e24-4abc-a89d-02209a3a772a';
const USDT_FUND_ID = '8ef9dc49-e76c-4882-84ab-a449ef4326db';

const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));

// 1. Add Tea-Fi refund share to existing ETH FLOW on 2025-11-03
//    (index 121: already has Nathanael, Jose, Blondish deposits)
const ethFlowIdx = data.events.findIndex(ev =>
  ev.fund === 'ETH' && ev.date === '2025-11-03' && ev.event_type === 'FLOW'
);
if (ethFlowIdx >= 0) {
  data.events[ethFlowIdx].transactions.push({
    type: 'DEPOSIT',
    investor_name: 'Indigo Fees',
    investor_uuid: FEES_UUID,
    amount: '0.0359000000',
    fee_pct: 0,
    ib_pct: null,
  });
  console.log(`Added ETH Tea-Fi deposit to event index ${ethFlowIdx}`);
} else {
  console.error('ETH FLOW event on 2025-11-03 not found');
}

// 2. Add USDT LP delta as new FLOW event AFTER the existing USDT FLOW on 2025-11-03
const usdtFlowIdx = data.events.findIndex(ev =>
  ev.fund === 'USDT' && ev.date === '2025-11-03' && ev.event_type === 'FLOW'
);
if (usdtFlowIdx >= 0) {
  const newEvent = {
    fund: 'USDT',
    fund_id: USDT_FUND_ID,
    event_type: 'FLOW',
    date: '2025-11-03',
    comment: 'Indigo LP withdrawal delta (26.13 USDT remainder to Indigo Fees)',
    transactions: [
      {
        type: 'DEPOSIT',
        investor_name: 'Indigo Fees',
        investor_uuid: FEES_UUID,
        amount: '26.1300000000',
        fee_pct: 0,
        ib_pct: null,
      },
    ],
  };
  // Insert right after the existing USDT FLOW
  data.events.splice(usdtFlowIdx + 1, 0, newEvent);
  console.log(`Added USDT LP delta FLOW event after index ${usdtFlowIdx}`);
} else {
  console.error('USDT FLOW event on 2025-11-03 not found');
}

fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
console.log(`\nSaved: ${OUTPUT}`);
console.log(`Total events: ${data.events.length}`);
