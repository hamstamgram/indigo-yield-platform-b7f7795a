/**
 * Database Data Audit Script
 *
 * Purpose: Examine actual database records to verify:
 * - Investor data integrity
 * - Asset positions
 * - Monthly reports data
 * - Data relationships
 *
 * Run: npx tsx scripts/audit-database-data.ts
 */

import { createClient } from "@supabase/supabase-js";

// Supabase configuration from .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nkfimvovosdehmyyjubn.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface DatabaseAudit {
  investors: {
    total: number;
    active: number;
    withEmail: number;
    withMultipleEmails: number;
    records: any[];
  };
  positions: {
    total: number;
    byAsset: Record<string, number>;
    totalValue: number;
    records: any[];
  };
  monthlyReports: {
    total: number;
    byMonth: Record<string, number>;
    byAsset: Record<string, number>;
    records: any[];
  };
  investorEmails: {
    total: number;
    primaryEmails: number;
    verifiedEmails: number;
    records: any[];
  };
  relationships: {
    investorsWithPositions: number;
    investorsWithReports: number;
    investorsWithEmails: number;
    orphanedPositions: number;
    orphanedReports: number;
  };
  dataIntegrity: {
    issues: string[];
    warnings: string[];
    recommendations: string[];
  };
}

async function auditInvestors(): Promise<DatabaseAudit["investors"]> {
  console.log("\n📊 Auditing Investors Table...");

  const { data: investors, error } = await supabase
    .from("investors")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching investors:", error);
    return { total: 0, active: 0, withEmail: 0, withMultipleEmails: 0, records: [] };
  }

  const investorsWithEmail = investors?.filter((i) => i.email && i.email !== "") || [];

  console.log(`  ✓ Total investors: ${investors?.length || 0}`);
  console.log(`  ✓ With email: ${investorsWithEmail.length}`);

  return {
    total: investors?.length || 0,
    active: investors?.filter((i) => i.status === "active").length || 0,
    withEmail: investorsWithEmail.length,
    withMultipleEmails: 0, // Will be calculated after checking investor_emails
    records: investors || [],
  };
}

async function auditPositions(): Promise<DatabaseAudit["positions"]> {
  console.log("\n💰 Auditing Positions Table...");

  const { data: positions, error } = await supabase.from("positions").select("*");

  if (error) {
    console.error("Error fetching positions:", error);
    return { total: 0, byAsset: {}, totalValue: 0, records: [] };
  }

  const byAsset: Record<string, number> = {};
  let totalValue = 0;

  positions?.forEach((pos) => {
    const asset = pos.asset_code || pos.asset_symbol || "UNKNOWN";
    byAsset[asset] = (byAsset[asset] || 0) + 1;
    totalValue += parseFloat(pos.current_balance || pos.balance || "0");
  });

  console.log(`  ✓ Total positions: ${positions?.length || 0}`);
  console.log(`  ✓ Total value: $${totalValue.toLocaleString()}`);
  console.log(`  ✓ By asset:`, byAsset);

  return {
    total: positions?.length || 0,
    byAsset,
    totalValue,
    records: positions || [],
  };
}

async function auditMonthlyReports(): Promise<DatabaseAudit["monthlyReports"]> {
  console.log("\n📈 Auditing Monthly Reports Table...");

  const { data: reports, error } = await supabase
    .from("investor_monthly_reports")
    .select("*")
    .order("report_month", { ascending: false });

  if (error) {
    console.error("Error fetching monthly reports:", error);
    return { total: 0, byMonth: {}, byAsset: {}, records: [] };
  }

  const byMonth: Record<string, number> = {};
  const byAsset: Record<string, number> = {};

  reports?.forEach((report) => {
    const month = report.report_month || "UNKNOWN";
    const asset = report.asset_code || "UNKNOWN";

    byMonth[month] = (byMonth[month] || 0) + 1;
    byAsset[asset] = (byAsset[asset] || 0) + 1;
  });

  console.log(`  ✓ Total reports: ${reports?.length || 0}`);
  console.log(`  ✓ Unique months:`, Object.keys(byMonth).length);
  console.log(`  ✓ By asset:`, byAsset);

  return {
    total: reports?.length || 0,
    byMonth,
    byAsset,
    records: reports || [],
  };
}

