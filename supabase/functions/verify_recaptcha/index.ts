import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  score?: number;
  action?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token is required' 
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Verify with Google reCAPTCHA
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const params = new URLSearchParams({
      secret: secretKey,
      response: token
    });

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!verifyResponse.ok) {
      throw new Error(`Google reCAPTCHA verification failed: ${verifyResponse.status}`);
    }

    const verifyData: RecaptchaResponse = await verifyResponse.json();

    // Log verification attempt for security monitoring
    console.log('reCAPTCHA verification:', {
      success: verifyData.success,
      hostname: verifyData.hostname,
      timestamp: verifyData.challenge_ts,
      errors: verifyData['error-codes']
    });

    // Return verification result
    return new Response(
      JSON.stringify({
        success: verifyData.success,
        score: verifyData.score,
        hostname: verifyData.hostname,
        errors: verifyData['error-codes']
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Verification failed',
        details: String(error)
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
