
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Secure CORS configuration - Read-only function, CSRF not required
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
});

// CoinMarketCap API configuration
const CMC_API_BASE = 'https://pro-api.coinmarketcap.com'

// Correct CMC IDs for our assets (verified from CoinMarketCap documentation)
const ASSET_CMC_IDS: Record<string, number> = {
  BTC: 1,      // Bitcoin
  ETH: 1027,   // Ethereum  
  USDT: 825,   // Tether
  SOL: 5426,   // Solana
  USDC: 3408,  // USD Coin
  EURC: 20641, // Euro Coin
}

const EUR_USD_RATE = 1.08 // Fallback EUR rate

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // This function is disabled as the system now works with native token yields only
  return new Response(JSON.stringify({
    error: 'Price fetching disabled - system now uses native token yields only',
    message: 'This endpoint has been disabled as the system no longer requires USD conversions'
  }), {
    status: 410, // Gone
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
});

function getMockPrices(): Record<string, any> {
  return {
    BTC: {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 67543.21,
      change24h: 2.34,
      change7d: 5.67,
      change30d: 8.90,
      marketCap: 1324567890000,
      volume24h: 28765432100,
      circulatingSupply: 19600000,
      lastUpdated: new Date().toISOString()
    },
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3245.67,
      change24h: -1.23,
      change7d: 3.45,
      change30d: 6.78,
      marketCap: 389876543210,
      volume24h: 15432198765,
      circulatingSupply: 120200000,
      lastUpdated: new Date().toISOString()
    },
    SOL: {
      symbol: 'SOL',
      name: 'Solana',
      price: 148.92,
      change24h: 5.67,
      change7d: 12.34,
      change30d: 18.90,
      marketCap: 67890123456,
      volume24h: 2345678901,
      circulatingSupply: 455000000,
      lastUpdated: new Date().toISOString()
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether',
      price: 1.0001,
      change24h: 0.01,
      change7d: 0.02,
      change30d: 0.01,
      marketCap: 95432109876,
      volume24h: 45678901234,
      circulatingSupply: 95400000000,
      lastUpdated: new Date().toISOString()
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      price: 1.0000,
      change24h: -0.01,
      change7d: 0.01,
      change30d: 0.00,
      marketCap: 34567890123,
      volume24h: 12345678901,
      circulatingSupply: 34500000000,
      lastUpdated: new Date().toISOString()
    },
    EURC: {
      symbol: 'EURC',
      name: 'Euro Coin',
      price: 1.08,
      change24h: 0.05,
      change7d: 0.12,
      change30d: 0.23,
      marketCap: 1234567890,
      volume24h: 123456789,
      circulatingSupply: 1140000000,
      lastUpdated: new Date().toISOString()
    },
    EUR: {
      symbol: 'EUR',
      name: 'Euro',
      price: 1.08,
      change24h: 0.1,
      change7d: 0.3,
      change30d: 0.5,
      marketCap: 0,
      volume24h: 0,
      lastUpdated: new Date().toISOString()
    }
  };
}

async function storePricesInDatabase(prices: Record<string, any>) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create table if it doesn't exist
    const { error: tableError } = await supabase.rpc('create_crypto_prices_table_if_not_exists');
    
    // Prepare price records for insertion
    const priceRecords = Object.values(prices).map(price => ({
      symbol: price.symbol,
      name: price.name,
      price: price.price,
      change_24h: price.change24h,
      change_7d: price.change7d,
      market_cap: price.marketCap,
      volume_24h: price.volume24h,
      recorded_at: new Date().toISOString()
    }));
    
    // Insert into crypto_prices table
    const { error } = await supabase
      .from('crypto_prices')
      .insert(priceRecords);
    
    if (error) {
      console.error('Error storing prices in database:', error);
    } else {
      console.log('Successfully stored crypto prices in database');
    }
  } catch (error) {
    console.error('Error in storePricesInDatabase:', error);
  }
}
