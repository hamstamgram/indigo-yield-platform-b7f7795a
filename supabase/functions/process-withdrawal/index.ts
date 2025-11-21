/**
 * Supabase Edge Function: Process Withdrawal
 * Handles withdrawal requests with compliance checks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Secure CORS configuration
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface WithdrawalRequest {
  investorId: string;
  amount: number;
  currency: string;
  withdrawalMethod: "bank_transfer" | "crypto" | "wire";
  cryptoAssetId?: string;
  cryptoAddress?: string;
  bankAccountId?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

interface ComplianceCheck {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
  }[];
  requiresManualReview: boolean;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ success: false, error: "Invalid CSRF token" }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 403,
      });
    }
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request
    const withdrawalRequest: WithdrawalRequest = await req.json();

    console.log("Processing withdrawal:", {
      investorId: withdrawalRequest.investorId,
      amount: withdrawalRequest.amount,
      currency: withdrawalRequest.currency,
      method: withdrawalRequest.withdrawalMethod,
    });

    // Verify investor ownership
    if (withdrawalRequest.investorId !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        throw new Error("Unauthorized to process withdrawal for this investor");
      }
    }

    // Validate withdrawal amount
    if (withdrawalRequest.amount <= 0) {
      throw new Error("Withdrawal amount must be greater than zero");
    }

    // Verify investor account is active
    const { data: investor } = await supabaseClient
      .from("investors")
      .select("id, kyc_status, account_status, total_balance, aml_status")
      .eq("id", withdrawalRequest.investorId)
      .single();

    if (!investor) {
      throw new Error("Investor account not found");
    }

    if (investor.account_status !== "active") {
      throw new Error("Investor account is not active");
    }

    if (investor.kyc_status !== "approved") {
      throw new Error("KYC verification must be completed before making withdrawals");
    }

    // Check sufficient balance
    const availableBalance = investor.total_balance || 0;
    if (withdrawalRequest.amount > availableBalance) {
      throw new Error(
        `Insufficient balance. Available: $${availableBalance.toLocaleString()}, ` +
          `Requested: $${withdrawalRequest.amount.toLocaleString()}`
      );
    }

    // Run compliance checks
    const complianceResult = await runComplianceChecks(
      supabaseClient,
      withdrawalRequest.investorId,
      withdrawalRequest.amount,
      withdrawalRequest.withdrawalMethod
    );

    if (!complianceResult.passed) {
      const failedChecks = complianceResult.checks
        .filter((c) => !c.passed)
        .map((c) => c.name)
        .join(", ");

      throw new Error(`Compliance checks failed: ${failedChecks}`);
    }

    // Create withdrawal transaction record
    const withdrawalId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Determine initial status based on compliance review
    const initialStatus = complianceResult.requiresManualReview ? "pending_review" : "pending";

    const { error: insertError } = await supabaseClient.from("transactions").insert({
      id: withdrawalId,
      investor_id: withdrawalRequest.investorId,
      transaction_type: "withdrawal",
      amount: withdrawalRequest.amount,
      currency: withdrawalRequest.currency,
      status: initialStatus,
      payment_method: withdrawalRequest.withdrawalMethod,
      created_at: now,
      created_by: user.id,
      metadata: {
        ...withdrawalRequest.metadata,
        reason: withdrawalRequest.reason,
        complianceChecks: complianceResult.checks,
        requiresManualReview: complianceResult.requiresManualReview,
      },
    });

    if (insertError) {
      throw new Error(`Failed to create withdrawal record: ${insertError.message}`);
    }

    // Store crypto withdrawal details if applicable
    if (withdrawalRequest.withdrawalMethod === "crypto" && withdrawalRequest.cryptoAddress) {
      await supabaseClient.from("crypto_withdrawals").insert({
        id: crypto.randomUUID(),
        transaction_id: withdrawalId,
        crypto_asset_id: withdrawalRequest.cryptoAssetId,
        destination_address: withdrawalRequest.cryptoAddress,
        amount_usd: withdrawalRequest.amount,
        status: "pending",
      });
    }

    // Store bank withdrawal details if applicable
    if (withdrawalRequest.withdrawalMethod === "bank_transfer" && withdrawalRequest.bankAccountId) {
      // Verify bank account belongs to investor
      const { data: bankAccount } = await supabaseClient
        .from("bank_accounts")
        .select("id, account_number, routing_number, bank_name")
        .eq("id", withdrawalRequest.bankAccountId)
        .eq("investor_id", withdrawalRequest.investorId)
        .single();

      if (!bankAccount) {
        throw new Error("Bank account not found or does not belong to investor");
      }

      await supabaseClient.from("bank_withdrawals").insert({
        id: crypto.randomUUID(),
        transaction_id: withdrawalId,
        bank_account_id: withdrawalRequest.bankAccountId,
        amount: withdrawalRequest.amount,
        status: "pending",
      });
    }

    // Create audit log
    await supabaseClient.from("audit_logs").insert({
      user_id: user.id,
      action: "withdrawal_initiated",
      resource_type: "transaction",
      resource_id: withdrawalId,
      details: {
        amount: withdrawalRequest.amount,
        currency: withdrawalRequest.currency,
        withdrawalMethod: withdrawalRequest.withdrawalMethod,
        requiresManualReview: complianceResult.requiresManualReview,
      },
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
    });

    // Send notification email
    if (Deno.env.get("ENABLE_EMAIL_NOTIFICATIONS") === "true") {
      await sendWithdrawalNotificationEmail(
        supabaseClient,
        withdrawalRequest.investorId,
        withdrawalId,
        withdrawalRequest.amount,
        initialStatus
      );
    }

    // Notify admins if manual review required
    if (complianceResult.requiresManualReview) {
      await notifyAdminsForReview(
        supabaseClient,
        withdrawalId,
        withdrawalRequest.investorId,
        withdrawalRequest.amount,
        complianceResult
      );
    }

    const response = {
      success: true,
      withdrawalId,
      status: initialStatus,
      amount: withdrawalRequest.amount,
      currency: withdrawalRequest.currency,
      withdrawalMethod: withdrawalRequest.withdrawalMethod,
      requiresManualReview: complianceResult.requiresManualReview,
      message: complianceResult.requiresManualReview
        ? "Withdrawal request submitted for manual review"
        : "Withdrawal request created successfully",
      estimatedProcessingTime: complianceResult.requiresManualReview
        ? "1-3 business days"
        : "3-5 business days",
    };

    console.log("Withdrawal processed successfully:", {
      withdrawalId,
      amount: withdrawalRequest.amount,
      requiresReview: complianceResult.requiresManualReview,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Withdrawal processing failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

/**
 * Run compliance checks for withdrawal
 */
