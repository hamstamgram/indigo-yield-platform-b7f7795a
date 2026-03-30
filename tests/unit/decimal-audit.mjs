import { formatInvestorNumber, formatInvestorAmount } from '../../src/utils/assets.ts';
import { ASSET_CONFIGS } from '../../src/types/asset.ts';

async function runAudit() {
  console.log('--- Decimal Parity Audit ---');
  
  const excelValue = '0.04981439974'; 
  const formatted = formatInvestorNumber(excelValue);
  
  console.log(`Excel: ${excelValue}`);
  console.log(`UI (Investor Number): ${formatted}`);
  
  if (formatted === excelValue) {
    console.log('✅ Match!');
  } else {
    console.log('❌ Mismatch! (Rounding/Truncation detected)');
  }

  const btcFormatted = formatInvestorAmount(excelValue, 'BTC');
  console.log(`UI (Investor BTC Amount): ${btcFormatted}`);
  
  if (btcFormatted.includes('0.04981440')) {
    console.log('✅ BTC Precision Match!');
  } else {
    console.log('❌ BTC Precision Mismatch!');
  }
}

runAudit().catch(console.error);
