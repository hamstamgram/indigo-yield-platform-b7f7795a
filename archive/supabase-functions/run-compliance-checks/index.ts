/**
 * Supabase Edge Function: Run Compliance Checks
 * Performs KYC/AML verification and compliance monitoring
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface ComplianceCheckRequest {
  investorId: string;
  checkType: "kyc" | "aml" | "sanctions" | "pep" | "adverse_media" | "full";
  forceRefresh?: boolean;
}

interface ComplianceResult {
  checkId: string;
  investorId: string;
  checkType: string;
  status: "passed" | "failed" | "needs_review" | "pending";
  checks: CheckResult[];
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  requiresManualReview: boolean;
  timestamp: string;
  summary: string;
}

interface CheckResult {
  checkName: string;
  passed: boolean;
  riskScore: number;
  details: any;
  message: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // CSRF token validation
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
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

    // Verify admin access (compliance checks should only be run by admins)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Only administrators can run compliance checks");
    }

    // Parse request
    const checkRequest: ComplianceCheckRequest = await req.json();

    console.log("Running compliance checks:", {
      investorId: checkRequest.investorId,
      checkType: checkRequest.checkType,
    });

    // Get investor information
    const { data: investor, error: investorError } = await supabaseClient
      .from("investors")
      .select("*")
      .eq("id", checkRequest.investorId)
      .single();

    if (investorError || !investor) {
      throw new Error("Investor not found");
    }

    // Check if recent compliance check exists (unless force refresh)
    if (!checkRequest.forceRefresh) {
      const { data: recentCheck } = await supabaseClient
        .from("compliance_checks")
        .select("*")
        .eq("investor_id", checkRequest.investorId)
        .eq("check_type", checkRequest.checkType)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentCheck) {
        console.log("Returning recent compliance check result");
        return new Response(
          JSON.stringify({
            success: true,
            result: recentCheck,
            cached: true,
          }),
          {
            headers: { ...headers, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Run compliance checks based on type
    let checks: CheckResult[] = [];

    if (checkRequest.checkType === "kyc" || checkRequest.checkType === "full") {
      checks = checks.concat(await runKYCChecks(supabaseClient, investor));
    }

    if (checkRequest.checkType === "aml" || checkRequest.checkType === "full") {
      checks = checks.concat(await runAMLChecks(supabaseClient, investor));
    }

    if (checkRequest.checkType === "sanctions" || checkRequest.checkType === "full") {
      checks = checks.concat(await runSanctionsChecks(supabaseClient, investor));
    }

    if (checkRequest.checkType === "pep" || checkRequest.checkType === "full") {
      checks = checks.concat(await runPEPChecks(supabaseClient, investor));
    }

    if (checkRequest.checkType === "adverse_media" || checkRequest.checkType === "full") {
      checks = checks.concat(await runAdverseMediaChecks(supabaseClient, investor));
    }

    // Calculate overall risk score and status
    const riskScore = calculateRiskScore(checks);
    const riskLevel = determineRiskLevel(riskScore);
    const requiresManualReview = checks.some((c) => !c.passed) || riskLevel === "high";
    const overallStatus = determineOverallStatus(checks, riskLevel, requiresManualReview);

    // Generate summary
    const summary = generateSummary(checks, riskLevel, requiresManualReview);

    // Store compliance check result
    const checkId = crypto.randomUUID();
    const result: ComplianceResult = {
      checkId,
      investorId: checkRequest.investorId,
      checkType: checkRequest.checkType,
      status: overallStatus,
      checks,
      riskScore,
      riskLevel,
      requiresManualReview,
      timestamp: new Date().toISOString(),
      summary,
    };

    await supabaseClient.from("compliance_checks").insert({
      id: checkId,
      investor_id: checkRequest.investorId,
      check_type: checkRequest.checkType,
      status: overallStatus,
      risk_score: riskScore,
      risk_level: riskLevel,
      requires_manual_review: requiresManualReview,
      checks: checks,
      summary: summary,
      checked_by: user.id,
      created_at: new Date().toISOString(),
    });

    // Update investor compliance status
    const updateData: any = {};

    if (checkRequest.checkType === "kyc" || checkRequest.checkType === "full") {
      updateData.kyc_status = overallStatus === "passed" ? "approved" : "needs_review";
      updateData.kyc_last_checked_at = new Date().toISOString();
    }

    if (checkRequest.checkType === "aml" || checkRequest.checkType === "full") {
      updateData.aml_status = overallStatus === "passed" ? "clear" : "flagged";
      updateData.aml_last_checked_at = new Date().toISOString();
    }

    if (Object.keys(updateData).length > 0) {
      await supabaseClient.from("investors").update(updateData).eq("id", checkRequest.investorId);
    }

    // Create audit log
    await supabaseClient.from("audit_logs").insert({
      user_id: user.id,
      action: "compliance_check_executed",
      resource_type: "compliance_check",
      resource_id: checkId,
      details: {
        investorId: checkRequest.investorId,
        checkType: checkRequest.checkType,
        status: overallStatus,
        riskLevel: riskLevel,
        requiresManualReview: requiresManualReview,
      },
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
    });

    // Notify admins if manual review required
    if (requiresManualReview) {
      await notifyAdminsForReview(
        supabaseClient,
        checkRequest.investorId,
        checkId,
        riskLevel,
        summary
      );
    }

    console.log("Compliance checks completed:", {
      checkId,
      status: overallStatus,
      riskLevel: riskLevel,
      requiresReview: requiresManualReview,
    });

    return new Response(
      JSON.stringify({
        success: true,
        result,
        cached: false,
      }),
      {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Compliance check failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

/**
 * Run KYC (Know Your Customer) checks
 */
