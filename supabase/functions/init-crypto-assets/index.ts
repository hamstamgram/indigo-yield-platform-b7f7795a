
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Get Supabase connection from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Initialize Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Define the crypto assets to add
    const assets = [
      { symbol: 'btc', name: 'Bitcoin', decimal_places: 8 },
      { symbol: 'eth', name: 'Ethereum', decimal_places: 18 },
      { symbol: 'sol', name: 'Solana', decimal_places: 9 },
      { symbol: 'usdc', name: 'USD Coin', decimal_places: 6 }
    ];
    
    // Insert the assets into the database
    const { data, error } = await supabase
      .from('assets')
      .upsert(assets, { onConflict: 'symbol' })
      .select();
    
    if (error) {
      throw error;
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Crypto assets initialized successfully',
      data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error initializing crypto assets:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
