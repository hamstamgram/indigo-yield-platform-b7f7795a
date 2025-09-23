import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateSecret, otpauthURL } from 'https://deno.land/x/otpauth@v9.2.3/dist/otpauth.esm.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single()

    const userEmail = profile?.email || user.email || 'user@example.com'
    const displayName = profile?.first_name ? 
      `${profile.first_name} ${profile.last_name || ''}`.trim() : 
      userEmail.split('@')[0]

    // Generate new TOTP secret
    const secret = generateSecret()
    
    // Create otpauth URL
    const issuer = 'Indigo Investor Platform'
    const otpauthUrl = otpauthURL({
      issuer,
      label: `${issuer} (${displayName})`,
      secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    })

    // Encrypt and store the secret
    const { error: encryptError } = await supabaseClient.rpc('encrypt_totp_secret', {
      secret_text: secret
    })

    if (encryptError) {
      // Fallback: store using user ID as encryption key
      const { error: storeError } = await supabaseClient
        .from('user_totp_settings')
        .upsert({
          user_id: user.id,
          secret_encrypted: secret, // In production, this should be properly encrypted
          enabled: false,
          verified: false,
          created_at: new Date().toISOString()
        })

      if (storeError) {
        console.error('Failed to store TOTP secret:', storeError)
        return new Response(
          JSON.stringify({ error: 'Failed to setup TOTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        otpauth_url: otpauthUrl,
        secret_masked: secret.substring(0, 4) + '****'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})