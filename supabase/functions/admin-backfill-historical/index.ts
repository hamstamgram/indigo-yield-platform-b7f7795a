import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get request body
    const { startDate, endDate } = await req.json();

    console.log(`Starting historical data backfill from ${startDate} to ${endDate}`);

    // Call the backfill function
    const { data, error } = await supabaseClient.rpc('backfill_historical_positions', {
      p_start_date: startDate || '2024-06-01',
      p_end_date: endDate || new Date().toISOString().split('T')[0]
    });

    if (error) {
      console.error('Error during backfill:', error);
      throw error;
    }

    console.log('Backfill completed successfully:', data);

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        message: 'Historical data backfill completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in backfill function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to backfill historical data'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})