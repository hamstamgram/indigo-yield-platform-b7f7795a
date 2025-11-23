import { describe, it, expect } from '@jest/globals';
import {
  createDefaultAssetSummaries,
  createAssetSummariesFromDb,
  createYieldSources,
} from '@/utils/assetUtils';

describe('Asset Utilities', () => {
  describe('createDefaultAssetSummaries', () => {
    it('should create default asset summaries', () => {
      const summaries = createDefaultAssetSummaries();

      expect(summaries).toHaveLength(4);
      expect(summaries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ symbol: 'BTC', name: 'Bitcoin' }),
          expect.objectContaining({ symbol: 'ETH', name: 'Ethereum' }),
          expect.objectContaining({ symbol: 'SOL', name: 'Solana' }),
          expect.objectContaining({ symbol: 'USDC', name: 'USD Coin' }),
        ])
      );
    });

    it('should include balance for each asset', () => {
      const summaries = createDefaultAssetSummaries();

      summaries.forEach((asset) => {
        expect(asset.balance).toBeGreaterThanOrEqual(0);
        expect(asset.totalBalance).toBeGreaterThanOrEqual(0);
        expect(typeof asset.balance).toBe('number');
      });
    });

    it('should include user count for each asset', () => {
      const summaries = createDefaultAssetSummaries();

      summaries.forEach((asset) => {
        expect(asset.totalUsers).toBeGreaterThanOrEqual(0);
        expect(typeof asset.totalUsers).toBe('number');
      });
    });

    it('should include average yield for each asset', () => {
      const summaries = createDefaultAssetSummaries();

      summaries.forEach((asset) => {
        expect(asset.avgYield).toBeGreaterThanOrEqual(0);
        expect(typeof asset.avgYield).toBe('number');
      });
    });

    it('should have specific values for BTC', () => {
      const summaries = createDefaultAssetSummaries();
      const btc = summaries.find((a) => a.symbol === 'BTC');

      expect(btc).toBeDefined();
      expect(btc?.balance).toBe(12.5);
      expect(btc?.totalUsers).toBe(18);
      expect(btc?.avgYield).toBe(4.8);
    });

    it('should have specific values for USDC', () => {
      const summaries = createDefaultAssetSummaries();
      const usdc = summaries.find((a) => a.symbol === 'USDC');

      expect(usdc).toBeDefined();
      expect(usdc?.balance).toBe(425000);
      expect(usdc?.totalUsers).toBe(22);
      expect(usdc?.avgYield).toBe(8.1);
    });

    it('should ensure uniqueness by symbol', () => {
      const summaries = createDefaultAssetSummaries();
      const symbols = summaries.map((a) => a.symbol);
      const uniqueSymbols = new Set(symbols);

      expect(symbols.length).toBe(uniqueSymbols.size);
    });
  });

  describe('createAssetSummariesFromDb', () => {
    it('should create summaries from database assets', () => {
      const dbAssets = [
        { id: 1, symbol: 'BTC', name: 'Bitcoin' },
        { id: 2, symbol: 'ETH', name: 'Ethereum' },
      ];

      const summaries = createAssetSummariesFromDb(dbAssets);

      expect(summaries).toHaveLength(2);
      expect(summaries[0].symbol).toBe('BTC');
      expect(summaries[1].symbol).toBe('ETH');
    });

    it('should apply default values to known assets', () => {
      const dbAssets = [{ id: 1, symbol: 'BTC', name: 'Bitcoin' }];

      const summaries = createAssetSummariesFromDb(dbAssets);
      const btc = summaries[0];

      expect(btc.balance).toBe(12.5);
      expect(btc.totalUsers).toBe(18);
      expect(btc.avgYield).toBe(4.8);
    });

    it('should handle unknown assets with zero defaults', () => {
      const dbAssets = [{ id: 99, symbol: 'UNKNOWN', name: 'Unknown Token' }];

      const summaries = createAssetSummariesFromDb(dbAssets);
      const unknown = summaries[0];

      expect(unknown.balance).toBe(0);
      expect(unknown.totalUsers).toBe(0);
      expect(unknown.avgYield).toBe(0);
    });

    it('should handle empty array', () => {
      const summaries = createAssetSummariesFromDb([]);
      expect(summaries).toHaveLength(0);
    });

    it('should ensure uniqueness by symbol', () => {
      const dbAssets = [
        { id: 1, symbol: 'BTC', name: 'Bitcoin' },
        { id: 2, symbol: 'btc', name: 'Bitcoin Duplicate' },
        { id: 3, symbol: 'BTC', name: 'Bitcoin Again' },
      ];

      const summaries = createAssetSummariesFromDb(dbAssets);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].symbol).toBe('BTC');
    });

    it('should uppercase symbols', () => {
      const dbAssets = [
        { id: 1, symbol: 'btc', name: 'Bitcoin' },
        { id: 2, symbol: 'eth', name: 'Ethereum' },
      ];

      const summaries = createAssetSummariesFromDb(dbAssets);

      summaries.forEach((asset) => {
        expect(asset.symbol).toBe(asset.symbol.toUpperCase());
      });
    });

    it('should preserve all asset properties', () => {
      const dbAssets = [{ id: 1, symbol: 'ETH', name: 'Ethereum' }];

      const summaries = createAssetSummariesFromDb(dbAssets);
      const eth = summaries[0];

      expect(eth).toHaveProperty('id');
      expect(eth).toHaveProperty('symbol');
      expect(eth).toHaveProperty('name');
      expect(eth).toHaveProperty('totalBalance');
      expect(eth).toHaveProperty('balance');
      expect(eth).toHaveProperty('totalUsers');
      expect(eth).toHaveProperty('avgYield');
    });
  });

  describe('createYieldSources', () => {
    it('should create yield sources array', () => {
      const sources = createYieldSources();

      expect(sources).toHaveLength(5);
      expect(sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Aave' }),
          expect.objectContaining({ name: 'Compound' }),
          expect.objectContaining({ name: 'Solend' }),
          expect.objectContaining({ name: 'Lido' }),
          expect.objectContaining({ name: 'Marinade' }),
        ])
      );
    });

    it('should include all yield rates for each source', () => {
      const sources = createYieldSources();

      sources.forEach((source) => {
        expect(source).toHaveProperty('btcYield');
        expect(source).toHaveProperty('ethYield');
        expect(source).toHaveProperty('solYield');
        expect(source).toHaveProperty('usdcYield');
        expect(typeof source.btcYield).toBe('number');
        expect(typeof source.ethYield).toBe('number');
        expect(typeof source.solYield).toBe('number');
        expect(typeof source.usdcYield).toBe('number');
      });
    });

    it('should have valid Aave yields', () => {
      const sources = createYieldSources();
      const aave = sources.find((s) => s.name === 'Aave');

      expect(aave).toBeDefined();
      expect(aave?.btcYield).toBe(3.2);
      expect(aave?.ethYield).toBe(4.8);
      expect(aave?.solYield).toBe(0);
      expect(aave?.usdcYield).toBe(6.2);
    });

    it('should have valid Solend yields (SOL specialist)', () => {
      const sources = createYieldSources();
      const solend = sources.find((s) => s.name === 'Solend');

      expect(solend).toBeDefined();
      expect(solend?.btcYield).toBe(0);
      expect(solend?.ethYield).toBe(0);
      expect(solend?.solYield).toBe(6.5);
      expect(solend?.usdcYield).toBe(7.2);
    });

    it('should have valid Marinade yields (SOL specialist)', () => {
      const sources = createYieldSources();
      const marinade = sources.find((s) => s.name === 'Marinade');

      expect(marinade).toBeDefined();
      expect(marinade?.btcYield).toBe(0);
      expect(marinade?.ethYield).toBe(0);
      expect(marinade?.solYield).toBe(7.1);
      expect(marinade?.usdcYield).toBe(0);
    });

    it('should have non-negative yield rates', () => {
      const sources = createYieldSources();

      sources.forEach((source) => {
        expect(source.btcYield).toBeGreaterThanOrEqual(0);
        expect(source.ethYield).toBeGreaterThanOrEqual(0);
        expect(source.solYield).toBeGreaterThanOrEqual(0);
        expect(source.usdcYield).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have unique IDs', () => {
      const sources = createYieldSources();
      const ids = sources.map((s) => s.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should provide yields across different protocols', () => {
      const sources = createYieldSources();

      // Check that we have variety in yield sources
      const btcSources = sources.filter((s) => s.btcYield > 0);
      const ethSources = sources.filter((s) => s.ethYield > 0);
      const solSources = sources.filter((s) => s.solYield > 0);
      const usdcSources = sources.filter((s) => s.usdcYield > 0);

      expect(btcSources.length).toBeGreaterThan(0);
      expect(ethSources.length).toBeGreaterThan(0);
      expect(solSources.length).toBeGreaterThan(0);
      expect(usdcSources.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should work together for asset portfolio view', () => {
      const summaries = createDefaultAssetSummaries();
      const sources = createYieldSources();

      // Verify we can get asset data
      expect(summaries.length).toBeGreaterThan(0);

      // Verify we can get yield source data
      expect(sources.length).toBeGreaterThan(0);

      // Verify data compatibility
      summaries.forEach((asset) => {
        const symbol = asset.symbol.toLowerCase();
        const yieldKey = `${symbol}Yield` as keyof (typeof sources)[0];

        sources.forEach((source) => {
          // Each source should have a yield property for the asset
          expect(source).toHaveProperty(yieldKey);
        });
      });
    });
  });
});
