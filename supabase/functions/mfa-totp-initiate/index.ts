import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "https://esm.sh/otpauth@9.2.3";

// Secure CORS configuration
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 403,
      });
    }
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
        headers: { ...headers, "Content-Type": "application/json" },
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
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", user.id)
      .single();

    const userEmail = profile?.email || user.email || "user@example.com";
    const displayName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ""}`.trim()
      : userEmail.split("@")[0];

    // Generate new TOTP secret using OTPAuth
    const secret = new OTPAuth.Secret({ size: 20 });
    const issuer = "Indigo Investor Platform";
    
    // Create TOTP instance
    const totp = new OTPAuth.TOTP({
      issuer,
      label: `${issuer} (${displayName})`,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    // Get the otpauth URL
    const otpauthUrl = totp.toString();

    // Encrypt and store the secret - FAIL if encryption fails (security requirement)
    const { data: encryptedSecret, error: encryptError } = await supabaseClient.rpc(
      "encrypt_totp_secret",
      {
        secret_text: secret.base32,
      }
    );

    if (encryptError || !encryptedSecret) {
      console.error("Failed to encrypt TOTP secret:", encryptError);
      return new Response(
        JSON.stringify({ error: "Failed to encrypt TOTP secret. 2FA setup cannot proceed." }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Store the encrypted secret
    const { error: storeError } = await supabaseClient.from("user_totp_settings").upsert({
      user_id: user.id,
      secret_encrypted: encryptedSecret,
      enabled: false,
      verified_at: null,
      created_at: new Date().toISOString(),
    });

    if (storeError) {
      console.error("Failed to store TOTP secret:", storeError);
      return new Response(JSON.stringify({ error: "Failed to setup TOTP" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        otpauth_url: otpauthUrl,
        secret_masked: secret.base32.substring(0, 4) + "****",
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
