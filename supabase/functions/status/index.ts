import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface HealthStatus {
  ok: boolean;
  timestamp: string;
  version: string;
  environment: string;
  commit: string | null;
  uptime: number;
  database: {
    connected: boolean;
    latency: number;
    tables: {
      funds: number;
      investors: number;
      transactions: number;
      daily_nav: number;
    };
  };
  services: {
    auth: boolean;
    storage: boolean;
    functions: boolean;
  };
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalAUM: number;
    dailyTransactions: number;
  };
}

const startTime = Date.now();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const status: HealthStatus = {
    ok: true,
    timestamp: new Date().toISOString(),
    version: Deno.env.get("APP_VERSION") || "1.0.0",
    environment: Deno.env.get("APP_ENV") || "production",
    commit: Deno.env.get("GIT_COMMIT_SHA") || null,
    uptime: Date.now() - startTime,
    database: {
      connected: false,
      latency: 0,
      tables: {
        funds: 0,
        investors: 0,
        transactions: 0,
        daily_nav: 0,
      },
    },
    services: {
      auth: false,
      storage: false,
      functions: true, // We're running, so functions work
    },
    metrics: {
      totalUsers: 0,
      activeUsers: 0,
      totalAUM: 0,
      dailyTransactions: 0,
    },
  };

  try {
    // Test database connectivity and measure latency
    const dbStart = Date.now();

    // Check funds table
    const { count: fundsCount, error: fundsError } = await supabase
      .from("funds")
      .select("*", { count: "exact", head: true });

    if (!fundsError) {
      status.database.connected = true;
      status.database.tables.funds = fundsCount || 0;
    }

    // Check investors table
    const { count: investorsCount } = await supabase
      .from("investors")
      .select("*", { count: "exact", head: true });
    status.database.tables.investors = investorsCount || 0;

    // Check transactions table
    const { count: transactionsCount } = await supabase
      .from("transactions_v2")
      .select("*", { count: "exact", head: true });
    status.database.tables.transactions = transactionsCount || 0;

    // Check daily_nav table
    const { count: navCount } = await supabase
      .from("daily_nav")
      .select("*", { count: "exact", head: true });
    status.database.tables.daily_nav = navCount || 0;

    status.database.latency = Date.now() - dbStart;

    // Check auth service
    try {
      const { error: authError } = await supabase.auth.getSession();
      status.services.auth = !authError;
    } catch {
      status.services.auth = false;
    }

    // Check storage service
    try {
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      status.services.storage = !storageError && buckets !== null;
    } catch {
      status.services.storage = false;
    }

    // Get metrics
    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    status.metrics.totalUsers = totalUsers || 0;

    // Active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", thirtyDaysAgo.toISOString());
    status.metrics.activeUsers = activeUsers || 0;

    // Total AUM (sum of latest NAV for all funds)
    const { data: latestNavs } = await supabase
      .from("daily_nav")
      .select("fund_id, aum, nav_date")
      .order("nav_date", { ascending: false });

    if (latestNavs) {
      // Get latest NAV for each fund
      const fundLatestNavs = new Map<string, number>();
      for (const nav of latestNavs) {
        if (!fundLatestNavs.has(nav.fund_id)) {
          fundLatestNavs.set(nav.fund_id, Number(nav.aum));
        }
      }
      status.metrics.totalAUM = Array.from(fundLatestNavs.values()).reduce(
        (sum, aum) => sum + aum,
        0
      );
    }

    // Daily transactions (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count: dailyTx } = await supabase
      .from("transactions_v2")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo.toISOString());
    status.metrics.dailyTransactions = dailyTx || 0;

    // Determine overall health
    status.ok =
      status.database.connected &&
      status.services.auth &&
      status.services.functions &&
      status.database.latency < 5000; // Less than 5 seconds
  } catch (error) {
    console.error("Health check error:", error);
    status.ok = false;
  }

  // Return appropriate status code based on health
  const statusCode = status.ok ? 200 : 503;

  return new Response(JSON.stringify(status, null, 2), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