async function auditInvestorEmails(): Promise<DatabaseAudit["investorEmails"]> {
  console.log("\n📧 Auditing Investor Emails Table...");

  const { data: emails, error } = await supabase.from("investor_emails").select("*");

  if (error) {
    console.error("Error fetching investor emails:", error);
    return { total: 0, primaryEmails: 0, verifiedEmails: 0, records: [] };
  }

  const primaryEmails = emails?.filter((e) => e.is_primary) || [];
  const verifiedEmails = emails?.filter((e) => e.verified) || [];

  console.log(`  ✓ Total emails: ${emails?.length || 0}`);
  console.log(`  ✓ Primary emails: ${primaryEmails.length}`);
  console.log(`  ✓ Verified emails: ${verifiedEmails.length}`);

  return {
    total: emails?.length || 0,
    primaryEmails: primaryEmails.length,
    verifiedEmails: verifiedEmails.length,
    records: emails || [],
  };
}

async function auditRelationships(
  investors: any[],
  positions: any[],
  reports: any[],
  emails: any[]
): Promise<DatabaseAudit["relationships"]> {
  console.log("\n🔗 Auditing Data Relationships...");

  const investorIds = new Set(investors.map((i) => i.id));
  const positionInvestorIds = new Set(positions.map((p) => p.investor_id || p.user_id));
  const reportInvestorIds = new Set(reports.map((r) => r.investor_id));
  const emailInvestorIds = new Set(emails.map((e) => e.investor_id));

  const investorsWithPositions = investors.filter((i) => positionInvestorIds.has(i.id)).length;

  const investorsWithReports = investors.filter((i) => reportInvestorIds.has(i.id)).length;

  const investorsWithEmails = investors.filter((i) => emailInvestorIds.has(i.id)).length;

  const orphanedPositions = positions.filter(
    (p) => !investorIds.has(p.investor_id || p.user_id)
  ).length;

  const orphanedReports = reports.filter((r) => !investorIds.has(r.investor_id)).length;

  console.log(`  ✓ Investors with positions: ${investorsWithPositions}/${investors.length}`);
  console.log(`  ✓ Investors with reports: ${investorsWithReports}/${investors.length}`);
  console.log(`  ✓ Investors with emails: ${investorsWithEmails}/${investors.length}`);
  console.log(`  ✓ Orphaned positions: ${orphanedPositions}`);
  console.log(`  ✓ Orphaned reports: ${orphanedReports}`);

  return {
    investorsWithPositions,
    investorsWithReports,
    investorsWithEmails,
    orphanedPositions,
    orphanedReports,
  };
}

