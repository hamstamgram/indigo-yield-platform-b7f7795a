import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Secure CORS configuration
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid CSRF token' }),
        { headers: { ...headers, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
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
        headers: { ...headers, 'Content-Type': 'application/json' },
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
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})