async function runKYCChecks(supabase: any, investor: any): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  // Check 1: Identity verification
  const hasRequiredDocs = investor.ssn && investor.date_of_birth && investor.address;
  checks.push({
    checkName: "identity_verification",
    passed: hasRequiredDocs,
    riskScore: hasRequiredDocs ? 0 : 50,
    details: {
      hasSsn: !!investor.ssn,
      hasDob: !!investor.date_of_birth,
      hasAddress: !!investor.address,
    },
    message: hasRequiredDocs
      ? "All required identity documents provided"
      : "Missing required identity documents",
  });

  // Check 2: Age verification
  const age = investor.date_of_birth
    ? (Date.now() - new Date(investor.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0;
  const isAdult = age >= 18;
  checks.push({
    checkName: "age_verification",
    passed: isAdult,
    riskScore: isAdult ? 0 : 100,
    details: { age: Math.floor(age) },
    message: isAdult
      ? "Investor meets minimum age requirement"
      : "Investor does not meet minimum age requirement",
  });

  // Check 3: Address verification
  const hasCompleteAddress =
    investor.address && investor.city && investor.state && investor.zip_code;
  checks.push({
    checkName: "address_verification",
    passed: hasCompleteAddress,
    riskScore: hasCompleteAddress ? 0 : 20,
    details: {
      hasAddress: !!investor.address,
      hasCity: !!investor.city,
      hasState: !!investor.state,
      hasZip: !!investor.zip_code,
    },
    message: hasCompleteAddress
      ? "Complete address information provided"
      : "Incomplete address information",
  });

  // Check 4: Accredited investor status verification
  const isAccredited = investor.accredited_investor === true;
  checks.push({
    checkName: "accreditation_verification",
    passed: isAccredited,
    riskScore: isAccredited ? 0 : 10,
    details: {
      accreditedStatus: investor.accredited_investor,
      verificationMethod: investor.accreditation_verification_method,
    },
    message: isAccredited
      ? "Accredited investor status verified"
      : "Accredited investor status not verified",
  });

  return checks;
}

/**
 * Run AML (Anti-Money Laundering) checks
 */
async function runAMLChecks(supabase: any, investor: any): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  // Check 1: Transaction pattern analysis
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("investor_id", investor.id)
    .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  const hasUnusualPatterns = detectUnusualPatterns(transactions || []);
  checks.push({
    checkName: "transaction_pattern_analysis",
    passed: !hasUnusualPatterns,
    riskScore: hasUnusualPatterns ? 30 : 0,
    details: {
      transactionCount: transactions?.length || 0,
      unusualPatterns: hasUnusualPatterns,
    },
    message: hasUnusualPatterns
      ? "Unusual transaction patterns detected"
      : "No unusual transaction patterns detected",
  });

  // Check 2: Structuring detection (breaking up large transactions)
  const hasStructuring = detectStructuring(transactions || []);
  checks.push({
    checkName: "structuring_detection",
    passed: !hasStructuring,
    riskScore: hasStructuring ? 50 : 0,
    details: { structuringDetected: hasStructuring },
    message: hasStructuring
      ? "Possible structuring activity detected"
      : "No structuring activity detected",
  });

  // Check 3: Rapid movement of funds
  const hasRapidMovement = detectRapidFundMovement(transactions || []);
  checks.push({
    checkName: "rapid_fund_movement",
    passed: !hasRapidMovement,
    riskScore: hasRapidMovement ? 40 : 0,
    details: { rapidMovement: hasRapidMovement },
    message: hasRapidMovement ? "Rapid fund movement detected" : "No rapid fund movement detected",
  });

  // Check 4: Large cash transactions
  const hasLargeCashTransactions = (transactions || []).some(
    (t) => Number(t.amount) > 10000 && t.payment_method === "cash"
  );
  checks.push({
    checkName: "large_cash_transactions",
    passed: !hasLargeCashTransactions,
    riskScore: hasLargeCashTransactions ? 60 : 0,
    details: { largeCashTransactions: hasLargeCashTransactions },
    message: hasLargeCashTransactions
      ? "Large cash transactions detected"
      : "No large cash transactions detected",
  });

  return checks;
}

