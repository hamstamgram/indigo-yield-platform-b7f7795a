import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP } from "https://deno.land/x/otpauth@v9.2.3/dist/otpauth.esm.js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { mfaDisableRequestSchema, parseAndValidate } from "../_shared/validation.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate request body with Zod
    const validation = await parseAndValidate(req, mfaDisableRequestSchema, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }

    const { code } = validation.data;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get stored TOTP secret
    const { data: totpData, error: totpError } = await supabaseClient
      .from("user_totp_settings")
      .select("secret_encrypted, verified")
      .eq("user_id", user.id)
      .single();

    if (totpError || !totpData || !totpData.verified) {
      return new Response(JSON.stringify({ error: "TOTP not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt secret (fallback to plain text for now)
    let secret = totpData.secret_encrypted;

    try {
      const { data: decryptedSecret, error: decryptError } = await supabaseClient.rpc(
        "decrypt_totp_secret",
        {
          encrypted_secret: totpData.secret_encrypted,
        }
      );

      if (!decryptError && decryptedSecret) {
        secret = decryptedSecret;
      }
    } catch (e) {
      console.warn("Decryption failed, using fallback:", e);
    }

    // Verify the TOTP code before disabling
    const totp = new TOTP({
      secret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const currentTime = Math.floor(Date.now() / 1000);
    const window = 1;

    let isValid = false;
    for (let i = -window; i <= window; i++) {
      const timeStep = Math.floor((currentTime + i * 30) / 30);
      const expectedCode = totp.generate({ timestamp: timeStep * 30 * 1000 });
      if (expectedCode === code) {
        isValid = true;
        break;
      }
    }

    if (isValid) {
      // Disable TOTP
      const { error: disableError } = await supabaseClient
        .from("user_totp_settings")
        .update({
          verified: false,
          enabled: false,
          disabled_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (disableError) {
        console.error("Failed to disable TOTP:", disableError);
        return new Response(JSON.stringify({ error: "Failed to disable TOTP" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log security event
      await supabaseClient.rpc("log_security_event", {
        event_type: "TOTP_DISABLED",
        details: { user_id: user.id, timestamp: new Date().toISOString() },
      });

      return new Response(JSON.stringify({ disabled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Log failed attempt
      await supabaseClient.rpc("log_security_event", {
        event_type: "TOTP_DISABLE_FAILED",
        details: { user_id: user.id, timestamp: new Date().toISOString() },
      });

      return new Response(JSON.stringify({ disabled: false, error: "Invalid code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
