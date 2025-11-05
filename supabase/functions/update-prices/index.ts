/**
 * Supabase Edge Function: Update Asset Prices
 *
 * Fetches latest cryptocurrency prices from CoinGecko API
 * and updates the asset_prices table in the database.
 *
 * Schedule: Every 5 minutes via pg_cron
 * Provider: CoinGecko Free API (10-30 calls/minute)
 *
 * CRITICAL: Fixes hardcoded prices (BTC=$67,500, ETH=$3,200)
 * causing 45-48% valuation errors in investor portfolios
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// CoinGecko API configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = Deno.env.get('COINGECKO_API_KEY'); // Optional (Pro tier)

// Symbol mapping (your platform symbol → CoinGecko ID)
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'ATOM': 'cosmos',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  // Add more as needed
};

interface AssetPrice {
  symbol: string;
  price_usd: string;
  updated_at: string;
}

interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

serve(async (req) => {
  try {
    // CORS headers for browser requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    console.log('🔄 Starting price update...');

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Get active assets from database
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('symbol')
      .eq('is_active', true);

    if (assetsError) {
      console.error('❌ Failed to fetch assets:', assetsError);
      throw assetsError;
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active assets found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${assets.length} active assets`);

    // Step 2: Map symbols to CoinGecko IDs
    const coinGeckoIds = assets
      .map(asset => SYMBOL_TO_COINGECKO_ID[asset.symbol])
      .filter(id => id !== undefined);

    if (coinGeckoIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No supported assets found in CoinGecko mapping'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const idsString = coinGeckoIds.join(',');
    console.log(`🔗 Fetching prices for: ${idsString}`);

    // Step 3: Fetch prices from CoinGecko
    const url = `${COINGECKO_API_BASE}/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    // Add API key if available (Pro tier)
    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ CoinGecko API error:', response.status, errorText);
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const prices: CoinGeckoPriceResponse = await response.json();
    console.log(`✅ Fetched ${Object.keys(prices).length} prices from CoinGecko`);

    // Step 4: Prepare updates
    const now = new Date().toISOString();
    const updates: AssetPrice[] = [];
    const errors: string[] = [];

    for (const asset of assets) {
      const coinGeckoId = SYMBOL_TO_COINGECKO_ID[asset.symbol];

      if (!coinGeckoId) {
        errors.push(`No CoinGecko mapping for ${asset.symbol}`);
        continue;
      }

      const priceData = prices[coinGeckoId];

      if (!priceData || !priceData.usd) {
        errors.push(`No price data for ${asset.symbol} (${coinGeckoId})`);
        continue;
      }

      // Convert to NUMERIC(20,8) format (string with 8 decimals)
      const priceUsd = priceData.usd.toFixed(8);

      updates.push({
        symbol: asset.symbol,
        price_usd: priceUsd,
        updated_at: now,
      });

      console.log(`💰 ${asset.symbol}: $${priceUsd}`);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No prices could be fetched',
          errors,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Upsert prices to database
    const { error: upsertError } = await supabase
      .from('asset_prices')
      .upsert(updates, {
        onConflict: 'symbol',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('❌ Failed to update database:', upsertError);
      throw upsertError;
    }

    console.log(`✅ Successfully updated ${updates.length} prices`);

    // Step 6: Log to audit
    if (updates.length > 0) {
      await supabase.from('audit_log').insert({
        action: 'PRICE_UPDATE',
        resource_type: 'asset_prices',
        metadata: {
          updated_count: updates.length,
          errors: errors.length > 0 ? errors : undefined,
          timestamp: now,
        },
        severity: 'INFO',
      });
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        errors: errors.length > 0 ? errors : undefined,
        prices: updates.map(u => ({
          symbol: u.symbol,
          price_usd: u.price_usd,
        })),
        timestamp: now,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('❌ Error updating prices:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

/**
 * DEPLOYMENT INSTRUCTIONS:
 *
 * 1. Deploy this function:
 *    supabase functions deploy update-prices
 *
 * 2. Test the function:
 *    supabase functions invoke update-prices
 *
 * 3. Schedule via pg_cron (every 5 minutes):
 *
 *    SELECT cron.schedule(
 *      'update-asset-prices',
 *      '* /5 * * * *',
 *      $$
 *      SELECT
 *        net.http_post(
 *          url := 'https://noekumitbfoxhsndwypz.supabase.co/functions/v1/update-prices',
 *          headers := jsonb_build_object(
 *            'Content-Type', 'application/json',
 *            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
 *          )
 *        ) AS request_id;
 *      $$
 *    );
 *
 * 4. Verify cron job:
 *    SELECT * FROM cron.job;
 *
 * 5. Monitor function logs:
 *    supabase functions logs update-prices
 *
 * 6. Check price staleness in your application:
 *    SELECT symbol, price_usd, updated_at,
 *           EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_old
 *    FROM asset_prices
 *    ORDER BY updated_at DESC;
 */
