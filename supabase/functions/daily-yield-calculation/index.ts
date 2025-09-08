import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔄 Starting daily yield calculations...');

    // Get all active positions
    const { data: positions, error: fetchError } = await supabaseAdmin
      .from('positions')
      .select('*')
      .eq('status', 'active');

    if (fetchError) {
      throw new Error(`Failed to fetch positions: ${fetchError.message}`);
    }

    if (!positions || positions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active positions to calculate',
          calculations: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processing ${positions.length} active positions`);

    const today = new Date().toISOString().split('T')[0];
    let calculationsCount = 0;

    // Process each position
    for (const position of positions) {
      // Check if already calculated today
      const { data: existingCalc } = await supabaseAdmin
        .from('yield_calculations')
        .select('id')
        .eq('position_id', position.id)
        .eq('calculation_date', today)
        .single();

      if (existingCalc) {
        console.log(`⏭️ Position ${position.id} already calculated for ${today}`);
        continue;
      }

      // Get yield configuration
      const { data: yieldConfig } = await supabaseAdmin
        .from('yield_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      const baseYieldRate = yieldConfig?.base_yield_rate || position.yield_rate || 0.12; // 12% default APY
      const dailyRate = baseYieldRate / 365;

      // Calculate daily yield (compound interest)
      const dailyYield = position.current_value * dailyRate;
      const newValue = position.current_value + dailyYield;
      const cumulativeYield = newValue - position.investment_amount;

      // Update position
      await supabaseAdmin
        .from('positions')
        .update({
          current_value: newValue,
          total_yield: cumulativeYield,
          last_calculation_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      // Log calculation
      await supabaseAdmin.from('yield_calculations').insert({
        position_id: position.id,
        calculation_date: today,
        daily_yield: dailyYield,
        cumulative_yield: cumulativeYield,
        position_value: newValue,
        created_at: new Date().toISOString(),
      });

      calculationsCount++;
    }

    // Update system status
    await supabaseAdmin.from('system_status').upsert({
      id: 'yield_calculation',
      last_yield_calculation: new Date().toISOString(),
      positions_calculated: calculationsCount,
      status: 'healthy',
      updated_at: new Date().toISOString(),
    });

    console.log(`✅ Yield calculations complete: ${calculationsCount} positions updated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully calculated yields for ${calculationsCount} positions`,
        calculations: calculationsCount,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Yield calculation failed:', error);

    // Log error to system
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin.from('system_logs').insert({
      service: 'daily-yield-calculation',
      level: 'error',
      message: error.message,
      details: { stack: error.stack },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
