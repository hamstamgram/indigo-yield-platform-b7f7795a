import { describe, it, expect } from 'vitest';
import { formatInvestorNumber, formatInvestorAmount } from '../src/utils/assets';
import { ASSET_CONFIGS } from '../src/types/asset';

describe('Decimal Parity Audit', () => {
  it('should match high-precision BTC values from Excel (10+ decimals)', () => {
    const excelValue = '0.04981439974'; // From BTC Boosted Program sheet
    
    // CURRENT BEHAVIOR: formatInvestorNumber uses INVESTOR_DISPLAY_DECIMALS = 3
    const formatted = formatInvestorNumber(excelValue);
    
    // This will fail if it's rounded to 3 decimals "0.050" or "0.049"
    expect(formatted).toBe('0.04981439974');
  });

  it('should respect asset-specific displayDecimals for BTC', () => {
    const excelValue = 0.04981439974;
    const formatted = formatInvestorAmount(excelValue, 'BTC');
    
    // BTC Config says displayDecimals: 8
    // But formatInvestorAmount currently uses INVESTOR_DISPLAY_DECIMALS = 3 override
    expect(formatted).toContain('0.04981440 BTC');
  });
});
