
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get CMC API key from secrets
    const CMC_API_KEY = Deno.env.get('CMC_API_KEY');
    
    if (!CMC_API_KEY) {
      throw new Error('CMC_API_KEY is not set');
    }

    // Get symbols from request
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request: symbols must be an array of cryptocurrency symbols'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Fetching prices for: ${symbols.join(', ')}`);
    
    // Convert symbols to a comma-separated string
    const symbolsString = symbols.join(',');
    
    // Call the CoinMarketCap API
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbolsString}`, 
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoinMarketCap API error: ${response.status} - ${errorText}`);
      throw new Error(`CoinMarketCap API error: ${response.status}`);
    }
    
    // Get the data from the response
    const data = await response.json();
    
    // Transform the data for our frontend
    const prices = {};
    
    if (data && data.data) {
      for (const symbol of symbols) {
        if (data.data[symbol]) {
          const tokenData = data.data[symbol];
          prices[symbol.toLowerCase()] = {
            price: tokenData.quote.USD.price,
            change24h: tokenData.quote.USD.percent_change_24h,
            market_cap: tokenData.quote.USD.market_cap,
            volume_24h: tokenData.quote.USD.volume_24h
          };
        }
      }
    }

    // Return the transformed data
    return new Response(
      JSON.stringify(prices),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
