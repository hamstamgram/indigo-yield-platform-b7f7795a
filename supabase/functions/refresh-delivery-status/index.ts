import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefreshRequest {
  delivery_id: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use shared admin check
    const adminCheck = await checkAdminAccess(supabase, user.id);
    if (!adminCheck.isAdmin) {
      return createAdminDeniedResponse(corsHeaders, adminCheck.error);
    }

    const body: RefreshRequest = await req.json();
    const { delivery_id } = body;

    if (!delivery_id) {
      throw new Error("delivery_id required");
    }

    // Fetch delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from("statement_email_delivery")
      .select("id, provider_message_id, status")
      .eq("id", delivery_id)
      .single();

    if (deliveryError || !delivery) {
      throw new Error(`Delivery not found: ${deliveryError?.message}`);
    }

    if (!delivery.provider_message_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No provider message ID - email may not have been sent yet",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query Resend for message activity
    console.log(`Fetching status for message: ${delivery.provider_message_id}`);

    const resendResponse = await fetch(
      `https://api.resend.com/emails/${delivery.provider_message_id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
      }
    );

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);

      if (resendResponse.status === 404) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Message not found in Resend - may be too old or invalid ID",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Resend API error: ${resendResponse.status}`);
    }

    const activityData = await resendResponse.json();
    console.log("Resend activity:", JSON.stringify(activityData));

    let newStatus = delivery.status;
    let deliveredAt = null;
    let failedAt = null;
    let errorMessage = null;

    const resendStatus = String(activityData?.status || "").toLowerCase();
    const lastEvent = String(activityData?.last_event || "").toLowerCase();
    const effectiveStatus = lastEvent || resendStatus;

    if (effectiveStatus === "delivered") {
      newStatus = "DELIVERED";
      deliveredAt = activityData?.delivered_at || new Date().toISOString();
    } else if (effectiveStatus === "bounced") {
      newStatus = "BOUNCED";
      failedAt = activityData?.bounced_at || new Date().toISOString();
      errorMessage = activityData?.error || "Email bounced";
    } else if (effectiveStatus === "complained") {
      newStatus = "COMPLAINED";
      failedAt = activityData?.complained_at || new Date().toISOString();
      errorMessage = "Recipient marked as spam";
    } else if (effectiveStatus === "failed") {
      newStatus = "FAILED";
      failedAt = activityData?.failed_at || new Date().toISOString();
      errorMessage = activityData?.error || "Delivery failed";
    }

    // Update delivery record if status changed
    if (newStatus !== delivery.status) {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (deliveredAt) updateData.delivered_at = deliveredAt;
      if (failedAt) updateData.failed_at = failedAt;
      if (errorMessage) updateData.error_message = errorMessage;

      const { error: updateError } = await supabase
        .from("statement_email_delivery")
        .update(updateData)
        .eq("id", delivery_id);

      if (updateError) {
        console.error("Failed to update delivery:", updateError);
      }

      // Log the status change
      await supabase.from("report_delivery_events").insert({
        delivery_id,
        provider_message_id: delivery.provider_message_id,
        event_type: "status_refreshed",
        event_data: {
          old_status: delivery.status,
          new_status: newStatus,
          refreshed_by: user.id,
          activity_data: activityData,
          provider: "resend",
        },
        occurred_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        old_status: delivery.status,
        new_status: newStatus,
        status_changed: newStatus !== delivery.status,
        events_found: activityData ? 1 : 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in refresh-delivery-status:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
