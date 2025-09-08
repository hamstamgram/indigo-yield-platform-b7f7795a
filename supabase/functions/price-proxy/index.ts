import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
}

// Mock prices for development - replace with actual API calls in production
const MOCK_PRICES: Record<string, PriceData> = {
  btc: {
    symbol: "BTC",
    price: 67500.00,
    change24h: 1250.00,
    change24hPercent: 1.89,
    high24h: 68200.00,
    low24h: 66100.00,
    volume24h: 25000000000,
    marketCap: 1320000000000,
    lastUpdated: new Date().toISOString()
  },
  eth: {
    symbol: "ETH",
    price: 3450.00,
    change24h: -45.00,
    change24hPercent: -1.29,
    high24h: 3520.00,
    low24h: 3400.00,
    volume24h: 12000000000,
    marketCap: 415000000000,
    lastUpdated: new Date().toISOString()
  },
  sol: {
    symbol: "SOL",
    price: 185.00,
    change24h: 8.50,
    change24hPercent: 4.82,
    high24h: 188.00,
    low24h: 176.00,
    volume24h: 2500000000,
    marketCap: 82000000000,
    lastUpdated: new Date().toISOString()
  },
  usdc: {
    symbol: "USDC",
    price: 1.00,
    change24h: 0.00,
    change24hPercent: 0.00,
    high24h: 1.001,
    low24h: 0.999,
    volume24h: 5000000000,
    marketCap: 26000000000,
    lastUpdated: new Date().toISOString()
  }
};

async function fetchRealPrices(symbols: string[]): Promise<Record<string, PriceData>> {
  // In production, implement actual API calls to CoinGecko, CoinMarketCap, or other providers
  // For now, return mock data with slight variations
  const prices: Record<string, PriceData> = {};
  
  for (const symbol of symbols) {
    const mockData = MOCK_PRICES[symbol.toLowerCase()];
    if (mockData) {
      // Add some random variation to simulate real price changes
      const variation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
      prices[symbol.toLowerCase()] = {
        ...mockData,
        price: mockData.price * (1 + variation),
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  return prices;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbols = url.searchParams.get("symbols")?.split(",") || ["btc", "eth", "sol", "usdc"];
    
    // Validate symbols
    const validSymbols = symbols.filter(s => 
      ["btc", "eth", "sol", "usdc"].includes(s.toLowerCase())
    );
    
    if (validSymbols.length === 0) {
      throw new Error("No valid symbols provided");
    }
    
    // Fetch prices
    const prices = await fetchRealPrices(validSymbols);
    
    // Cache prices in database for offline fallback
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Store in price_cache table (create this table in migrations if needed)
    for (const [symbol, data] of Object.entries(prices)) {
      await supabase
        .from("price_cache")
        .upsert({
          symbol: symbol.toUpperCase(),
          price: data.price,
          change_24h: data.change24h,
          change_24h_percent: data.change24hPercent,
          high_24h: data.high24h,
          low_24h: data.low24h,
          volume_24h: data.volume24h,
          market_cap: data.marketCap,
          updated_at: data.lastUpdated
        }, {
          onConflict: "symbol"
        });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: prices,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Price proxy error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
