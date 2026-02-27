import Decimal from 'decimal.js';
import fs from 'fs';
Decimal.set({ precision: 20 });

// Platform positions (from DB query after re-seed)
const positions = {
  'BTC|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': '0.2064041339',
  'BTC|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': '4.8342012737',
  'BTC|b4f5d56b-b128-4799-b805-d34264165f45': '3.9998000000',
  'BTC|44801beb-4476-4a9b-9751-4e70267f6953': '7.5978531169',
  'BTC|e134e0df-d4e7-49c4-80b3-4ef37af6bebf': '4.2912989625',
  'BTC|f917cd8b-2d12-428c-ae3c-210b7ee3ae75': '6.7397060772',
  'BTC|249f4ab3-3433-4d81-ac92-1531b3573a50': '0.1513983282',
  'BTC|ed91c89d-23de-4981-b6b7-60e13f1a6767': '0.4550111476',
  'BTC|529cac24-615c-4408-b683-2c4ab635d6fd': '4.1824298207',
  'BTC|fbf8e2f4-7c5d-4496-a486-f0d8e88cc794': '2.1532702932',
  'BTC|3d606d2e-28cf-41e7-96f2-aeb52551c053': '0.0000224510',
  'BTC|f462d9e5-7363-4c82-a144-4e694d2b55da': '0.0007598757',
  'BTC|99e5a116-44ba-4a45-9f56-5877b235f960': '1.0054387335',
  'BTC|114164b0-1aba-4b40-9abc-8d72adfdc60a': '0.6222218877',
  'ETH|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': '3.3987824577',
  'ETH|cdcccf6e-32f9-475a-9f88-34272ca3e64b': '68.8941209664',
  'ETH|9405071c-0b52-4399-85da-9f1ba9b289c1': '0.0481284270',
  'ETH|ed91c89d-23de-4981-b6b7-60e13f1a6767': '49.5051055337',
  'ETH|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': '68.4902042807',
  'ETH|529cac24-615c-4408-b683-2c4ab635d6fd': '129.7211328065',
  'ETH|3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc': '50.9826558473',
  'ETH|5fc170e2-7a07-4f32-991f-d8b6deec277c': '0.0248894612',
  'ETH|3d606d2e-28cf-41e7-96f2-aeb52551c053': '0.0033697874',
  'ETH|82f58ac0-2d34-4c00-b0df-34383c1d1dfd': '193.3187709925',
  'ETH|f462d9e5-7363-4c82-a144-4e694d2b55da': '0.0615476115',
  'ETH|a00073d1-f37d-4e21-a54b-1b55df17e85a': '31.5476395341',
  'ETH|114164b0-1aba-4b40-9abc-8d72adfdc60a': '25.0300000000',
  'SOL|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': '9.7176135649',
  'SOL|3d606d2e-28cf-41e7-96f2-aeb52551c053': '0.0333641751',
  'SOL|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': '89.2365149584',
  'SOL|f462d9e5-7363-4c82-a144-4e694d2b55da': '1.8598584462',
  'USDT|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': '16666.5289956385',
  'USDT|cdcccf6e-32f9-475a-9f88-34272ca3e64b': '242825.2234177373',
  'USDT|7fdedf56-e838-45ea-91f8-6e441810c761': '114700.2302053041',
  'USDT|511991c7-93a2-4d2b-b42a-43120d58f672': '114638.3672392541',
  'USDT|24f3054e-a125-4954-8861-55aa617cbb2c': '348958.4782525416',
  'USDT|98dd4ff5-b5cb-4257-a501-aa25a6d638c5': '287093.4431386542',
  'USDT|bb655a37-9e91-4166-b575-cafbbbb8c200': '208002.1363155648',
  'USDT|20396ec2-c919-46ef-b3a3-8005a8a34bd3': '143017.4647948957',
  'USDT|64cb831a-3365-4a89-9369-620ab7a1ff26': '232915.2327664126',
  'USDT|3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c': '229840.1956769856',
  'USDT|9405071c-0b52-4399-85da-9f1ba9b289c1': '213.4131641411',
  'USDT|d5719d57-5308-4b9d-8a4f-a9a8aa596af4': '102412.6699812609',
  'USDT|32d75475-0b78-4b7b-925a-e9429f6fe66d': '101919.9687523868',
  'USDT|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': '296.9904203922',
  'USDT|c85bddf5-7720-47a5-8336-669ea604b94b': '852212.8619357276',
  'USDT|2f7b8bb2-6a60-4fc9-953d-b9fae44337c1': '4200000.0000000000',
  'USDT|e9bbc28b-5d8d-410c-940b-b37a54a726e0': '50536.6220758871',
  'USDT|7d049f7f-b77f-4650-b772-6a8806f00103': '101055.9224115266',
  'USDT|99e56523-32a6-43e5-b9b3-789992cc347c': '52.9899599765',
  'USDT|44801beb-4476-4a9b-9751-4e70267f6953': '47222.6107591088',
  'XRP|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': '633.6479625582',
  'XRP|f462d9e5-7363-4c82-a144-4e694d2b55da': '158.3508640000',
};