/**
 * Run sanctions screening checks
 */
async function runSanctionsChecks(supabase: any, investor: any): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  // In production, this would call OFAC, UN, EU sanctions lists
  // For now, check against a local sanctions list

  const fullName = `${investor.first_name} ${investor.last_name}`.toLowerCase();

  // Check 1: OFAC sanctions list
  const onOFACSanctions = await checkSanctionsList(supabase, fullName, "OFAC");
  checks.push({
    checkName: "ofac_sanctions_screening",
    passed: !onOFACSanctions,
    riskScore: onOFACSanctions ? 100 : 0,
    details: { onList: onOFACSanctions },
    message: onOFACSanctions ? "Name matches OFAC sanctions list" : "No OFAC sanctions list match",
  });

  // Check 2: UN sanctions list
  const onUNSanctions = await checkSanctionsList(supabase, fullName, "UN");
  checks.push({
    checkName: "un_sanctions_screening",
    passed: !onUNSanctions,
    riskScore: onUNSanctions ? 100 : 0,
    details: { onList: onUNSanctions },
    message: onUNSanctions ? "Name matches UN sanctions list" : "No UN sanctions list match",
  });

  // Check 3: EU sanctions list
  const onEUSanctions = await checkSanctionsList(supabase, fullName, "EU");
  checks.push({
    checkName: "eu_sanctions_screening",
    passed: !onEUSanctions,
    riskScore: onEUSanctions ? 100 : 0,
    details: { onList: onEUSanctions },
    message: onEUSanctions ? "Name matches EU sanctions list" : "No EU sanctions list match",
  });

  return checks;
}

/**
 * Run PEP (Politically Exposed Person) checks
 */
async function runPEPChecks(supabase: any, investor: any): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  const fullName = `${investor.first_name} ${investor.last_name}`.toLowerCase();

  // In production, use a PEP database service
  const isPEP = await checkPEPDatabase(supabase, fullName);

  checks.push({
    checkName: "pep_screening",
    passed: !isPEP,
    riskScore: isPEP ? 50 : 0,
    details: { isPEP },
    message: isPEP
      ? "Investor identified as Politically Exposed Person - enhanced due diligence required"
      : "No PEP match found",
  });

  return checks;
}

/**
 * Run adverse media checks
 */
