/**
 * RPC Contract Manifest Generator
 * 
 * This script scans the codebase for supabase.rpc() calls and generates
 * a manifest documenting all RPC contracts between frontend and backend.
 * 
 * Usage: npx ts-node scripts/generate-rpc-manifest.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RPCCall {
  name: string;
  file: string;
  line: number;
  params?: string;
}

interface RPCManifestEntry {
  name: string;
  callSites: { file: string; line: number }[];
  paramPatterns: string[];
  queryKeyPattern?: string;
  documented: boolean;
}

interface RPCManifest {
  generatedAt: string;
  totalRPCs: number;
  documentedRPCs: number;
  undocumentedRPCs: string[];
  rpcs: RPCManifestEntry[];
}

// Known RPC functions with their expected signatures
const KNOWN_RPCS: Record<string, { params: string[]; returns: string }> = {
  // Transaction RPCs
  'apply_deposit_with_crystallization': {
    params: ['p_fund_id', 'p_investor_id', 'p_amount', 'p_tx_date', 'p_admin_id', 'p_preflow_aum', 'p_notes', 'p_reference_id'],
    returns: 'jsonb'
  },
  'apply_withdrawal_with_crystallization': {
    params: ['p_fund_id', 'p_investor_id', 'p_amount', 'p_tx_date', 'p_admin_id', 'p_preflow_aum', 'p_withdrawal_request_id'],
    returns: 'jsonb'
  },
  'void_transaction': {
    params: ['p_transaction_id', 'p_admin_id', 'p_reason'],
    returns: 'jsonb'
  },
  'get_void_transaction_impact': {
    params: ['p_transaction_id'],
    returns: 'jsonb'
  },
  
  // Yield RPCs
  'preview_daily_yield_to_fund_v3': {
    params: ['p_fund_id', 'p_new_aum', 'p_yield_date', 'p_purpose'],
    returns: 'jsonb'
  },
  'apply_daily_yield_to_fund_v3': {
    params: ['p_fund_id', 'p_new_aum', 'p_yield_date', 'p_purpose', 'p_admin_id'],
    returns: 'jsonb'
  },
  'void_yield_distribution': {
    params: ['p_distribution_id', 'p_admin_id', 'p_reason'],
    returns: 'jsonb'
  },
  
  // AUM RPCs
  'get_fund_aum_as_of': {
    params: ['p_fund_id', 'p_as_of_date', 'p_purpose'],
    returns: 'table'
  },
  'ensure_preflow_aum': {
    params: ['p_fund_id', 'p_aum_date', 'p_purpose', 'p_admin_id'],
    returns: 'jsonb'
  },
  
  // Admin RPCs
  'is_admin': {
    params: [],
    returns: 'boolean'
  },
  'is_super_admin': {
    params: [],
    returns: 'boolean'
  },
  'run_integrity_pack': {
    params: [],
    returns: 'jsonb'
  },
  
  // Withdrawal RPCs
  'approve_withdrawal': {
    params: ['p_request_id', 'p_admin_id'],
    returns: 'jsonb'
  },
  'reject_withdrawal': {
    params: ['p_request_id', 'p_admin_id', 'p_reason'],
    returns: 'jsonb'
  },
  'complete_withdrawal': {
    params: ['p_request_id', 'p_admin_id', 'p_tx_date'],
    returns: 'jsonb'
  },
};

function findRPCCalls(directory: string): RPCCall[] {
  const calls: RPCCall[] = [];
  const extensions = ['.ts', '.tsx'];
  
  function scanDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (!['node_modules', 'dist', '.git', 'build'].includes(file)) {
          scanDirectory(filePath);
        }
      } else if (extensions.some(ext => file.endsWith(ext))) {
        scanFile(filePath, calls);
      }
    }
  }
  
  function scanFile(filePath: string, calls: RPCCall[]) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Pattern to match supabase.rpc("functionName") or .rpc('functionName')
    const rpcPattern = /\.rpc\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    lines.forEach((line, index) => {
      let match;
      while ((match = rpcPattern.exec(line)) !== null) {
        calls.push({
          name: match[1],
          file: filePath.replace(process.cwd() + '/', ''),
          line: index + 1,
          params: extractParams(line, match.index)
        });
      }
    });
  }
  
  function extractParams(line: string, startIndex: number): string | undefined {
    // Try to extract the second argument (params object)
    const afterRpc = line.substring(startIndex);
    const paramsMatch = afterRpc.match(/\.rpc\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(\{[^}]+\})/);
    return paramsMatch ? paramsMatch[1] : undefined;
  }
  
  scanDirectory(directory);
  return calls;
}

function generateManifest(calls: RPCCall[]): RPCManifest {
  const rpcMap = new Map<string, RPCManifestEntry>();
  
  // Group calls by RPC name
  for (const call of calls) {
    if (!rpcMap.has(call.name)) {
      rpcMap.set(call.name, {
        name: call.name,
        callSites: [],
        paramPatterns: [],
        documented: call.name in KNOWN_RPCS
      });
    }
    
    const entry = rpcMap.get(call.name)!;
    entry.callSites.push({ file: call.file, line: call.line });
    
    if (call.params && !entry.paramPatterns.includes(call.params)) {
      entry.paramPatterns.push(call.params);
    }
  }
  
  const rpcs = Array.from(rpcMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const undocumented = rpcs.filter(r => !r.documented).map(r => r.name);
  
  return {
    generatedAt: new Date().toISOString(),
    totalRPCs: rpcs.length,
    documentedRPCs: rpcs.filter(r => r.documented).length,
    undocumentedRPCs: undocumented,
    rpcs
  };
}

function main() {
  console.log('🔍 Scanning for RPC calls...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const calls = findRPCCalls(srcDir);
  
  console.log(`Found ${calls.length} RPC call sites\n`);
  
  const manifest = generateManifest(calls);
  
  // Write manifest
  const outputPath = path.join(process.cwd(), 'artifacts', 'rpc-contract-manifest.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✅ Manifest written to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total RPCs: ${manifest.totalRPCs}`);
  console.log(`   Documented: ${manifest.documentedRPCs}`);
  console.log(`   Undocumented: ${manifest.undocumentedRPCs.length}`);
  
  if (manifest.undocumentedRPCs.length > 0) {
    console.log(`\n⚠️  Undocumented RPCs:`);
    manifest.undocumentedRPCs.forEach(rpc => console.log(`   - ${rpc}`));
  }
  
  // Exit with error if there are undocumented RPCs (for CI)
  if (manifest.undocumentedRPCs.length > 0 && process.argv.includes('--strict')) {
    process.exit(1);
  }
}

main();
