import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Decimal = require('decimal.js');
Decimal.set({ precision: 30 });

const data = JSON.parse(fs.readFileSync('scripts/seed-data/excel-events-v3.json', 'utf-8'));
const FEES = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';

// UUID mapping: Excel UUID -> DB UUID (for investors whose profile was recreated)
const UUID_MAP = {
  'd681a28c-bb59-4bb7-bf34-ab23910596df': '3d606d2e-28cf-41e7-96f2-aeb52551c053', // Alex Jacobs
};

// Exact DB values from query (18dp precision after numeric(38,18) migration) - Updated 2026-02-27
const dbPositions = [
{"fund":"BTC","investor_id":"114164b0-1aba-4b40-9abc-8d72adfdc60a","current_value":"0.622221887645701920"},
{"fund":"BTC","investor_id":"203caf71-a9ac-4e2a-bbd3-b45dd51758d4","current_value":"4.834201273588991875"},
{"fund":"BTC","investor_id":"249f4ab3-3433-4d81-ac92-1531b3573a50","current_value":"0.151398327984679868"},
{"fund":"BTC","investor_id":"3d606d2e-28cf-41e7-96f2-aeb52551c053","current_value":"0.000022450982231303"},
{"fund":"BTC","investor_id":"44801beb-4476-4a9b-9751-4e70267f6953","current_value":"7.597853117099185394"},
{"fund":"BTC","investor_id":"529cac24-615c-4408-b683-2c4ab635d6fd","current_value":"4.182429820795105008"},
{"fund":"BTC","investor_id":"99e5a116-44ba-4a45-9f56-5877b235f960","current_value":"1.005438733569318855"},
{"fund":"BTC","investor_id":"b464a3f7-60d5-4bc0-9833-7b413bcc6cae","current_value":"0.206435027836760511"},
{"fund":"BTC","investor_id":"b4f5d56b-b128-4799-b805-d34264165f45","current_value":"3.999800000000000000"},
{"fund":"BTC","investor_id":"e134e0df-d4e7-49c4-80b3-4ef37af6bebf","current_value":"4.291298962429173588"},
{"fund":"BTC","investor_id":"ed91c89d-23de-4981-b6b7-60e13f1a6767","current_value":"0.455011147447218468"},
{"fund":"BTC","investor_id":"f462d9e5-7363-4c82-a144-4e694d2b55da","current_value":"0.000759875824146342"},
{"fund":"BTC","investor_id":"f917cd8b-2d12-428c-ae3c-210b7ee3ae75","current_value":"6.739706077721866124"},
{"fund":"BTC","investor_id":"fbf8e2f4-7c5d-4496-a486-f0d8e88cc794","current_value":"2.153270293270520793"},
{"fund":"ETH","investor_id":"114164b0-1aba-4b40-9abc-8d72adfdc60a","current_value":"25.030000000000000000"},
{"fund":"ETH","investor_id":"203caf71-a9ac-4e2a-bbd3-b45dd51758d4","current_value":"68.490204280687096015"},
{"fund":"ETH","investor_id":"3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc","current_value":"50.982655847379189984"},
{"fund":"ETH","investor_id":"3d606d2e-28cf-41e7-96f2-aeb52551c053","current_value":"0.003369787219545697"},
{"fund":"ETH","investor_id":"529cac24-615c-4408-b683-2c4ab635d6fd","current_value":"129.721132806554592448"},
{"fund":"ETH","investor_id":"5fc170e2-7a07-4f32-991f-d8b6deec277c","current_value":"0.024889461396534674"},
{"fund":"ETH","investor_id":"82f58ac0-2d34-4c00-b0df-34383c1d1dfd","current_value":"193.318770992945527513"},
{"fund":"ETH","investor_id":"9405071c-0b52-4399-85da-9f1ba9b289c1","current_value":"0.048128426632781823"},
{"fund":"ETH","investor_id":"a00073d1-f37d-4e21-a54b-1b55df17e85a","current_value":"31.547639534062137179"},
{"fund":"ETH","investor_id":"b464a3f7-60d5-4bc0-9833-7b413bcc6cae","current_value":"3.432434770206847630"},
{"fund":"ETH","investor_id":"cdcccf6e-32f9-475a-9f88-34272ca3e64b","current_value":"68.894120966311766930"},
{"fund":"ETH","investor_id":"ed91c89d-23de-4981-b6b7-60e13f1a6767","current_value":"49.505105533800508294"},
{"fund":"ETH","investor_id":"f462d9e5-7363-4c82-a144-4e694d2b55da","current_value":"0.061547611364766584"},
{"fund":"SOL","investor_id":"203caf71-a9ac-4e2a-bbd3-b45dd51758d4","current_value":"89.236514958358496760"},
{"fund":"SOL","investor_id":"3d606d2e-28cf-41e7-96f2-aeb52551c053","current_value":"0.033364175086484043"},
{"fund":"SOL","investor_id":"b464a3f7-60d5-4bc0-9833-7b413bcc6cae","current_value":"9.720261941333562431"},
{"fund":"SOL","investor_id":"f462d9e5-7363-4c82-a144-4e694d2b55da","current_value":"1.859858446147330120"},
{"fund":"USDT","investor_id":"20396ec2-c919-46ef-b3a3-8005a8a34bd3","current_value":"143017.464794895910837091"},
{"fund":"USDT","investor_id":"203caf71-a9ac-4e2a-bbd3-b45dd51758d4","current_value":"296.990420392301003562"},
{"fund":"USDT","investor_id":"24f3054e-a125-4954-8861-55aa617cbb2c","current_value":"348958.478252542084913984"},
{"fund":"USDT","investor_id":"2f7b8bb2-6a60-4fc9-953d-b9fae44337c1","current_value":"4200000.000000000000000000"},
{"fund":"USDT","investor_id":"32d75475-0b78-4b7b-925a-e9429f6fe66d","current_value":"101919.968752386862331178"},
{"fund":"USDT","investor_id":"3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c","current_value":"229840.195676985685796154"},
{"fund":"USDT","investor_id":"44801beb-4476-4a9b-9751-4e70267f6953","current_value":"47222.610759108773979338"},
{"fund":"USDT","investor_id":"511991c7-93a2-4d2b-b42a-43120d58f672","current_value":"114638.367239254362393458"},
{"fund":"USDT","investor_id":"64cb831a-3365-4a89-9369-620ab7a1ff26","current_value":"232915.232766412790221872"},
{"fund":"USDT","investor_id":"7d049f7f-b77f-4650-b772-6a8806f00103","current_value":"101055.922411526438339793"},
{"fund":"USDT","investor_id":"7fdedf56-e838-45ea-91f8-6e441810c761","current_value":"114700.230205304100417697"},
{"fund":"USDT","investor_id":"9405071c-0b52-4399-85da-9f1ba9b289c1","current_value":"213.413164141147715595"},
{"fund":"USDT","investor_id":"98dd4ff5-b5cb-4257-a501-aa25a6d638c5","current_value":"287093.443138654561787113"},
{"fund":"USDT","investor_id":"99e56523-32a6-43e5-b9b3-789992cc347c","current_value":"52.989959976641434244"},
{"fund":"USDT","investor_id":"b464a3f7-60d5-4bc0-9833-7b413bcc6cae","current_value":"16693.180589934332016689"},
{"fund":"USDT","investor_id":"bb655a37-9e91-4166-b575-cafbbbb8c200","current_value":"208002.136315564713504561"},
{"fund":"USDT","investor_id":"c85bddf5-7720-47a5-8336-669ea604b94b","current_value":"852212.861935727559278826"},
{"fund":"USDT","investor_id":"cdcccf6e-32f9-475a-9f88-34272ca3e64b","current_value":"242825.223417737605042451"},
{"fund":"USDT","investor_id":"d5719d57-5308-4b9d-8a4f-a9a8aa596af4","current_value":"102412.669981261100552934"},
{"fund":"USDT","investor_id":"e9bbc28b-5d8d-410c-940b-b37a54a726e0","current_value":"50536.622075887108773473"},
{"fund":"XRP","investor_id":"b464a3f7-60d5-4bc0-9833-7b413bcc6cae","current_value":"633.648549288177541058"},
{"fund":"XRP","investor_id":"f462d9e5-7363-4c82-a144-4e694d2b55da","current_value":"158.350863970003063935"},
];