function analyzeDataIntegrity(
  investors: any[],
  positions: any[],
  reports: any[],
  emails: any[],
  relationships: DatabaseAudit["relationships"]
): DatabaseAudit["dataIntegrity"] {
  console.log("\n🔍 Analyzing Data Integrity...");

  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check for orphaned data
  if (relationships.orphanedPositions > 0) {
    issues.push(`${relationships.orphanedPositions} positions reference non-existent investors`);
  }

  if (relationships.orphanedReports > 0) {
    issues.push(`${relationships.orphanedReports} reports reference non-existent investors`);
  }

  // Check for investors without data
  const investorsWithoutPositions = investors.length - relationships.investorsWithPositions;
  if (investorsWithoutPositions > 0) {
    warnings.push(`${investorsWithoutPositions} investors have no position data`);
  }

  const investorsWithoutReports = investors.length - relationships.investorsWithReports;
  if (investorsWithoutReports > 0) {
    warnings.push(`${investorsWithoutReports} investors have no monthly reports`);
  }

  const investorsWithoutEmails = investors.length - relationships.investorsWithEmails;
  if (investorsWithoutEmails > 0) {
    warnings.push(`${investorsWithoutEmails} investors have no emails in investor_emails table`);
  }

  // Check for duplicate primary emails
  const investorsByPrimaryEmail: Record<string, number> = {};
  emails
    .filter((e) => e.is_primary)
    .forEach((e) => {
      investorsByPrimaryEmail[e.email] = (investorsByPrimaryEmail[e.email] || 0) + 1;
    });
  const duplicatePrimaryEmails = Object.entries(investorsByPrimaryEmail).filter(
    ([_, count]) => count > 1
  );

  if (duplicatePrimaryEmails.length > 0) {
    issues.push(
      `${duplicatePrimaryEmails.length} email addresses are primary for multiple investors`
    );
  }

  // Recommendations
  if (relationships.investorsWithReports < investors.length) {
    recommendations.push(
      "Migrate position data to investor_monthly_reports table for all investors"
    );
  }

  if (relationships.investorsWithEmails < investors.length) {
    recommendations.push("Migrate legacy investor.email to investor_emails table");
  }

  if (positions.length > 0 && reports.length > 0) {
    recommendations.push(
      "Consider deprecating positions table in favor of investor_monthly_reports"
    );
  }

  console.log(`  ✓ Issues found: ${issues.length}`);
  console.log(`  ✓ Warnings: ${warnings.length}`);
  console.log(`  ✓ Recommendations: ${recommendations.length}`);

  return {
    issues,
    warnings,
    recommendations,
  };
}