// Excel expected
const expected = {
  'BTC|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': {name:'Indigo Fees', val:'0.206435098'},
  'BTC|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': {name:'Jose Molla', val:'4.834201273'},
  'BTC|b4f5d56b-b128-4799-b805-d34264165f45': {name:'Kyle Gulamerian', val:'3.9998'},
  'BTC|44801beb-4476-4a9b-9751-4e70267f6953': {name:'Thomas Puech', val:'7.597853117'},
  'BTC|e134e0df-d4e7-49c4-80b3-4ef37af6bebf': {name:'Danielle Richetta', val:'4.291298963'},
  'BTC|f917cd8b-2d12-428c-ae3c-210b7ee3ae75': {name:'Kabbaj', val:'6.739706077'},
  'BTC|249f4ab3-3433-4d81-ac92-1531b3573a50': {name:'Victoria P-C', val:'0.151398328'},
  'BTC|ed91c89d-23de-4981-b6b7-60e13f1a6767': {name:'Nathanael Cohen', val:'0.4550111474'},
  'BTC|529cac24-615c-4408-b683-2c4ab635d6fd': {name:'Blondish', val:'4.182429821'},
  'BTC|fbf8e2f4-7c5d-4496-a486-f0d8e88cc794': {name:'Oliver Loisel', val:'2.153270293'},
  'BTC|d681a28c-bb59-4bb7-bf34-ab23910596df': {name:'Alex Jacobs', val:'0.00002245098223'},
  'BTC|f462d9e5-7363-4c82-a144-4e694d2b55da': {name:'Ryan Van Der Wall', val:'0.0007598933542'},
  'BTC|99e5a116-44ba-4a45-9f56-5877b235f960': {name:'Nath & Thomas', val:'1.005438734'},
  'BTC|114164b0-1aba-4b40-9abc-8d72adfdc60a': {name:'NSVO Holdings', val:'0.6222218876'},
  'ETH|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': {name:'Indigo Fees', val:'3.432434771'},
  'ETH|cdcccf6e-32f9-475a-9f88-34272ca3e64b': {name:'Babak Eftekhari', val:'68.89412097'},
  'ETH|9405071c-0b52-4399-85da-9f1ba9b289c1': {name:'Lars Ahlgreen', val:'0.04812842663'},
  'ETH|ed91c89d-23de-4981-b6b7-60e13f1a6767': {name:'Nathanael Cohen', val:'49.50510554'},
  'ETH|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': {name:'Jose Molla', val:'68.49020428'},
  'ETH|529cac24-615c-4408-b683-2c4ab635d6fd': {name:'Blondish', val:'129.7211329'},
  'ETH|3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc': {name:'Advantage Blockchain', val:'50.98265585'},
  'ETH|5fc170e2-7a07-4f32-991f-d8b6deec277c': {name:'Alec Beckman', val:'0.0248894614'},
  'ETH|3d606d2e-28cf-41e7-96f2-aeb52551c053': {name:'Alex Jacobs', val:'0.003369787219'},
  'ETH|82f58ac0-2d34-4c00-b0df-34383c1d1dfd': {name:'Tomer Zur', val:'193.3187709'},
  'ETH|f462d9e5-7363-4c82-a144-4e694d2b55da': {name:'Ryan Van Der Wall', val:'0.06154761137'},
  'ETH|a00073d1-f37d-4e21-a54b-1b55df17e85a': {name:'Brandon Hood', val:'31.54763953'},
  'ETH|114164b0-1aba-4b40-9abc-8d72adfdc60a': {name:'NSVO Holdings', val:'25.03'},
  'SOL|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': {name:'Indigo Fees', val:'9.72026242'},
  'SOL|3d606d2e-28cf-41e7-96f2-aeb52551c053': {name:'Alex Jacobs', val:'0.03336417509'},
  'SOL|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': {name:'Jose Molla', val:'89.23651496'},
  'SOL|f462d9e5-7363-4c82-a144-4e694d2b55da': {name:'Ryan Van Der Wall', val:'1.859858446'},
  'USDT|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': {name:'Indigo Fees', val:'16693.18059'},
  'USDT|cdcccf6e-32f9-475a-9f88-34272ca3e64b': {name:'Babak Eftekhari', val:'242825.2234'},
  'USDT|7fdedf56-e838-45ea-91f8-6e441810c761': {name:'Julien Grunebaum', val:'114700.2302'},
  'USDT|511991c7-93a2-4d2b-b42a-43120d58f672': {name:'Pierre Bezencon', val:'114638.3672'},
  'USDT|24f3054e-a125-4954-8861-55aa617cbb2c': {name:'Matthew Beatty', val:'348958.4782'},
  'USDT|98dd4ff5-b5cb-4257-a501-aa25a6d638c5': {name:'Bo De Kriek', val:'287093.4431'},
  'USDT|bb655a37-9e91-4166-b575-cafbbbb8c200': {name:'Dario Deiana', val:'208002.1363'},
  'USDT|20396ec2-c919-46ef-b3a3-8005a8a34bd3': {name:'Alain Bensimon', val:'143017.4648'},
  'USDT|64cb831a-3365-4a89-9369-620ab7a1ff26': {name:'Anne Cecile Noique', val:'232915.2328'},
  'USDT|3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c': {name:'Terance Chen', val:'229840.1957'},
  'USDT|9405071c-0b52-4399-85da-9f1ba9b289c1': {name:'Lars Ahlgreen', val:'213.4131641'},
  'USDT|d5719d57-5308-4b9d-8a4f-a9a8aa596af4': {name:'Sacha Oshry', val:'102412.67'},
  'USDT|32d75475-0b78-4b7b-925a-e9429f6fe66d': {name:'HALLEY86', val:'101919.9688'},
  'USDT|203caf71-a9ac-4e2a-bbd3-b45dd51758d4': {name:'Jose Molla', val:'296.9904213'},
  'USDT|c85bddf5-7720-47a5-8336-669ea604b94b': {name:'Monica Levy', val:'852212.8619'},
  'USDT|2f7b8bb2-6a60-4fc9-953d-b9fae44337c1': {name:'Sam Johnson', val:'4200000'},
  'USDT|e9bbc28b-5d8d-410c-940b-b37a54a726e0': {name:'Valeria Cruz', val:'50536.62208'},
  'USDT|7d049f7f-b77f-4650-b772-6a8806f00103': {name:'Ventures LS', val:'101055.9224'},
  'USDT|99e56523-32a6-43e5-b9b3-789992cc347c': {name:'Joel Barbeau', val:'52.98995997'},
  'USDT|44801beb-4476-4a9b-9751-4e70267f6953': {name:'Thomas Puech', val:'47222.61076'},
  'XRP|b464a3f7-60d5-4bc0-9833-7b413bcc6cae': {name:'Indigo Fees', val:'633.6485493'},
  'XRP|f462d9e5-7363-4c82-a144-4e694d2b55da': {name:'Ryan Van Der Wall', val:'158.350864'},
};

let pass = 0, fail = 0;
const failures = [];

for (const [key, exp] of Object.entries(expected)) {
  let actualVal = positions[key];
  // Alex Jacobs UUID mismatch
  if (!actualVal && key.includes('d681a28c')) {
    const altKey = key.replace('d681a28c-bb59-4bb7-bf34-ab23910596df', '3d606d2e-28cf-41e7-96f2-aeb52551c053');
    actualVal = positions[altKey];
  }
  const fund = key.split('|')[0];
  if (!actualVal) {
    console.log(`MISS | ${fund.padEnd(4)} | ${exp.name.padEnd(28)} | no position found`);
    fail++;
    continue;
  }
  const a = new Decimal(actualVal);
  const e = new Decimal(exp.val);
  const diff = a.minus(e);
  const absDiff = diff.abs();
  const tol = fund === 'USDT' ? 0.01 : 0.00000010;
  const ok = absDiff.lte(tol);
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status} | ${fund.padEnd(4)} | ${exp.name.padEnd(28)} | diff: ${diff.toFixed(10)}`);
  if (ok) pass++; else { fail++; failures.push({fund, name: exp.name, diff: diff.toFixed(10)}); }
}

console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===`);
if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  ${f.fund} ${f.name}: ${f.diff}`);
}
