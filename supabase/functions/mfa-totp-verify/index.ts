import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TOTP } from 'https://deno.land/x/otpauth@v9.2.3/dist/otpauth.esm.js'

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
    const body = await req.json()
    const { code } = body

    if (!code || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Get stored TOTP secret
    const { data: totpData, error: totpError } = await supabaseClient
      .from('user_totp_settings')
      .select('secret_encrypted')
      .eq('user_id', user.id)
      .single()

    if (totpError || !totpData) {
      return new Response(
        JSON.stringify({ error: 'TOTP not initialized' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt secret (fallback to plain text for now)
    let secret = totpData.secret_encrypted
    
    try {
      const { data: decryptedSecret, error: decryptError } = await supabaseClient.rpc('decrypt_totp_secret', {
        encrypted_secret: totpData.secret_encrypted
      })
      
      if (!decryptError && decryptedSecret) {
        secret = decryptedSecret
      }
    } catch (e) {
      console.warn('Decryption failed, using fallback:', e)
      // Use the stored value as-is (fallback for development)
    }

    // Verify the TOTP code
    const totp = new TOTP({
      secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    })

    const currentTime = Math.floor(Date.now() / 1000)
    const window = 1 // Allow 1 time step before/after for clock skew

    let isValid = false
    for (let i = -window; i <= window; i++) {
      const timeStep = Math.floor((currentTime + i * 30) / 30)
      const expectedCode = totp.generate({ timestamp: timeStep * 30 * 1000 })
      if (expectedCode === code) {
        isValid = true
        break
      }
    }

    if (isValid) {
      // Update TOTP settings to verified
      const { error: updateError } = await supabaseClient
        .from('user_totp_settings')
        .update({
          verified: true,
          enabled: true,
          verified_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update TOTP status:', updateError)
      }

      // Log security event
      await supabaseClient.rpc('log_security_event', {
        event_type: 'TOTP_ENABLED',
        details: { user_id: user.id, timestamp: new Date().toISOString() }
      })

      return new Response(
        JSON.stringify({ enabled: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Log failed verification
      await supabaseClient.rpc('log_security_event', {
        event_type: 'TOTP_VERIFICATION_FAILED',
        details: { user_id: user.id, timestamp: new Date().toISOString() }
      })

      return new Response(
        JSON.stringify({ enabled: false, error: 'Invalid code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})