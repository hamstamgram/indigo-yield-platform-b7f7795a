import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { setPasswordRequestSchema, parseAndValidate } from "../_shared/validation.ts";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // CRITICAL: Verify authentication - only admins can set passwords
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the user making the request is authenticated and is an admin
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if user is admin via user_roles table (secure method)
    const adminCheck = await checkAdminAccess(supabaseAdmin, user.id);
    if (!adminCheck.isAdmin) {
      return createAdminDeniedResponse(corsHeaders);
    }

    // Validate request body
    const validation = await parseAndValidate(req, setPasswordRequestSchema, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }

    const { email, password } = validation.data;

    // Find existing user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const existingUser = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      // Update existing user's password
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: password,
        email_confirm: true,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Audit log: password reset
      await supabaseAdmin.from("audit_log").insert({
        action: "PASSWORD_RESET",
        entity: "auth_user",
        entity_id: String(existingUser.id),
        actor_user: user.id,
        meta: { target_email: email },
      });

      return new Response(
        JSON.stringify({
          message: "Password updated successfully",
          user_id: data.user?.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Create new user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Audit log: user creation
      await supabaseAdmin.from("audit_log").insert({
        action: "USER_CREATED",
        entity: "auth_user",
        entity_id: String(data.user?.id),
        actor_user: user.id,
        meta: { target_email: email },
      });

      return new Response(
        JSON.stringify({
          message: "User created successfully",
          user_id: data.user?.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
