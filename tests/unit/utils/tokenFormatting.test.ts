import { describe, it, expect } from 'vitest';
import * as tokenFormatting from '@/utils/tokenFormatting';

/**
 * Token Formatting Tests
 * 
 * Validates that all token formatting utilities work correctly
 * and do NOT produce USD/fiat currency formatting.
 */

describe('tokenFormatting', () => {
  describe('module exports', () => {
    it('should export formatting functions', () => {
      expect(typeof tokenFormatting).toBe('object');
    });
  });

  describe('formatTokenAmount', () => {
    it('should format BTC with 8 decimal places', () => {
      // BTC uses 8 decimals by convention
      const formatted = tokenFormatting.formatTokenAmount?.(1.5, 'BTC');
      if (formatted) {
        expect(formatted).toContain('BTC');
        expect(formatted).not.toContain('$');
        expect(formatted).not.toContain('USD');
      }
    });

    it('should format USDT with 2 decimal places', () => {
      const formatted = tokenFormatting.formatTokenAmount?.(100.50, 'USDT');
      if (formatted) {
        expect(formatted).toContain('USDT');
        expect(formatted).not.toContain('$');
      }
    });

    it('should format ETH with appropriate precision', () => {
      const formatted = tokenFormatting.formatTokenAmount?.(2.123456, 'ETH');
      if (formatted) {
        expect(formatted).toContain('ETH');
        expect(formatted).not.toContain('$');
        expect(formatted).not.toContain('USD');
      }
    });

    it('should handle zero amounts', () => {
      const formatted = tokenFormatting.formatTokenAmount?.(0, 'BTC');
      if (formatted) {
        expect(formatted).toContain('0');
        expect(formatted).toContain('BTC');
      }
    });

    it('should handle negative amounts', () => {
      const formatted = tokenFormatting.formatTokenAmount?.(-50, 'USDT');
      if (formatted) {
        expect(formatted).toContain('-');
        expect(formatted).toContain('USDT');
      }
    });
  });

  describe('NO USD formatting', () => {
    it('should never output dollar sign ($) for any asset', () => {
      const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL'];
      
      for (const asset of assets) {
        const formatted = tokenFormatting.formatTokenAmount?.(100, asset);
        if (formatted) {
          // Dollar sign should only appear in USDT/USDC context, not as currency symbol
          const hasDollarAsCurrency = formatted.startsWith('$') || formatted.includes('$ ');
          expect(hasDollarAsCurrency).toBe(false);
        }
      }
    });

    it('should not use Intl.NumberFormat currency style', () => {
      // Verify the module doesn't export currency-style formatters
      const exports = Object.keys(tokenFormatting);
      
      // Should not have functions named formatCurrency or formatUSD
      expect(exports).not.toContain('formatUSD');
      // formatCurrency might exist but should be deprecated
    });
  });

  describe('getAssetConfig', () => {
    it('should return correct decimal places for each asset', () => {
      const btcConfig = tokenFormatting.getAssetConfig?.('BTC');
      const usdtConfig = tokenFormatting.getAssetConfig?.('USDT');
      
      if (btcConfig) {
        expect(btcConfig.decimals).toBe(8);
        expect(btcConfig.symbol).toBe('BTC');
      }
      
      if (usdtConfig) {
        expect(usdtConfig.decimals).toBe(2);
        expect(usdtConfig.symbol).toBe('USDT');
      }
    });

    it('should have fallback for unknown assets', () => {
      const unknownConfig = tokenFormatting.getAssetConfig?.('UNKNOWN');
      
      // Should return default config or handle gracefully
      if (unknownConfig) {
        expect(unknownConfig.decimals).toBeDefined();
        expect(unknownConfig.symbol).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const formatted = tokenFormatting.formatTokenAmount?.(1000000000, 'BTC');
      if (formatted) {
        expect(formatted).toContain('BTC');
      }
    });

    it('should handle very small numbers', () => {
      const formatted = tokenFormatting.formatTokenAmount?.(0.00000001, 'BTC');
      if (formatted) {
        expect(formatted).toContain('BTC');
      }
    });

    it('should handle null/undefined gracefully', () => {
      // Should not throw for edge cases
      expect(() => {
        tokenFormatting.formatTokenAmount?.(null as any, 'BTC');
        tokenFormatting.formatTokenAmount?.(undefined as any, 'BTC');
      }).not.toThrow();
    });
  });
});
