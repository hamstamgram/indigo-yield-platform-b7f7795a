import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface SessionRequest {
  device_label?: string;
  user_agent?: string;
  ip?: string;
  refresh_token_id?: string;
  event: 'login' | 'logout' | '2fa_setup' | '2fa_verify' | 'session_revoked' | 'password_change';
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        },
      }
    );

    // Use service role client to get user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    const request: SessionRequest = await req.json();

    // Extract client IP and user agent from headers if not provided
    const clientIP = request.ip || req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.user_agent || req.headers.get('User-Agent') || 'unknown';

    if (request.event === 'login') {
      // Create new session record
      const { data: session, error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          device_label: request.device_label || 'Unknown Device',
          user_agent: userAgent,
          ip: clientIP,
          refresh_token_id: request.refresh_token_id ? 
            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.refresh_token_id))
              .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')) :
            null,
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }

      // Log access event
      await supabase
        .from('access_logs')
        .insert({
          user_id: user.id,
          event: request.event,
          ip: clientIP,
          user_agent: userAgent,
          device_label: request.device_label || 'Unknown Device',
          success: true,
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          session_id: session.id,
          message: 'Session registered successfully' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (request.event === 'logout' || request.event === 'session_revoked') {
      // Update session as revoked if refresh token provided
      if (request.refresh_token_id) {
        const hashedToken = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.refresh_token_id))
          .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

        await supabase
          .from('user_sessions')
          .update({
            revoked_at: new Date().toISOString(),
            revoked_by: user.id,
          })
          .eq('user_id', user.id)
          .eq('refresh_token_id', hashedToken)
          .is('revoked_at', null);
      }

      // Log access event
      await supabase
        .from('access_logs')
        .insert({
          user_id: user.id,
          event: request.event,
          ip: clientIP,
          user_agent: userAgent,
          device_label: request.device_label || 'Unknown Device',
          success: true,
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Session revoked successfully' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else {
      // For other events, just log them
      await supabase
        .from('access_logs')
        .insert({
          user_id: user.id,
          event: request.event,
          ip: clientIP,
          user_agent: userAgent,
          device_label: request.device_label || 'Unknown Device',
          success: true,
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Event logged successfully' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

  } catch (error) {
    console.error('Error in ef_register_session:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
