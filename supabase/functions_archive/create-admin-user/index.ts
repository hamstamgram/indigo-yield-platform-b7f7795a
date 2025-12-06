import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_v2").single();

    if (!isAdmin) {
      throw new Error("Only admins can create admin users");
    }

    const { email, password, firstName, lastName } = await req.json();

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || "",
        last_name: lastName || "",
      },
    });

    if (createError) {
      throw createError;
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: newUser.user.id,
      email: email,
      first_name: firstName || "",
      last_name: lastName || "",
      is_admin: true,
      user_type: "admin",
      status: "Active",
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Continue anyway - profile might be auto-created by trigger
    }

    // Add to admin_users table
    const { error: adminError } = await supabaseAdmin.from("admin_users").insert({
      user_id: newUser.user.id,
      granted_by: user.id,
      granted_at: new Date().toISOString(),
    });

    if (adminError) {
      throw adminError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: email,
        message: "Admin user created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating admin user:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
