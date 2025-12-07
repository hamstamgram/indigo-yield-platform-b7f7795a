import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const AIRTABLE_API_KEY = Deno.env.get("AIRTABLE_API_KEY");
    const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID");
    const AIRTABLE_TABLE_NAME = Deno.env.get("AIRTABLE_TABLE_NAME") || "Investor Onboarding";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      throw new Error("Missing Airtable configuration in Supabase Secrets");
    }

    // 1. Fetch from Airtable
    // Filter: Status = 'Pending' AND Created Investor ID is empty
    const filterFormula = "AND({Status} = 'Pending', {Created Investor ID} = '')";
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    console.log(`Fetching from Airtable: ${AIRTABLE_TABLE_NAME}`);

    const airtableRes = await fetch(airtableUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!airtableRes.ok) {
      const err = await airtableRes.text();
      throw new Error(`Airtable API Error: ${err}`);
    }

    const airtableData = await airtableRes.json();
    const records = airtableData.records || [];
    console.log(`Found ${records.length} pending records`);

    // 2. Sync to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let syncedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      const fields = record.fields;
      const email = fields["Email"];

      if (!email) continue;

      // Check if exists
      const { data: existing } = await supabase
        .from("onboarding_submissions")
        .select("id")
        .eq("airtable_record_id", record.id)
        .maybeSingle();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Parse additional emails
      let additionalEmails: string[] = [];
      if (fields["Additional Emails"]) {
        additionalEmails = fields["Additional Emails"].split(",").map((e: string) => e.trim());
      }

      // Insert
      const { error: insertError } = await supabase.from("onboarding_submissions").insert({
        airtable_record_id: record.id,
        full_name: fields["Full Name"],
        email: email,
        phone: fields["Phone"],
        company_name: fields["Company Name"],
        additional_emails: additionalEmails,
        status: "pending",
        submitted_at: record.createdTime,
        raw_data: record,
      });

      if (insertError) {
        console.error(`Failed to insert ${record.id}:`, insertError);
      } else {
        syncedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} records`,
        recordsSynced: syncedCount,
        recordsSkipped: skippedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