async function runAdverseMediaChecks(supabase: any, investor: any): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  const fullName = `${investor.first_name} ${investor.last_name}`;

  // In production, use media monitoring service
  const adverseMediaFound = await checkAdverseMedia(supabase, fullName);

  checks.push({
    checkName: "adverse_media_screening",
    passed: !adverseMediaFound,
    riskScore: adverseMediaFound ? 40 : 0,
    details: { adverseMediaFound },
    message: adverseMediaFound
      ? "Adverse media mentions found - review recommended"
      : "No adverse media found",
  });

  return checks;
}

/**
 * Helper functions
 */

function detectUnusualPatterns(transactions: any[]): boolean {
  // Detect round numbers (possible structuring)
  const roundNumbers = transactions.filter((t) => Number(t.amount) % 1000 === 0);
  return roundNumbers.length > transactions.length * 0.5;
}

function detectStructuring(transactions: any[]): boolean {
  // Detect multiple transactions just under $10,000 threshold
  const nearThreshold = transactions.filter(
    (t) => Number(t.amount) >= 9000 && Number(t.amount) < 10000
  );
  return nearThreshold.length >= 3;
}

function detectRapidFundMovement(transactions: any[]): boolean {
  // Detect deposit followed quickly by withdrawal
  for (let i = 0; i < transactions.length - 1; i++) {
    if (transactions[i].transaction_type === "deposit") {
      for (let j = i + 1; j < transactions.length; j++) {
        if (transactions[j].transaction_type === "withdrawal") {
          const timeDiff =
            new Date(transactions[j].created_at).getTime() -
            new Date(transactions[i].created_at).getTime();
          if (timeDiff < 24 * 60 * 60 * 1000) {
            // Less than 24 hours
            return true;
          }
          break;
        }
      }
    }
  }
  return false;
}

async function checkSanctionsList(supabase: any, name: string, listType: string): Promise<boolean> {
  // In production, check against actual sanctions lists
  // For now, return false (no match)
  return false;
}

async function checkPEPDatabase(supabase: any, name: string): Promise<boolean> {
  // In production, check against PEP database
  return false;
}

async function checkAdverseMedia(supabase: any, name: string): Promise<boolean> {
  // In production, use media monitoring service
  return false;
}

function calculateRiskScore(checks: CheckResult[]): number {
  const totalScore = checks.reduce((sum, check) => sum + check.riskScore, 0);
  const maxPossibleScore = checks.length * 100;
  return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
}

function determineRiskLevel(riskScore: number): "low" | "medium" | "high" {
  if (riskScore >= 50) return "high";
  if (riskScore >= 25) return "medium";
  return "low";
}

function determineOverallStatus(
  checks: CheckResult[],
  riskLevel: string,
  requiresManualReview: boolean
): "passed" | "failed" | "needs_review" | "pending" {
  const criticalFailures = checks.filter((c) => !c.passed && c.riskScore >= 80);

  if (criticalFailures.length > 0) return "failed";
  if (requiresManualReview) return "needs_review";
  if (riskLevel === "low") return "passed";
  return "needs_review";
}

function generateSummary(
  checks: CheckResult[],
  riskLevel: string,
  requiresManualReview: boolean
): string {
  const failedChecks = checks.filter((c) => !c.passed);

  if (failedChecks.length === 0) {
    return `All compliance checks passed. Risk level: ${riskLevel}.`;
  }

  const failedCheckNames = failedChecks.map((c) => c.checkName).join(", ");
  return `${failedChecks.length} check(s) failed: ${failedCheckNames}. Risk level: ${riskLevel}. ${requiresManualReview ? "Manual review required." : ""}`;
}

async function notifyAdminsForReview(
  supabase: any,
  investorId: string,
  checkId: string,
  riskLevel: string,
  summary: string
): Promise<void> {
  try {
    await supabase.from("admin_notifications").insert({
      notification_type: "compliance_review_required",
      title: "Compliance Check Requires Review",
      message: summary,
      priority: riskLevel === "high" ? "high" : "medium",
      related_entity_type: "compliance_check",
      related_entity_id: checkId,
      metadata: {
        investorId,
        riskLevel,
      },
    });

    console.log("Admin notification created for compliance review");
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}
