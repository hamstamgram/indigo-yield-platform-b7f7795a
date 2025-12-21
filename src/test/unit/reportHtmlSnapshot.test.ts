/**
 * Report HTML Snapshot Tests
 * 
 * These tests ensure the generated report HTML contains all required
 * elements for email compatibility and design consistency.
 */

import { describe, it, expect } from 'vitest';
import { 
  generateMonthlyStatementHTML, 
  validateGeneratedHtml,
  MonthlyStatementData 
} from '@/lib/statements/monthlyEmailGenerator';

// Mock fixture data with 2 funds
const mockStatementData: MonthlyStatementData = {
  investor_name: 'Test Investor',
  investor_email: 'test@example.com',
  period_ended: 'November 30th, 2025',
  funds: [
    {
      fund_name: 'BTC YIELD FUND',
      mtd_beginning_balance: '1.50000000',
      mtd_additions: '0.25000000',
      mtd_redemptions: '0',
      mtd_net_income: '0.05000000',
      mtd_ending_balance: '1.80000000',
      mtd_rate_of_return: '3.33',
      qtd_beginning_balance: '1.20000000',
      qtd_additions: '0.50000000',
      qtd_redemptions: '0',
      qtd_net_income: '0.10000000',
      qtd_ending_balance: '1.80000000',
      qtd_rate_of_return: '8.33',
      ytd_beginning_balance: '0.80000000',
      ytd_additions: '0.75000000',
      ytd_redemptions: '0',
      ytd_net_income: '0.25000000',
      ytd_ending_balance: '1.80000000',
      ytd_rate_of_return: '31.25',
      itd_beginning_balance: '0',
      itd_additions: '1.50000000',
      itd_redemptions: '0',
      itd_net_income: '0.30000000',
      itd_ending_balance: '1.80000000',
      itd_rate_of_return: '20.00',
    },
    {
      fund_name: 'ETH YIELD FUND',
      mtd_beginning_balance: '10.000000',
      mtd_additions: '0',
      mtd_redemptions: '2.000000',
      mtd_net_income: '-0.500000',
      mtd_ending_balance: '7.500000',
      mtd_rate_of_return: '-5.00',
      qtd_beginning_balance: '15.000000',
      qtd_additions: '0',
      qtd_redemptions: '5.000000',
      qtd_net_income: '-2.500000',
      qtd_ending_balance: '7.500000',
      qtd_rate_of_return: '-16.67',
      ytd_beginning_balance: '20.000000',
      ytd_additions: '0',
      ytd_redemptions: '10.000000',
      ytd_net_income: '-2.500000',
      ytd_ending_balance: '7.500000',
      ytd_rate_of_return: '-12.50',
      itd_beginning_balance: '0',
      itd_additions: '20.000000',
      itd_redemptions: '10.000000',
      itd_net_income: '-2.500000',
      itd_ending_balance: '7.500000',
      itd_rate_of_return: '-12.50',
    },
  ],
};

describe('Report HTML Structure', () => {
  it('should include DOCTYPE declaration', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('should include all required meta tags', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('meta charset="utf-8"');
    expect(html).toContain('x-apple-disable-message-reformatting');
    expect(html).toContain('format-detection');
    expect(html).toContain('viewport');
  });

  it('should include MSO conditionals for Outlook', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('<!--[if mso]>');
    expect(html).toContain('<![endif]-->');
    expect(html).toContain('PixelsPerInch');
  });

  it('should include Montserrat font setup', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain("font-family: 'Montserrat'");
    expect(html).toContain('fonts.googleapis.com/css2?family=Montserrat');
  });

  it('should include print CSS for PDF export', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('@media print');
    expect(html).toContain('print-color-adjust: exact');
    expect(html).toContain('-webkit-print-color-adjust: exact');
  });

  it('should include non-empty style block', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('<style>');
    expect(html).toContain('</style>');
    // Verify style block has content
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).not.toBeNull();
    expect(styleMatch![1].trim().length).toBeGreaterThan(100);
  });
});

describe('Report Email-Safe Attributes', () => {
  it('should include body bgcolor fallback', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('bgcolor="#f1f5f9"');
  });

  it('should include header bgcolor fallback', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('bgcolor="#edf0fe"');
  });

  it('should include content area bgcolor fallback', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('bgcolor="#f8fafc"');
  });

  it('should include fund block bgcolor fallback', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('bgcolor="#ffffff"');
  });

  it('should have matching style and bgcolor attributes', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    // Body
    expect(html).toContain('background-color:#f1f5f9');
    expect(html).toContain('bgcolor="#f1f5f9"');
    // Header
    expect(html).toContain('background-color:#edf0fe');
    expect(html).toContain('bgcolor="#edf0fe"');
  });
});

describe('Report Design Elements', () => {
  it('should include border-radius styling', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('border-radius:10px');
    expect(html).toContain('border-radius: 10px 10px 0 0');
    expect(html).toContain('border-radius: 0 0 10px 10px');
  });

  it('should include fund block wrapper with correct styling', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('background-color:#ffffff; border-radius:10px; padding:20px; border: 1px solid #e2e8f0;');
  });

  it('should include proper spacing between fund blocks', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('style="height:16px;"');
  });

  it('should include responsive media queries', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('@media (max-width:600px)');
    expect(html).toContain('@media (max-width:480px)');
  });
});

describe('Report Token-Only Content', () => {
  it('should not contain USD or $ symbols in content', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    // Remove asset names (USDC, USDT) and stylesheet references before checking
    const cleanedHtml = html
      .replace(/USD[CT]/g, 'STABLECOIN')
      .replace(/stylesheet/g, 'STYLEREF');
    
    expect(cleanedHtml).not.toContain('USD');
    expect(cleanedHtml).not.toContain('$');
  });

  it('should use token currency labels in headers', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('MTD (BTC)');
    expect(html).toContain('QTD (BTC)');
    expect(html).toContain('YTD (BTC)');
    expect(html).toContain('ITD (BTC)');
    expect(html).toContain('MTD (ETH)');
  });
});

describe('Report Content Rendering', () => {
  it('should include investor name', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('Test Investor');
  });

  it('should include period ended date', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('November 30th, 2025');
  });

  it('should render both fund blocks', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('BTC YIELD FUND');
    expect(html).toContain('ETH YIELD FUND');
  });

  it('should apply green color for positive values', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('color:#16a34a');
  });

  it('should apply red color for negative values', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('color:#dc2626');
  });

  it('should format zero values as dash', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    // Should have dashes for zero redemptions
    expect(html.match(/>-</g)?.length).toBeGreaterThan(0);
  });
});

describe('Report Footer', () => {
  it('should include disclaimer text', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('This document is not an offer to sell');
  });

  it('should include social links', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('linkedin.com/company/indigo-fund');
    expect(html).toContain('instagram.com/indigo.fund');
    expect(html).toContain('twitter.com/indigo_fund');
  });

  it('should include copyright', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('© 2025 Indigo Fund');
  });

  it('should include unsubscribe link placeholder', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    expect(html).toContain('{{unsubscribe_url}}');
  });
});

describe('HTML Validation', () => {
  it('should pass all validation checks', () => {
    const html = generateMonthlyStatementHTML(mockStatementData);
    const result = validateGeneratedHtml(html);
    
    if (!result.valid) {
      console.error('Validation errors:', result.errors);
    }
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing elements', () => {
    const invalidHtml = '<html><body>Test</body></html>';
    const result = validateGeneratedHtml(invalidHtml);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('DOCTYPE'))).toBe(true);
    expect(result.errors.some(e => e.includes('Apple Mail'))).toBe(true);
  });
});
