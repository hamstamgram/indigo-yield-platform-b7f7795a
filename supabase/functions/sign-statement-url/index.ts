import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Parse request body
    const { statementId } = await req.json();
    
    if (!statementId) {
      throw new Error("Statement ID is required");
    }

    // Verify user has access to this statement
    const { data: statement, error: statementError } = await supabase
      .from("statements")
      .select("*")
      .eq("id", statementId)
      .eq("investor_id", user.id)
      .single();

    if (statementError || !statement) {
      throw new Error("Statement not found or access denied");
    }

    // Generate signed URL (expires in 1 hour)
    const filePath = statement.file_path || `statements/${user.id}/${statementId}.pdf`;
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError || !signedUrl) {
      throw new Error("Failed to generate signed URL");
    }

    // Log access for audit
    await supabase
      .from("document_access_log")
      .insert({
        user_id: user.id,
        document_type: "statement",
        document_id: statementId,
        access_type: "signed_url_generated",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
        created_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: signedUrl.signedUrl,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          statementId: statementId,
          fileName: statement.file_name || `statement_${statement.period}.pdf`
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Sign statement URL error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: error.message.includes("access denied") ? 403 : 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
