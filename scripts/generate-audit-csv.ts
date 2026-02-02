#!/usr/bin/env tsx
/**
 * Generate CSV summary of RPC audit mismatches
 */

import fs from "fs";
import path from "path";

// Read the report
const reportPath = path.join(__dirname, "rpc-audit-report.txt");
const report = fs.readFileSync(reportPath, "utf-8");

// Parse mismatches from report
const lines = report.split("\n");

interface MismatchRow {
  rpcName: string;
  issueType: string;
  severity: "CRITICAL" | "MEDIUM" | "LOW";
  details: string;
  dbSignature: string;
  frontendSignature: string;
}

const rows: MismatchRow[] = [];
let currentType = "";
let currentRPC = "";
let currentDetails = "";
let currentDB = "";
let currentFrontend = "";

const criticalTypes = [
  "MISSING_IN_DB",
  "REQUIRED_PARAM_COUNT_MISMATCH",
  "REQUIRED_PARAM_NAME_MISMATCH",
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect section header
  if (line.match(/^[A-Z_]+ \(\d+\)$/)) {
    currentType = line.split(" ")[0];
    continue;
  }

  // Detect RPC name
  if (line.startsWith("🔴 ")) {
    // Save previous entry if exists
    if (currentRPC && currentType) {
      rows.push({
        rpcName: currentRPC,
        issueType: currentType,
        severity: criticalTypes.includes(currentType) ? "CRITICAL" : "MEDIUM",
        details: currentDetails,
        dbSignature: currentDB,
        frontendSignature: currentFrontend,
      });
    }

    // Start new entry
    currentRPC = line.replace("🔴 ", "").trim();
    currentDetails = "";
    currentDB = "";
    currentFrontend = "";
    continue;
  }

  // Detect details
  if (line.match(/^\s+[A-Z]/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DB:")) {
      currentDB = trimmed.substring(3).trim();
    } else if (trimmed.startsWith("Frontend:")) {
      currentFrontend = trimmed.substring(9).trim();
    } else if (!trimmed.startsWith("...")) {
      if (currentDetails) currentDetails += " | ";
      currentDetails += trimmed;
    }
  }
}

// Save last entry
if (currentRPC && currentType) {
  rows.push({
    rpcName: currentRPC,
    issueType: currentType,
    severity: criticalTypes.includes(currentType) ? "CRITICAL" : "MEDIUM",
    details: currentDetails,
    dbSignature: currentDB,
    frontendSignature: currentFrontend,
  });
}

// Generate CSV
const csvPath = path.join(__dirname, "rpc-audit-mismatches.csv");
const csv = [
  "RPC Name,Issue Type,Severity,Details,DB Signature,Frontend Signature",
  ...rows.map((r) =>
    [
      `"${r.rpcName}"`,
      `"${r.issueType}"`,
      `"${r.severity}"`,
      `"${r.details.replace(/"/g, '""')}"`,
      `"${r.dbSignature.replace(/"/g, '""')}"`,
      `"${r.frontendSignature.replace(/"/g, '""')}"`,
    ].join(",")
  ),
].join("\n");

fs.writeFileSync(csvPath, csv);

console.log(`Generated CSV with ${rows.length} rows`);
console.log(`Output: ${csvPath}`);

// Generate summary stats
const byType = rows.reduce(
  (acc, r) => {
    if (!acc[r.issueType]) acc[r.issueType] = 0;
    acc[r.issueType]++;
    return acc;
  },
  {} as Record<string, number>
);

const bySeverity = rows.reduce(
  (acc, r) => {
    if (!acc[r.severity]) acc[r.severity] = 0;
    acc[r.severity]++;
    return acc;
  },
  {} as Record<string, number>
);

console.log("\nSummary by Type:");
Object.entries(byType)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

console.log("\nSummary by Severity:");
Object.entries(bySeverity)
  .sort((a, b) => b[1] - a[1])
  .forEach(([severity, count]) => {
    console.log(`  ${severity}: ${count}`);
  });