// Build lookup
const dbLookup = {};
for (const pos of dbPositions) {
  const key = `${pos.fund}:${pos.investor_id}`;
  dbLookup[key] = pos.current_value;
}

console.log('=== FULL BALANCE COMPARISON (Platform vs Excel) ===\n');
let totalPass = 0, totalFail = 0;
const failures = [];

for (const [fund, investors] of Object.entries(data.final_balances)) {
  console.log(`--- ${fund} ---`);
  for (const [uuid, entry] of Object.entries(investors)) {
    const expectedVal = typeof entry === 'object' ? entry.balance : entry;
    const investorName = typeof entry === 'object' ? entry.name : uuid.substring(0,8);
    const mappedUuid = UUID_MAP[uuid] || uuid;
    const key = `${fund}:${mappedUuid}`;
    const dbVal = dbLookup[key];

    // Skip inactive/withdrawn investors (no active position)
    if (!dbVal) {
      const expected = new Decimal(String(expectedVal));
      if (expected.isZero()) {
        totalPass++;
        continue;
      }
      console.log(`  ${investorName}: MISSING (expected ${expectedVal})`);
      totalFail++;
      failures.push({ fund, name: investorName, reason: 'missing', expected: expectedVal });
      continue;
    }

    const exp = new Decimal(String(expectedVal));
    const act = new Decimal(String(dbVal));
    const diff = act.minus(exp);
    const absDiff = diff.abs();
    const tol = fund === 'USDT' ? new Decimal('0.01') : new Decimal('0.00000100');
    const pass = absDiff.lte(tol);

    if (pass) {
      totalPass++;
    } else {
      totalFail++;
      const sign = diff.isPositive() ? '+' : '';
      console.log(`  ${investorName}: FAIL  diff=${sign}${diff.toFixed(10)}`);
      failures.push({ fund, name: investorName, diff: diff.toFixed(10), expected: exp.toFixed(10), actual: act.toFixed(10) });
    }
  }
}

console.log(`\n=== RESULT: ${totalPass} PASS / ${totalFail} FAIL ===`);
if (failures.length > 0) {
  console.log('\nFailed positions:');
  for (const f of failures) {
    if (f.reason === 'missing') {
      console.log(`  ${f.fund} ${f.name}: MISSING (expected ${f.expected})`);
    } else {
      console.log(`  ${f.fund} ${f.name}: platform=${f.actual} expected=${f.expected} diff=${f.diff}`);
    }
  }
}

// Indigo Fees detail
console.log('\n=== INDIGO FEES DETAIL ===');
for (const [fund, investors] of Object.entries(data.final_balances)) {
  const uuid = FEES;
  const entry = investors[uuid];
  const expVal = typeof entry === 'object' ? entry.balance : (entry || 0);
  const exp = new Decimal(String(expVal));
  const act = new Decimal(String(dbLookup[`${fund}:${uuid}`] || '0'));
  const diff = act.minus(exp);
  const sign = diff.isPositive() ? '+' : '';
  console.log(`  ${fund}: platform=${act.toFixed(10)} excel=${exp.toFixed(10)} diff=${sign}${diff.toFixed(10)}`);
}