async function generateAuditReport(audit: DatabaseAudit): Promise<string> {
  const report = `# Database Data Audit Report
Generated: ${new Date().toISOString()}

---

## Executive Summary

**Database:** ${SUPABASE_URL}
**Status:** ${audit.dataIntegrity.issues.length === 0 ? "✅ HEALTHY" : "⚠️ NEEDS ATTENTION"}

### Key Metrics

- **Total Investors:** ${audit.investors.total}
- **Active Investors:** ${audit.investors.active}
- **Total Positions:** ${audit.positions.total}
- **Total Monthly Reports:** ${audit.monthlyReports.total}
- **Total Investor Emails:** ${audit.investorEmails.total}
- **Total Asset Value:** $${audit.positions.totalValue.toLocaleString()}

---

## 1. Investors Table

**Total Records:** ${audit.investors.total}

### Breakdown:
- Active: ${audit.investors.active}
- With Email (legacy): ${audit.investors.withEmail}
- With Multiple Emails: ${audit.investorEmails.total > 0 ? "Yes" : "No"}

### Sample Investors:
\`\`\`json
${JSON.stringify(
  audit.investors.records.slice(0, 5).map((i) => ({
    id: i.id,
    name: i.name || i.first_name + " " + i.last_name,
    email: i.email,
    status: i.status,
    created_at: i.created_at,
  })),
  null,
  2
)}
\`\`\`

---

## 2. Positions Table

**Total Records:** ${audit.positions.total}
**Total Value:** $${audit.positions.totalValue.toLocaleString()}

### By Asset:
${Object.entries(audit.positions.byAsset)
  .map(([asset, count]) => `- ${asset}: ${count} positions`)
  .join("\n")}

### Sample Positions:
\`\`\`json
${JSON.stringify(
  audit.positions.records.slice(0, 5).map((p) => ({
    investor_id: p.investor_id || p.user_id,
    asset: p.asset_code || p.asset_symbol,
    balance: p.current_balance || p.balance,
    principal: p.principal,
    total_earned: p.total_earned,
  })),
  null,
  2
)}
\`\`\`

---

## 3. Monthly Reports Table

**Total Records:** ${audit.monthlyReports.total}
**Unique Months:** ${Object.keys(audit.monthlyReports.byMonth).length}

### By Month:
${Object.entries(audit.monthlyReports.byMonth)
  .sort(([a], [b]) => b.localeCompare(a))
  .slice(0, 6)
  .map(([month, count]) => `- ${month}: ${count} reports`)
  .join("\n")}

### By Asset:
${Object.entries(audit.monthlyReports.byAsset)
  .map(([asset, count]) => `- ${asset}: ${count} reports`)
  .join("\n")}

### Sample Reports:
\`\`\`json
${JSON.stringify(
  audit.monthlyReports.records.slice(0, 3).map((r) => ({
    investor_id: r.investor_id,
    month: r.report_month,
    asset: r.asset_code,
    opening: r.opening_balance,
    closing: r.closing_balance,
    yield: r.yield,
  })),
  null,
  2
)}
\`\`\`

---

## 4. Investor Emails Table

**Total Records:** ${audit.investorEmails.total}

### Breakdown:
- Primary Emails: ${audit.investorEmails.primaryEmails}
- Verified Emails: ${audit.investorEmails.verifiedEmails}
- Unverified: ${audit.investorEmails.total - audit.investorEmails.verifiedEmails}

### Sample Emails:
\`\`\`json
${JSON.stringify(
  audit.investorEmails.records.slice(0, 5).map((e) => ({
    investor_id: e.investor_id,
    email: e.email,
    is_primary: e.is_primary,
    verified: e.verified,
  })),
  null,
  2
)}
\`\`\`

---

## 5. Data Relationships

### Coverage:
- **Investors with Positions:** ${audit.relationships.investorsWithPositions}/${audit.investors.total} (${Math.round((audit.relationships.investorsWithPositions / audit.investors.total) * 100)}%)
- **Investors with Reports:** ${audit.relationships.investorsWithReports}/${audit.investors.total} (${Math.round((audit.relationships.investorsWithReports / audit.investors.total) * 100)}%)
- **Investors with Emails:** ${audit.relationships.investorsWithEmails}/${audit.investors.total} (${Math.round((audit.relationships.investorsWithEmails / audit.investors.total) * 100)}%)

### Orphaned Data:
${
  audit.relationships.orphanedPositions > 0 || audit.relationships.orphanedReports > 0
    ? `
- **Orphaned Positions:** ${audit.relationships.orphanedPositions} ⚠️
- **Orphaned Reports:** ${audit.relationships.orphanedReports} ⚠️
`
    : "- No orphaned data detected ✅"
}

---

## 6. Data Integrity Analysis

### Issues (${audit.dataIntegrity.issues.length}):
${
  audit.dataIntegrity.issues.length > 0
    ? audit.dataIntegrity.issues.map((i) => `- ❌ ${i}`).join("\n")
    : "- No critical issues detected ✅"
}

### Warnings (${audit.dataIntegrity.warnings.length}):
${
  audit.dataIntegrity.warnings.length > 0
    ? audit.dataIntegrity.warnings.map((w) => `- ⚠️ ${w}`).join("\n")
    : "- No warnings"
}

### Recommendations (${audit.dataIntegrity.recommendations.length}):
${
  audit.dataIntegrity.recommendations.length > 0
    ? audit.dataIntegrity.recommendations.map((r) => `- 💡 ${r}`).join("\n")
    : "- No recommendations"
}

---

## 7. Platform Display Verification

### Where This Data Should Appear:

**Investor View (/investor/statements):**
- Should show monthly reports from \`investor_monthly_reports\` table
- Filter by year and asset
- Display: opening balance, additions, withdrawals, yield, closing balance
- **Status:** ${audit.monthlyReports.total > 0 ? "✅ Data available" : "❌ No reports"}

**Admin Dashboard (/admin):**
- Should show total investors: ${audit.investors.total}
- Should show total AUM: $${audit.positions.totalValue.toLocaleString()}
- Should show position breakdown by asset
- **Status:** ${audit.investors.total > 0 && audit.positions.total > 0 ? "✅ Data available" : "⚠️ Limited data"}

**Admin Monthly Data Entry (/admin/monthly-data-entry):**
- Should allow entering reports for ${audit.investors.total} investors
- Should support ${Object.keys(audit.positions.byAsset).length} assets
- **Status:** ✅ Ready for data entry

**Admin Investor Reports (/admin/investor-reports):**
- Should show ${audit.investors.total} investors
- Should display email count badges for multi-email investors
- Should prepare reports for ${audit.monthlyReports.total > 0 ? "existing months" : "no data yet"}
- **Status:** ${audit.monthlyReports.total > 0 ? "✅ Reports available" : "⚠️ No historical data"}

---

## 8. Next Steps

### Immediate Actions:
${
  audit.dataIntegrity.issues.length > 0
    ? "1. ❗ Fix critical issues listed above\n"
    : "1. ✅ No critical issues\n"
}
${audit.dataIntegrity.warnings.length > 0 ? "2. ⚠️ Address warnings\n" : "2. ✅ No warnings\n"}
3. 📝 Review recommendations

### Data Migration:
${
  audit.relationships.investorsWithReports < audit.investors.total
    ? `
- Migrate position data to investor_monthly_reports for ${audit.investors.total - audit.relationships.investorsWithReports} investors
- Use September 2025 as baseline month
- Calculate opening/closing balances from positions table
`
    : "- All investors have monthly reports ✅"
}

${
  audit.relationships.investorsWithEmails < audit.investors.total
    ? `
- Migrate ${audit.investors.total - audit.relationships.investorsWithEmails} investor emails to investor_emails table
- Set as primary and verified
`
    : "- All investors have emails in investor_emails table ✅"
}

---

**Report Generated:** ${new Date().toLocaleString()}
**Script:** scripts/audit-database-data.ts
`;

  return report;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  DATABASE DATA AUDIT");
  console.log("  Indigo Yield Platform");
  console.log("═══════════════════════════════════════════════════════");

  try {
    // Audit each table
    const investors = await auditInvestors();
    const positions = await auditPositions();
    const monthlyReports = await auditMonthlyReports();
    const investorEmails = await auditInvestorEmails();

    // Analyze relationships
    const relationships = await auditRelationships(
      investors.records,
      positions.records,
      monthlyReports.records,
      investorEmails.records
    );

    // Analyze data integrity
    const dataIntegrity = analyzeDataIntegrity(
      investors.records,
      positions.records,
      monthlyReports.records,
      investorEmails.records,
      relationships
    );

    // Build complete audit
    const audit: DatabaseAudit = {
      investors,
      positions,
      monthlyReports,
      investorEmails,
      relationships,
      dataIntegrity,
    };

    // Generate report
    const report = await generateAuditReport(audit);

    // Save to file
    const fs = await import("fs/promises");
    const path = await import("path");

    const reportPath = path.join(process.cwd(), "DATABASE_DATA_AUDIT_REPORT.md");
    await fs.writeFile(reportPath, report, "utf-8");

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  ✅ AUDIT COMPLETE");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Investors: ${audit.investors.total}`);
    console.log(`   - Positions: ${audit.positions.total}`);
    console.log(`   - Monthly Reports: ${audit.monthlyReports.total}`);
    console.log(`   - Emails: ${audit.investorEmails.total}`);
    console.log(`   - Issues: ${audit.dataIntegrity.issues.length}`);
    console.log(`   - Warnings: ${audit.dataIntegrity.warnings.length}`);
    console.log(
      `\n${audit.dataIntegrity.issues.length === 0 ? "✅" : "⚠️"} Status: ${audit.dataIntegrity.issues.length === 0 ? "HEALTHY" : "NEEDS ATTENTION"}\n`
    );
  } catch (error) {
    console.error("\n❌ Error during audit:", error);
    process.exit(1);
  }
}

main();
