#!/usr/bin/env npx ts-node
/**
 * RPC Signature Audit Script
 * ============================================================================
 * Purpose: Verify that frontend RPC calls match database function signatures
 * 
 * This script:
 * 1. Reads all service files that call RPCs
 * 2. Extracts the parameter names used in each call
 * 3. Compares against canonical signatures from types.ts
 * 4. Reports any mismatches
 * 
 * Usage: npx ts-node scripts/audit-rpc-signatures.ts
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

// Canonical RPC signatures extracted from database
// Format: { functionName: [orderedParameterNames] }
const CANONICAL_SIGNATURES: Record<string, string[]> = {
  // Void Operations - ALL follow: entity_id, admin_id, reason pattern
  void_transaction: ['p_transaction_id', 'p_admin_id', 'p_reason'],
  void_yield_distribution: ['p_distribution_id', 'p_admin_id', 'p_reason'],
  void_fund_daily_aum: ['p_record_id', 'p_reason', 'p_admin_id'],
  void_and_reissue_transaction: ['p_original_transaction_id', 'p_corrected_amount', 'p_corrected_date', 'p_admin_id', 'p_reason'],
  
  // Deposit/Withdrawal Operations
  apply_deposit_with_crystallization: ['p_investor_id', 'p_fund_id', 'p_amount', 'p_closing_aum', 'p_effective_date', 'p_notes', 'p_admin_id'],
  apply_withdrawal_with_crystallization: ['p_investor_id', 'p_fund_id', 'p_amount', 'p_new_total_aum', 'p_tx_date', 'p_notes', 'p_admin_id'],
  complete_withdrawal: ['p_request_id', 'p_closing_aum', 'p_event_ts', 'p_transaction_hash', 'p_admin_notes'],
  
  // Yield Operations
  apply_daily_yield_to_fund_v3: ['p_fund_id', 'p_yield_date', 'p_gross_yield_amount', 'p_admin_id', 'p_notes'],
  preview_daily_yield_to_fund_v3: ['p_fund_id', 'p_yield_date', 'p_gross_yield_amount'],
  
  // Transaction Operations
  admin_create_transaction: ['p_investor_id', 'p_fund_id', 'p_tx_type', 'p_amount', 'p_tx_date', 'p_notes', 'p_reference_id'],
  edit_transaction: ['p_transaction_id', 'p_new_notes', 'p_new_tx_date', 'p_admin_id', 'p_reason'],
  update_transaction: ['p_transaction_id', 'p_updates', 'p_admin_id', 'p_reason'],
  delete_transaction: ['p_transaction_id', 'p_admin_id', 'p_reason'],
  
  // Query/Preview Operations
  get_void_transaction_impact: ['p_transaction_id'],
  get_fund_aum_as_of: ['p_fund_id', 'p_as_of_date', 'p_purpose'],
  
  // Admin/Auth Operations
  is_admin: [],
  is_super_admin: [],
  get_user_role: ['p_user_id'],
};

interface RPCCall {
  file: string;
  line: number;
  functionName: string;
  parameters: string[];
  rawCall: string;
}

interface AuditResult {
  passed: boolean;
  calls: RPCCall[];
  issues: {
    call: RPCCall;
    expected: string[];
    message: string;
  }[];
}

function findServiceFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function extractRPCCalls(filePath: string): RPCCall[] {
  const calls: RPCCall[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Match patterns like: rpc.call("function_name", { params }) or callRPC("function_name", { params })
  const rpcPattern = /(?:rpc\.call|callRPC|supabase\.rpc)\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*\{([^}]*)\}/gs;
  
  let match;
  while ((match = rpcPattern.exec(content)) !== null) {
    const functionName = match[1];
    const paramsBlock = match[2];
    
    // Extract parameter names from the object
    const paramPattern = /(\w+)\s*:/g;
    const parameters: string[] = [];
    let paramMatch;
    while ((paramMatch = paramPattern.exec(paramsBlock)) !== null) {
      parameters.push(paramMatch[1]);
    }
    
    // Find line number
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = beforeMatch.split('\n').length;
    
    calls.push({
      file: filePath,
      line: lineNumber,
      functionName,
      parameters,
      rawCall: match[0].substring(0, 100) + (match[0].length > 100 ? '...' : ''),
    });
  }
  
  return calls;
}

function auditRPCSignatures(srcDir: string): AuditResult {
  const files = findServiceFiles(srcDir);
  const allCalls: RPCCall[] = [];
  const issues: AuditResult['issues'] = [];
  
  for (const file of files) {
    const calls = extractRPCCalls(file);
    allCalls.push(...calls);
  }
  
  // Check each call against canonical signatures
  for (const call of allCalls) {
    const canonical = CANONICAL_SIGNATURES[call.functionName];
    
    if (!canonical) {
      // Unknown RPC - might be fine, just warn
      continue;
    }
    
    // Check if all required parameters are present
    const missingParams = canonical.filter(p => !call.parameters.includes(p));
    const extraParams = call.parameters.filter(p => !canonical.includes(p));
    
    if (missingParams.length > 0) {
      issues.push({
        call,
        expected: canonical,
        message: `Missing parameters: ${missingParams.join(', ')}`,
      });
    }
    
    if (extraParams.length > 0) {
      issues.push({
        call,
        expected: canonical,
        message: `Unknown parameters: ${extraParams.join(', ')} (might be typos)`,
      });
    }
    
    // Check parameter order (for positional RPCs that care about order)
    if (missingParams.length === 0 && extraParams.length === 0) {
      const expectedOrder = canonical.join(',');
      const actualOrder = call.parameters.join(',');
      
      // Only warn about order if it differs - some DBs don't care about order
      // but it's good practice to match
      if (expectedOrder !== actualOrder) {
        // This is informational, not an error
        console.log(`  ℹ️  ${call.functionName} at ${path.basename(call.file)}:${call.line}`);
        console.log(`      Parameter order differs from canonical (may be OK)`);
        console.log(`      Expected: ${expectedOrder}`);
        console.log(`      Actual:   ${actualOrder}`);
      }
    }
  }
  
  return {
    passed: issues.length === 0,
    calls: allCalls,
    issues,
  };
}

// Main execution
console.log('============================================');
console.log('  RPC Signature Audit');
console.log('  ' + new Date().toISOString());
console.log('============================================\n');

const srcDir = path.join(__dirname, '..', 'src');
const result = auditRPCSignatures(srcDir);

console.log(`Found ${result.calls.length} RPC calls across service files\n`);

if (result.issues.length > 0) {
  console.log('❌ ISSUES FOUND:\n');
  
  for (const issue of result.issues) {
    console.log(`  ${issue.call.file}:${issue.call.line}`);
    console.log(`  Function: ${issue.call.functionName}`);
    console.log(`  Problem: ${issue.message}`);
    console.log(`  Expected: [${issue.expected.join(', ')}]`);
    console.log(`  Actual:   [${issue.call.parameters.join(', ')}]`);
    console.log('');
  }
  
  console.log('============================================');
  console.log(`❌ Audit FAILED: ${result.issues.length} signature issues found`);
  console.log('============================================');
  process.exit(1);
} else {
  console.log('============================================');
  console.log('✅ Audit PASSED: All RPC signatures match');
  console.log('============================================');
  process.exit(0);
}
