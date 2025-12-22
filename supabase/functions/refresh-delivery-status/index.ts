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
    const MAILERSEND_API_TOKEN = Deno.env.get("MAILERSEND_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!MAILERSEND_API_TOKEN) {
      throw new Error("MAILERSEND_API_TOKEN not configured");
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
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
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No provider message ID - email may not have been sent yet" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query MailerSend for message activity
    console.log(`Fetching status for message: ${delivery.provider_message_id}`);
    
    const mailersendResponse = await fetch(
      `https://api.mailersend.com/v1/activity/${delivery.provider_message_id}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${MAILERSEND_API_TOKEN}`,
        },
      }
    );

    if (!mailersendResponse.ok) {
      const errorText = await mailersendResponse.text();
      console.error("MailerSend API error:", errorText);
      
      // If 404, message might be too old or not found
      if (mailersendResponse.status === 404) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Message not found in MailerSend - may be too old or invalid ID" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`MailerSend API error: ${mailersendResponse.status}`);
    }

    const activityData = await mailersendResponse.json();
    console.log("MailerSend activity:", JSON.stringify(activityData));

    // Parse the activity to determine current status
    let newStatus = delivery.status;
    let deliveredAt = null;
    let failedAt = null;
    let errorMessage = null;

    // MailerSend activity structure
    const events = activityData.data?.events || [];
    
    for (const event of events) {
      const eventType = event.type?.toLowerCase();
      const timestamp = event.created_at;

      if (eventType === "delivered") {
        newStatus = "DELIVERED";
        deliveredAt = timestamp;
      } else if (eventType === "soft_bounced" || eventType === "hard_bounced") {
        newStatus = "BOUNCED";
        failedAt = timestamp;
        errorMessage = event.reason || "Email bounced";
      } else if (eventType === "spam_complaint") {
        newStatus = "COMPLAINED";
        errorMessage = "Recipient marked as spam";
      } else if (eventType === "opened") {
        // Don't change status for opens, but we could track it
      } else if (eventType === "clicked") {
        // Don't change status for clicks
      }
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
      await supabase
        .from("report_delivery_events")
        .insert({
          delivery_id,
          provider_message_id: delivery.provider_message_id,
          event_type: "status_refreshed",
          event_data: {
            old_status: delivery.status,
            new_status: newStatus,
            refreshed_by: user.id,
            activity_data: activityData,
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
        events_found: events.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in refresh-delivery-status:", errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