async function runComplianceChecks(
  supabase: any,
  investorId: string,
  amount: number,
  withdrawalMethod: string
): Promise<ComplianceCheck> {
  const checks: ComplianceCheck["checks"] = [];
  let requiresManualReview = false;

  // Check 1: Daily withdrawal limit
  const dailyLimit = 50000; // $50,000
  const { data: todayWithdrawals } = await supabase
    .from("transactions")
    .select("amount")
    .eq("investor_id", investorId)
    .eq("transaction_type", "withdrawal")
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const todayTotal = todayWithdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const wouldExceedDaily = todayTotal + amount > dailyLimit;

  checks.push({
    name: "daily_limit",
    passed: !wouldExceedDaily,
    message: wouldExceedDaily
      ? `Would exceed daily withdrawal limit of $${dailyLimit.toLocaleString()}`
      : "Within daily limit",
  });

  // Check 2: Monthly withdrawal limit
  const monthlyLimit = 200000; // $200,000
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const { data: monthWithdrawals } = await supabase
    .from("transactions")
    .select("amount")
    .eq("investor_id", investorId)
    .eq("transaction_type", "withdrawal")
    .gte("created_at", firstDayOfMonth.toISOString());

  const monthTotal = monthWithdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const wouldExceedMonthly = monthTotal + amount > monthlyLimit;

  checks.push({
    name: "monthly_limit",
    passed: !wouldExceedMonthly,
    message: wouldExceedMonthly
      ? `Would exceed monthly withdrawal limit of $${monthlyLimit.toLocaleString()}`
      : "Within monthly limit",
  });

  // Check 3: Large withdrawal threshold (requires manual review)
  const largeWithdrawalThreshold = 25000; // $25,000
  const isLargeWithdrawal = amount >= largeWithdrawalThreshold;

  if (isLargeWithdrawal) {
    requiresManualReview = true;
  }

  checks.push({
    name: "large_withdrawal_review",
    passed: true,
    message: isLargeWithdrawal
      ? `Withdrawal amount exceeds $${largeWithdrawalThreshold.toLocaleString()} - requires manual review`
      : "Below large withdrawal threshold",
  });

  // Check 4: AML status
  const { data: investor } = await supabase
    .from("investors")
    .select("aml_status, aml_last_checked_at")
    .eq("id", investorId)
    .single();

  const amlCheckValid =
    investor?.aml_status === "clear" &&
    investor?.aml_last_checked_at &&
    new Date(investor.aml_last_checked_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  checks.push({
    name: "aml_check",
    passed: amlCheckValid,
    message: amlCheckValid ? "AML status is clear and current" : "AML check required or outdated",
  });

  if (!amlCheckValid) {
    requiresManualReview = true;
  }

  // Check 5: Suspicious activity patterns
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("amount, transaction_type, created_at")
    .eq("investor_id", investorId)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });

  // Check for rapid deposit-withdrawal pattern
  const hasRapidDepositWithdrawal = recentTransactions?.some((t, i) => {
    if (t.transaction_type === "deposit" && i > 0) {
      const nextTx = recentTransactions[i - 1];
      if (nextTx.transaction_type === "withdrawal") {
        const timeDiff = new Date(nextTx.created_at).getTime() - new Date(t.created_at).getTime();
        return timeDiff < 24 * 60 * 60 * 1000; // Less than 24 hours
      }
    }
    return false;
  });

  if (hasRapidDepositWithdrawal) {
    requiresManualReview = true;
  }

  checks.push({
    name: "suspicious_activity",
    passed: true,
    message: hasRapidDepositWithdrawal
      ? "Rapid deposit-withdrawal pattern detected - requires review"
      : "No suspicious patterns detected",
  });

  // Check 6: Minimum holding period
  const { data: firstDeposit } = await supabase
    .from("transactions")
    .select("created_at")
    .eq("investor_id", investorId)
    .eq("transaction_type", "deposit")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const minimumHoldingDays = 7; // 7 days minimum
  const accountAge = firstDeposit
    ? (Date.now() - new Date(firstDeposit.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  const meetsHoldingPeriod = accountAge >= minimumHoldingDays;

  checks.push({
    name: "minimum_holding_period",
    passed: meetsHoldingPeriod,
    message: meetsHoldingPeriod
      ? "Meets minimum holding period"
      : `Account must have funds for at least ${minimumHoldingDays} days`,
  });

  // Determine overall pass/fail
  const allChecksPassed = checks.every((check) => check.passed);

  return {
    passed: allChecksPassed,
    checks,
    requiresManualReview,
  };
}

/**
 * Send withdrawal notification email
 */
async function sendWithdrawalNotificationEmail(
  supabase: any,
  investorId: string,
  withdrawalId: string,
  amount: number,
  status: string
): Promise<void> {
  try {
    // Get investor email
    const { data: investor } = await supabase
      .from("investors")
      .select("email, first_name")
      .eq("id", investorId)
      .single();

    if (!investor) {
      console.error("Investor not found for email notification");
      return;
    }

    // Log email intent
    await supabase.from("email_logs").insert({
      to: investor.email,
      subject: "Withdrawal Request Received",
      template: "withdrawal_initiated",
      status: "pending",
    });

    console.log("Withdrawal notification email queued for:", investor.email);
  } catch (error) {
    console.error("Failed to send withdrawal notification email:", error);
  }
}

/**
 * Notify admins for manual review
 */
async function notifyAdminsForReview(
  supabase: any,
  withdrawalId: string,
  investorId: string,
  amount: number,
  complianceResult: ComplianceCheck
): Promise<void> {
  try {
    // Get admin emails
    const { data: admins } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("role", "admin");

    if (!admins || admins.length === 0) {
      console.error("No admins found for notification");
      return;
    }

    // Create admin notification
    await supabase.from("admin_notifications").insert({
      notification_type: "withdrawal_review_required",
      title: "Withdrawal Requires Manual Review",
      message: `Withdrawal of $${amount.toLocaleString()} requires manual review`,
      priority: "high",
      related_entity_type: "transaction",
      related_entity_id: withdrawalId,
      metadata: {
        investorId,
        amount,
        complianceChecks: complianceResult.checks,
      },
    });

    console.log("Admin notification created for withdrawal review");
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}
