/**
 * Excel vs Platform Comparison Report
 * Compares Excel seed data against live Supabase platform data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config ---
const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';

const FUND_IDS = {
  BTC: '0a048d9b-c4cf-46eb-b428-59e10307df93',
  ETH: '717614a2-9e24-4abc-a89d-02209a3a772a',
  SOL: '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
  USDT: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
  XRP: '2c123c4f-76b4-4504-867e-059649855417',
};

const DUST_TOLERANCE = 1e-8;
const VARIANCE_THRESHOLD_PCT = 1.0; // 1% for fund-level
const BALANCE_VARIANCE_THRESHOLD_PCT = 0.01; // 0.01% for investor balances

// Name normalization: strip accents, lowercase, collapse whitespace
function normalizeName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip accents
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Name aliases: Excel name -> platform name (normalized)
const NAME_ALIASES = {
  'kabbaj': 'family kabbaj',
};

// IB relationships from CLAUDE.md
const EXPECTED_IB_RELATIONSHIPS = [
  { investor: 'Sam Johnson', ib: 'Ryan Van Der Wall', pct: 4 },
  { investor: 'Babak Eftekhari', ib: 'Lars Ahlgreen', pct: 2 },
  { investor: 'Paul Johnson', ib: 'Alex Jacobs', pct: 1.5 },
];

// --- Setup ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const performanceData = JSON.parse(readFileSync(path.join(__dirname, 'seed-data/performance.json'), 'utf8'));
const fundBalancesData = JSON.parse(readFileSync(path.join(__dirname, 'seed-data/fund-balances.json'), 'utf8'));

// --- Helpers ---
function fmt(n, decimals = 8) {
  if (n === null || n === undefined) return 'NULL';
  return Number(n).toFixed(decimals);
}

function fmtPct(n) {
  if (n === null || n === undefined) return 'NULL';
  return Number(n).toFixed(4) + '%';
}

function varPct(excel, platform) {
  if (excel === 0 && platform === 0) return 0;
  if (excel === 0) return null; // can't compute
  return ((platform - excel) / Math.abs(excel)) * 100;
}

function passFailFund(vp) {
  if (vp === null) return 'N/A';
  return Math.abs(vp) <= VARIANCE_THRESHOLD_PCT ? 'PASS' : 'FAIL';
}

function passFailBalance(vp) {
  if (vp === null) return 'N/A';
  return Math.abs(vp) <= BALANCE_VARIANCE_THRESHOLD_PCT ? 'PASS' : 'FAIL';
}

// Get last day of month
function monthEnd(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
}

// Parse numeric safely
function num(v) {
  if (v === null || v === undefined) return 0;
  return parseFloat(v) || 0;
}

// --- Main ---
async function main() {
  console.log('Fetching platform data from Supabase...');
  const COMPARISON_MONTH = '2026-01'; // Our seed covers through Jan 2026
  const lines = [];
  const issues = [];
  let totalPass = 0, totalFail = 0;

  // =============================
  // 1. FUND-LEVEL YIELD COMPARISON
  // =============================
  console.log('Section 1: Fund-level yield distributions...');

  // Aggregate Excel performance data per fund+month (sum multi-entries)
  const excelByFundMonth = {};
  for (const entry of performanceData) {
    const key = `${entry.fund}|${entry.month}`;
    if (!excelByFundMonth[key]) {
      excelByFundMonth[key] = {
        fund: entry.fund,
        month: entry.month,
        entries: [],
        totalGrossYield: 0,
        totalNetYield: 0,
        totalFeeYield: 0,
        openingAum: 0,
        closingAum: entry.closingAum,
        flows: 0,
      };
    }
    const eg = excelByFundMonth[key];
    eg.entries.push(entry);
    // Gross yield = openingAum * grossPct / 100 (skip if openingAum=0 or grossPct=0)
    const grossYield = entry.openingAum > 0 && entry.grossPct > 0
      ? entry.openingAum * entry.grossPct / 100
      : 0;
    const netYield = entry.openingAum > 0 && entry.netPct > 0
      ? entry.openingAum * entry.netPct / 100
      : 0;
    const feeYield = grossYield - netYield;
    eg.totalGrossYield += grossYield;
    eg.totalNetYield += netYield;
    eg.totalFeeYield += feeYield;
    eg.openingAum += entry.openingAum;
    eg.flows += entry.flows || 0;
  }

  // Fetch all non-voided yield_distributions (both voided and not) for conservation check
  // For yield comparison, we'll filter to 'daily' type (scheduled) excluding deposit/withdrawal crystallizations
  const { data: allDists, error: distErr } = await supabase
    .from('yield_distributions')
    .select('id, fund_id, period_end, period_start, gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, dust_amount, is_voided, distribution_type')
    .eq('is_voided', false)
    .in('fund_id', Object.values(FUND_IDS))
    .order('period_end', { ascending: true });

  if (distErr) throw new Error('Failed to fetch yield_distributions: ' + distErr.message);

  // Group platform distributions by fund+month
  const platformByFundMonth = {};
  const fundIdToName = Object.fromEntries(Object.entries(FUND_IDS).map(([k, v]) => [v, k]));

  for (const d of allDists) {
    const fundName = fundIdToName[d.fund_id];
    if (!fundName) continue;
    const month = d.period_end ? d.period_end.slice(0, 7) : null;
    if (!month) continue;
    const key = `${fundName}|${month}`;
    if (!platformByFundMonth[key]) {
      platformByFundMonth[key] = {
        distributions: [],
        totalGross: 0,
        totalNet: 0,
        totalFee: 0,
        totalIB: 0,
        totalDust: 0,
      };
    }
    const p = platformByFundMonth[key];
    p.distributions.push(d);
    // Only sum scheduled distributions for yield comparison (exclude deposit/withdrawal crystallizations)
    if (d.distribution_type === 'daily' || d.distribution_type === 'transaction') {
      p.totalGross += num(d.gross_yield_amount);
      p.totalNet += num(d.total_net_amount);
      p.totalFee += num(d.total_fee_amount);
      p.totalIB += num(d.total_ib_amount);
      p.totalDust += num(d.dust_amount);
    }
  }

  // Build comparison table
  const fundYieldRows = [];
  const allKeys = new Set([...Object.keys(excelByFundMonth), ...Object.keys(platformByFundMonth)]);

  for (const key of [...allKeys].sort()) {
    const [fund, month] = key.split('|');
    // Skip months after our seed data coverage
    if (month > COMPARISON_MONTH) continue;
    const excel = excelByFundMonth[key];
    const platform = platformByFundMonth[key];

    // Skip months where both Excel gross yield = 0 (no yield event)
    const excelGross = excel ? excel.totalGrossYield : 0;
    if (excelGross === 0 && !platform) continue;

    const platGross = platform ? platform.totalGross : 0;
    const platNet = platform ? platform.totalNet : 0;
    const platFee = platform ? platform.totalFee : 0;

    const excelNet = excel ? excel.totalNetYield : 0;
    const excelFee = excel ? excel.totalFeeYield : 0;

    const grossVarPct = varPct(excelGross, platGross);
    const netVarPct = varPct(excelNet, platNet);
    const feeVarPct = varPct(excelFee, platFee);

    const grossPass = passFailFund(grossVarPct);
    const entries = excel ? excel.entries.length : 0;
    const platCount = platform ? platform.distributions.length : 0;

    if (grossPass === 'FAIL') {
      issues.push({
        section: 'Fund Yield',
        severity: 'HIGH',
        item: `${fund} ${month}`,
        detail: `Gross yield variance ${fmtPct(grossVarPct)}: Excel=${fmt(excelGross)} Platform=${fmt(platGross)}`,
      });
      totalFail++;
    } else if (grossPass === 'PASS') {
      totalPass++;
    }

    fundYieldRows.push({
      fund, month, entries, platCount,
      excelGross, excelNet, excelFee,
      platGross, platNet, platFee,
      platIB: platform ? platform.totalIB : 0,
      platDust: platform ? platform.totalDust : 0,
      grossVarPct, netVarPct, feeVarPct, grossPass,
    });
  }

  // =============================
  // 5. CONSERVATION IDENTITY (all distributions)
  // =============================
  console.log('Section 5: Conservation identity...');
  const conservationRows = [];
  let conservationFails = 0;
  for (const d of allDists) {
    const gross = num(d.gross_yield_amount);
    const net = num(d.total_net_amount);
    const fee = num(d.total_fee_amount);
    const ib = num(d.total_ib_amount);
    const dust = num(d.dust_amount);
    const rhs = net + fee + ib + dust;
    const residual = gross - rhs;
    const pass = Math.abs(residual) <= 1e-8;
    if (!pass) {
      conservationFails++;
      const fundName = fundIdToName[d.fund_id] || d.fund_id;
      issues.push({
        section: 'Conservation',
        severity: 'CRITICAL',
        item: `dist ${d.id.slice(0, 8)}... ${fundName} ${d.period_end}`,
        detail: `gross=${fmt(gross)} != net+fee+ib+dust=${fmt(rhs)}, residual=${residual.toExponential(4)}`,
      });
    }
    conservationRows.push({ id: d.id.slice(0, 8), fund: fundIdToName[d.fund_id], period_end: d.period_end, gross, net, fee, ib, dust, residual, pass });
  }

  // =============================
  // 3. FEE AUDIT
  // =============================
  console.log('Section 3: Fee audit...');

  const { data: feeAllocs, error: feeErr } = await supabase
    .from('fee_allocations')
    .select(`
      id, distribution_id, investor_id, fee_percentage, fee_amount, base_net_income,
      profiles:investor_id (first_name, last_name, email)
    `)
    .order('distribution_id');

  if (feeErr) throw new Error('Failed to fetch fee_allocations: ' + feeErr.message);

  // Also get yield_allocations to find per-investor gross yield
  const { data: yieldAllocs, error: yaErr } = await supabase
    .from('yield_allocations')
    .select('id, distribution_id, investor_id, gross_amount, net_amount, fee_amount, fee_pct, ib_pct, ib_amount')
    .order('distribution_id');

  if (yaErr) throw new Error('Failed to fetch yield_allocations: ' + yaErr.message);

  // Build lookup: (distribution_id, investor_id) -> gross_yield
  const yieldAllocMap = {};
  for (const ya of yieldAllocs) {
    const k = `${ya.distribution_id}|${ya.investor_id}`;
    yieldAllocMap[k] = ya;
  }

  // Build lookup: distribution_id -> distribution
  const distMap = Object.fromEntries(allDists.map(d => [d.id, d]));

  const feeRows = [];
  let feeFails = 0;
  for (const fa of feeAllocs) {
    const dist = distMap[fa.distribution_id];
    if (!dist) continue;
    const k = `${fa.distribution_id}|${fa.investor_id}`;
    const ya = yieldAllocMap[k];
    const grossYield = ya ? num(ya.gross_amount) : num(fa.base_net_income);
    const expectedFee = grossYield * num(fa.fee_percentage) / 100;
    const actualFee = num(fa.fee_amount);
    const diff = actualFee - expectedFee;
    const pass = Math.abs(diff) <= DUST_TOLERANCE || (grossYield === 0 && actualFee === 0);
    const investorName = fa.profiles ? `${fa.profiles.first_name || ''} ${fa.profiles.last_name || ''}`.trim() : fa.investor_id;
    if (!pass) {
      feeFails++;
      issues.push({
        section: 'Fee Audit',
        severity: 'HIGH',
        item: `${investorName} dist ${fa.distribution_id.slice(0, 8)}`,
        detail: `Expected fee=${fmt(expectedFee)} actual=${fmt(actualFee)} diff=${diff.toExponential(4)} (gross=${fmt(grossYield)}, feePct=${fa.fee_percentage}%)`,
      });
    }
    feeRows.push({
      investor: investorName,
      distribution_id: fa.distribution_id.slice(0, 8),
      fund: dist ? fundIdToName[dist.fund_id] : '?',
      period_end: dist ? dist.period_end : '?',
      feePct: num(fa.fee_percentage),
      grossYield,
      expectedFee,
      actualFee,
      diff,
      pass,
    });
  }

  // =============================
  // 4. IB COMMISSION AUDIT
  // =============================
  console.log('Section 4: IB commission audit...');

  // Get profiles (no ib_percentage column - use ib_commission_schedule)
  const { data: allProfiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, ib_parent_id, account_type, role');

  if (profErr) throw new Error('Failed to fetch profiles: ' + profErr.message);

  const profileMap = Object.fromEntries(allProfiles.map(p => [p.id, p]));

  // Get IB commission schedules (stores ib_percentage per investor+fund)
  const { data: ibSchedules, error: ibSchedErr } = await supabase
    .from('ib_commission_schedule')
    .select('investor_id, fund_id, ib_percentage, effective_date, end_date');

  if (ibSchedErr) throw new Error('Failed to fetch ib_commission_schedule: ' + ibSchedErr.message);

  // Build IB pct lookup: investor_id -> latest ib_percentage (across funds)
  // For relationship verification, use ib_parent_id from profiles
  const ibPctByInvestor = {};
  for (const sched of ibSchedules) {
    if (!ibPctByInvestor[sched.investor_id] || sched.ib_percentage > 0) {
      ibPctByInvestor[sched.investor_id] = num(sched.ib_percentage);
    }
  }

  // IB audit via yield_allocations (ib_pct + ib_amount fields)
  // yield_allocations has ib_pct and ib_amount per investor per distribution
  const ibRows = [];
  let ibFails = 0;

  // Check yield_allocations where ib_pct > 0
  const ibYieldAllocs = yieldAllocs.filter(ya => num(ya.ib_pct) > 0 || num(ya.ib_amount) > 0);

  for (const ya of ibYieldAllocs) {
    const dist = distMap[ya.distribution_id];
    if (!dist) continue;

    const grossYield = num(ya.gross_amount);
    const ibPct = num(ya.ib_pct);
    const expectedIB = grossYield * ibPct / 100;
    const actualIB = num(ya.ib_amount);
    const diff = actualIB - expectedIB;
    const pass = Math.abs(diff) <= DUST_TOLERANCE || (grossYield === 0 && actualIB === 0);

    // Find IB recipient for this investor
    const investorProfile = profileMap[ya.investor_id];
    const investorName = investorProfile
      ? `${investorProfile.first_name || ''} ${investorProfile.last_name || ''}`.trim()
      : ya.investor_id;
    const ibParentId = investorProfile ? investorProfile.ib_parent_id : null;
    const ibProfile = ibParentId ? profileMap[ibParentId] : null;
    const ibName = ibProfile
      ? `${ibProfile.first_name || ''} ${ibProfile.last_name || ''}`.trim()
      : (ibParentId || 'UNKNOWN');

    if (!pass) {
      ibFails++;
      issues.push({
        section: 'IB Audit',
        severity: 'HIGH',
        item: `${investorName} -> ${ibName} dist ${ya.distribution_id.slice(0, 8)}`,
        detail: `Expected IB=${fmt(expectedIB)} actual=${fmt(actualIB)} diff=${diff.toExponential(4)} (gross=${fmt(grossYield)}, ibPct=${ibPct}%)`,
      });
    }

    ibRows.push({
      source: investorName,
      ib: ibName,
      distribution_id: ya.distribution_id.slice(0, 8),
      fund: dist ? fundIdToName[dist.fund_id] : '?',
      period_end: dist ? dist.period_end : '?',
      ibPct,
      grossYield,
      expectedIB,
      actualIB,
      diff,
      pass,
    });
  }

  // Verify expected IB relationships
  const ibRelationshipCheck = [];
  for (const rel of EXPECTED_IB_RELATIONSHIPS) {
    // Find investors with this IB relationship via ib_parent_id
    const sourceInvestors = allProfiles.filter(p => {
      const ibProfile = allProfiles.find(ip => ip.id === p.ib_parent_id);
      return ibProfile && (
        `${ibProfile.first_name} ${ibProfile.last_name}`.toLowerCase().includes(rel.ib.toLowerCase().split(' ')[0].toLowerCase())
      ) && (
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(rel.investor.toLowerCase().split(' ')[0].toLowerCase())
      );
    });

    const found = sourceInvestors.length > 0;
    // Check pct via ib_commission_schedule
    const pctMatch = found ? sourceInvestors.every(p => {
      const schedPct = ibPctByInvestor[p.id];
      return schedPct !== undefined && Math.abs(schedPct - rel.pct) < 0.001;
    }) : false;
    const actualPcts = found ? sourceInvestors.map(p => ibPctByInvestor[p.id] ?? 'N/A').join(', ') : 'N/A';

    ibRelationshipCheck.push({
      investor: rel.investor,
      ib: rel.ib,
      expectedPct: rel.pct,
      found,
      pctMatch,
      actualPcts,
    });

    if (!found) {
      issues.push({
        section: 'IB Relationships',
        severity: 'MEDIUM',
        item: `${rel.investor} -> ${rel.ib}`,
        detail: `Expected IB relationship not found in profiles`,
      });
    } else if (!pctMatch) {
      issues.push({
        section: 'IB Relationships',
        severity: 'MEDIUM',
        item: `${rel.investor} -> ${rel.ib}`,
        detail: `IB percentage mismatch: expected=${rel.pct}% actual=${actualPcts}%`,
      });
    }
  }

  // =============================
  // 2. INVESTOR BALANCE COMPARISON
  // =============================
  console.log('Section 2: Investor balance comparison...');

  // Use COMPARISON_MONTH as cutoff (our seed data covers through Jan 2026)
  const latestMonthByFund = {};
  for (const entry of fundBalancesData) {
    if (entry.month <= COMPARISON_MONTH) {
      if (!latestMonthByFund[entry.fund] || entry.month > latestMonthByFund[entry.fund]) {
        latestMonthByFund[entry.fund] = entry.month;
      }
    }
  }
  console.log('Latest months in fund-balances.json:', latestMonthByFund);

  // Get platform investor positions
  const { data: positions, error: posErr } = await supabase
    .from('investor_positions')
    .select(`
      investor_id, fund_id, current_value, cost_basis, shares, is_active,
      profiles:investor_id (first_name, last_name, email, account_type)
    `)
    .eq('is_active', true);

  if (posErr) throw new Error('Failed to fetch investor_positions: ' + posErr.message);

  // Build platform position map: (investor_name_normalized, fund) -> current_value
  // We'll use a fuzzy name match approach
  const platformPositions = {};
  for (const pos of positions) {
    const fund = fundIdToName[pos.fund_id];
    if (!fund) continue;
    const profile = pos.profiles;
    if (!profile) continue;
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const nameKey = normalizeName(name);
    const k = `${fund}|${nameKey}`;
    if (!platformPositions[k]) platformPositions[k] = { name, fund, positions: [] };
    platformPositions[k].positions.push({ ...pos, fund, investorName: name });
  }

  // Get the latest month's balances from fund-balances.json per fund
  const excelLatestBalances = {};
  for (const entry of fundBalancesData) {
    const latestMonth = latestMonthByFund[entry.fund];
    if (entry.month !== latestMonth) continue;
    const fund = entry.fund;
    let nameKey = normalizeName(entry.investor);
    // Apply aliases
    if (NAME_ALIASES[nameKey]) nameKey = NAME_ALIASES[nameKey];
    const k = `${fund}|${nameKey}`;
    if (!excelLatestBalances[k]) {
      excelLatestBalances[k] = { fund, investor: entry.investor, balances: [] };
    }
    excelLatestBalances[k].balances.push(entry.balance);
  }

  // Also gather all-time final balances (take the last balance for each investor in the latest month)
  const balanceRows = [];
  let balanceFails = 0;
  let balancePasses = 0;

  // Compare using latest available month
  const allBalanceKeys = new Set([
    ...Object.keys(excelLatestBalances),
    ...Object.keys(platformPositions),
  ]);

  for (const key of [...allBalanceKeys].sort()) {
    const [fund, nameKey] = key.split('|');
    const excel = excelLatestBalances[key];
    const platform = platformPositions[key];

    // Platform balance
    const platformBalance = platform ? platform.positions.reduce((s, p) => s + num(p.current_value), 0) : null;

    // Excel balance: find the entry closest to platform balance (since seed data may not cover
    // full month, multiple snapshots exist per month, and we need the one matching our seed cutoff)
    let excelBalance = null;
    if (excel && platformBalance !== null) {
      let bestDiff = Infinity;
      for (const b of excel.balances) {
        const diff = Math.abs(b - platformBalance);
        if (diff < bestDiff) {
          bestDiff = diff;
          excelBalance = b;
        }
      }
    } else if (excel) {
      // No platform balance - use last Excel entry
      excelBalance = excel.balances[excel.balances.length - 1];
    }

    if (excelBalance === null && platformBalance === null) continue;

    const vp = (excelBalance !== null && platformBalance !== null)
      ? varPct(excelBalance, platformBalance)
      : null;

    const pass = vp !== null ? passFailBalance(vp) : 'N/A';
    const investorName = excel ? excel.investor : (platform ? platform.name : nameKey);

    if (pass === 'FAIL') {
      balanceFails++;
      issues.push({
        section: 'Investor Balance',
        severity: 'HIGH',
        item: `${investorName} ${fund}`,
        detail: `Excel balance=${fmt(excelBalance)} Platform=${fmt(platformBalance)} variance=${fmtPct(vp)} (latest month: ${latestMonthByFund[fund]})`,
      });
    } else if (pass === 'PASS') {
      balancePasses++;
    }

    balanceRows.push({
      investor: investorName,
      fund,
      excelBalance,
      platformBalance,
      diff: (excelBalance !== null && platformBalance !== null) ? platformBalance - excelBalance : null,
      varPct: vp,
      pass,
    });
  }

  // =============================
  // BUILD REPORT
  // =============================
  console.log('Building report...');

  const now = new Date().toISOString();
  const report = [];

  report.push(`# Excel vs Platform Comparison Report`);
  report.push(`Generated: ${now}`);
  report.push('');

  // --- Executive Summary ---
  report.push('## Executive Summary');
  report.push('');
  report.push(`| Metric | Value |`);
  report.push(`|--------|-------|`);
  report.push(`| Funds compared | ${Object.keys(FUND_IDS).length} (BTC, ETH, SOL, USDT, XRP) |`);
  report.push(`| Excel performance entries | ${performanceData.length} |`);
  report.push(`| Excel fund/month pairs (with yield) | ${Object.values(excelByFundMonth).filter(e => e.totalGrossYield > 0).length} |`);
  report.push(`| Platform distributions (non-voided) | ${allDists.length} |`);
  report.push(`| Platform distributions matched | ${fundYieldRows.filter(r => r.grossPass !== 'N/A').length} |`);
  report.push(`| Excel investor balance entries | ${fundBalancesData.length} |`);
  report.push(`| Platform active positions | ${positions.length} |`);
  report.push(`| Fee allocations audited | ${feeAllocs.length} |`);
  report.push(`| IB allocations audited (yield_allocs w/ IB) | ${ibRows.length} |`);
  report.push(`| Conservation checks | ${allDists.length} |`);
  report.push(`| Conservation fails | ${conservationFails} |`);
  report.push(`| Fund yield PASSes | ${fundYieldRows.filter(r => r.grossPass === 'PASS').length} |`);
  report.push(`| Fund yield FAILs | ${fundYieldRows.filter(r => r.grossPass === 'FAIL').length} |`);
  report.push(`| Balance PASSes | ${balancePasses} |`);
  report.push(`| Balance FAILs | ${balanceFails} |`);
  report.push(`| Fee audit fails | ${feeFails} |`);
  report.push(`| IB audit fails | ${ibFails} |`);
  report.push(`| Total issues | ${issues.length} |`);
  report.push('');

  // --- Overall Verdict ---
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
  const highIssues = issues.filter(i => i.severity === 'HIGH').length;
  const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length;

  let verdict, confidence;
  if (criticalIssues === 0 && highIssues === 0) {
    verdict = 'MATCH';
    confidence = 95;
  } else if (criticalIssues === 0 && highIssues <= 3) {
    verdict = 'PARTIAL MATCH';
    confidence = 75;
  } else if (criticalIssues <= 2 && highIssues <= 10) {
    verdict = 'PARTIAL MATCH';
    confidence = 50;
  } else {
    verdict = 'MISMATCH';
    confidence = 20;
  }

  report.push(`## Overall Verdict: ${verdict} (Confidence: ${confidence}%)`);
  report.push('');
  report.push(`- CRITICAL issues: ${criticalIssues}`);
  report.push(`- HIGH issues: ${highIssues}`);
  report.push(`- MEDIUM issues: ${mediumIssues}`);
  report.push('');

  // --- Section 1: Fund-Level Yield ---
  report.push('---');
  report.push('## Section 1: Fund-Level Yield Comparison');
  report.push('');
  report.push('Tolerance: 1% variance flagged. Multi-segment months are aggregated.');
  report.push('Excel gross = openingAum * grossPct / 100. Platform = SUM of non-crystallization distributions per month.');
  report.push('');
  report.push('| Fund | Month | Segs | Dists | Excel Gross | Plat Gross | Gross Var% | Excel Net | Plat Net | Net Var% | Excel Fee | Plat Fee | Plat IB | PASS |');
  report.push('|------|-------|------|-------|-------------|-----------|-----------|----------|---------|---------|---------|---------|---------|------|');

  for (const row of fundYieldRows) {
    const gv = row.grossVarPct !== null ? fmtPct(row.grossVarPct) : 'N/A';
    const nv = row.netVarPct !== null ? fmtPct(row.netVarPct) : 'N/A';
    report.push(`| ${row.fund} | ${row.month} | ${row.entries} | ${row.platCount} | ${fmt(row.excelGross)} | ${fmt(row.platGross)} | ${gv} | ${fmt(row.excelNet)} | ${fmt(row.platNet)} | ${nv} | ${fmt(row.excelFee)} | ${fmt(row.platFee)} | ${fmt(row.platIB)} | ${row.grossPass} |`);
  }
  report.push('');

  // --- Section 2: Investor Balance Comparison ---
  report.push('---');
  report.push('## Section 2: Investor Balance Comparison');
  report.push('');
  report.push(`Comparing Excel fund-balances.json (latest month per fund) vs platform investor_positions.current_value.`);
  report.push(`Latest months: ${JSON.stringify(latestMonthByFund)}`);
  report.push(`Tolerance: ${BALANCE_VARIANCE_THRESHOLD_PCT}% variance flagged.`);
  report.push('');
  report.push('| Investor | Fund | Excel Balance | Platform Balance | Diff | Variance% | PASS |');
  report.push('|----------|------|--------------|-----------------|------|----------|------|');

  for (const row of balanceRows.sort((a, b) => a.fund.localeCompare(b.fund) || a.investor.localeCompare(b.investor))) {
    const eb = row.excelBalance !== null ? fmt(row.excelBalance) : 'NOT IN EXCEL';
    const pb = row.platformBalance !== null ? fmt(row.platformBalance) : 'NOT IN PLATFORM';
    const diff = row.diff !== null ? fmt(row.diff) : 'N/A';
    const vp = row.varPct !== null ? fmtPct(row.varPct) : 'N/A';
    report.push(`| ${row.investor} | ${row.fund} | ${eb} | ${pb} | ${diff} | ${vp} | ${row.pass} |`);
  }
  report.push('');

  // --- Section 3: Fee Audit ---
  report.push('---');
  report.push('## Section 3: Fee Audit');
  report.push('');
  report.push(`Auditing ${feeAllocs.length} fee allocations. Expected: fee_amount = gross_yield * fee_percentage / 100 (tolerance: ${DUST_TOLERANCE}).`);
  report.push('');

  // Summarize by investor
  const feeSummary = {};
  for (const row of feeRows) {
    const k = `${row.investor}|${row.fund}`;
    if (!feeSummary[k]) feeSummary[k] = { investor: row.investor, fund: row.fund, count: 0, fails: 0, totalExpected: 0, totalActual: 0, feePcts: new Set() };
    feeSummary[k].count++;
    if (!row.pass) feeSummary[k].fails++;
    feeSummary[k].totalExpected += row.expectedFee;
    feeSummary[k].totalActual += row.actualFee;
    feeSummary[k].feePcts.add(row.feePct);
  }

  report.push('### Fee Summary by Investor+Fund');
  report.push('');
  report.push('| Investor | Fund | Distributions | Fails | Fee%s | Total Expected | Total Actual | Diff | Status |');
  report.push('|----------|------|--------------|-------|------|---------------|-------------|------|--------|');
  for (const s of Object.values(feeSummary).sort((a, b) => a.fund.localeCompare(b.fund) || a.investor.localeCompare(b.investor))) {
    const diff = s.totalActual - s.totalExpected;
    const status = s.fails === 0 ? 'PASS' : `FAIL (${s.fails})`;
    report.push(`| ${s.investor} | ${s.fund} | ${s.count} | ${s.fails} | ${[...s.feePcts].join(',')}% | ${fmt(s.totalExpected)} | ${fmt(s.totalActual)} | ${fmt(diff)} | ${status} |`);
  }
  report.push('');

  // Detailed fee rows (only fails + first few passes)
  const failFees = feeRows.filter(r => !r.pass);
  if (failFees.length > 0) {
    report.push('### Fee Failures (detail)');
    report.push('');
    report.push('| Investor | Fund | Period | Fee% | Gross Yield | Expected Fee | Actual Fee | Diff |');
    report.push('|----------|------|--------|------|------------|-------------|-----------|------|');
    for (const row of failFees) {
      report.push(`| ${row.investor} | ${row.fund} | ${row.period_end} | ${row.feePct}% | ${fmt(row.grossYield)} | ${fmt(row.expectedFee)} | ${fmt(row.actualFee)} | ${row.diff.toExponential(4)} |`);
    }
    report.push('');
  }

  // --- Section 4: IB Commission Audit ---
  report.push('---');
  report.push('## Section 4: IB Commission Audit');
  report.push('');
  report.push(`Auditing ${ibRows.length} yield_allocations with IB commission (ib_pct > 0). Expected: ib_amount = gross_yield * ib_pct / 100 (from GROSS).`);
  report.push('');

  report.push('### Expected IB Relationships');
  report.push('');
  report.push('| Investor | IB Recipient | Expected % | Actual % | Found | Pct Match |');
  report.push('|----------|-------------|-----------|---------|-------|----------|');
  for (const rel of ibRelationshipCheck) {
    report.push(`| ${rel.investor} | ${rel.ib} | ${rel.expectedPct}% | ${rel.actualPcts} | ${rel.found ? 'YES' : 'NO'} | ${rel.found ? (rel.pctMatch ? 'YES' : 'NO') : 'N/A'} |`);
  }
  report.push('');

  // IB summary by relationship
  const ibSummary = {};
  for (const row of ibRows) {
    const k = `${row.source}|${row.ib}|${row.fund}`;
    if (!ibSummary[k]) ibSummary[k] = { source: row.source, ib: row.ib, fund: row.fund, count: 0, fails: 0, totalExpected: 0, totalActual: 0, ibPct: row.ibPct };
    ibSummary[k].count++;
    if (!row.pass) ibSummary[k].fails++;
    ibSummary[k].totalExpected += row.expectedIB;
    ibSummary[k].totalActual += row.actualIB;
  }

  report.push('### IB Summary by Relationship+Fund');
  report.push('');
  report.push('| Source Investor | IB Recipient | Fund | Distributions | Fails | IB% | Total Expected | Total Actual | Diff | Status |');
  report.push('|----------------|-------------|------|--------------|-------|-----|---------------|-------------|------|--------|');
  for (const s of Object.values(ibSummary).sort((a, b) => a.fund.localeCompare(b.fund) || a.source.localeCompare(b.source))) {
    const diff = s.totalActual - s.totalExpected;
    const status = s.fails === 0 ? 'PASS' : `FAIL (${s.fails})`;
    report.push(`| ${s.source} | ${s.ib} | ${s.fund} | ${s.count} | ${s.fails} | ${s.ibPct}% | ${fmt(s.totalExpected)} | ${fmt(s.totalActual)} | ${fmt(diff)} | ${status} |`);
  }
  report.push('');

  const failIBs = ibRows.filter(r => !r.pass);
  if (failIBs.length > 0) {
    report.push('### IB Failures (detail)');
    report.push('');
    report.push('| Source | IB | Fund | Period | IB% | Gross Yield | Expected IB | Actual IB | Diff |');
    report.push('|--------|-----|------|--------|-----|------------|------------|---------|------|');
    for (const row of failIBs) {
      report.push(`| ${row.source} | ${row.ib} | ${row.fund} | ${row.period_end} | ${row.ibPct}% | ${fmt(row.grossYield)} | ${fmt(row.expectedIB)} | ${fmt(row.actualIB)} | ${row.diff.toExponential(4)} |`);
    }
    report.push('');
  }

  // --- Section 5: Conservation Identity ---
  report.push('---');
  report.push('## Section 5: Conservation Identity Audit');
  report.push('');
  report.push(`All ${allDists.length} non-voided distributions checked. Identity: gross = net + fee + ib + dust (tolerance: 1e-8).`);
  report.push('');

  const conservationFailing = conservationRows.filter(r => !r.pass);
  if (conservationFailing.length === 0) {
    report.push('ALL DISTRIBUTIONS PASS conservation identity check.');
    report.push('');
  } else {
    report.push(`${conservationFailing.length} distributions fail conservation identity:`);
    report.push('');
    report.push('| Dist ID | Fund | Period End | Gross | Net | Fee | IB | Dust | Residual | PASS |');
    report.push('|---------|------|-----------|-------|-----|-----|-----|------|---------|------|');
    for (const row of conservationFailing) {
      report.push(`| ${row.id} | ${row.fund} | ${row.period_end} | ${fmt(row.gross)} | ${fmt(row.net)} | ${fmt(row.fee)} | ${fmt(row.ib)} | ${fmt(row.dust)} | ${row.residual.toExponential(4)} | FAIL |`);
    }
    report.push('');
  }

  // Pass summary
  const conservationPasses = conservationRows.filter(r => r.pass).length;
  report.push(`Conservation summary: ${conservationPasses} PASS, ${conservationFailing.length} FAIL out of ${conservationRows.length} distributions.`);
  report.push('');

  // --- Issues List ---
  report.push('---');
  report.push('## Issues List');
  report.push('');

  if (issues.length === 0) {
    report.push('No issues found. All checks pass.');
  } else {
    const bySeverity = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
    for (const issue of issues) {
      (bySeverity[issue.severity] || bySeverity.LOW).push(issue);
    }

    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
      const list = bySeverity[severity];
      if (list.length === 0) continue;
      report.push(`### ${severity} (${list.length})`);
      report.push('');
      for (const issue of list) {
        report.push(`- **[${issue.section}]** ${issue.item}: ${issue.detail}`);
      }
      report.push('');
    }
  }

  // --- Appendix: Platform Distribution Types ---
  report.push('---');
  report.push('## Appendix: Platform Distribution Types');
  report.push('');
  const distTypeCount = {};
  for (const d of allDists) {
    const t = d.distribution_type || 'NULL';
    distTypeCount[t] = (distTypeCount[t] || 0) + 1;
  }
  report.push('| Distribution Type | Count |');
  report.push('|-----------------|-------|');
  for (const [t, c] of Object.entries(distTypeCount)) {
    report.push(`| ${t} | ${c} |`);
  }
  report.push('');

  // Fund breakdown
  const fundDistCount = {};
  for (const d of allDists) {
    const f = fundIdToName[d.fund_id] || '?';
    fundDistCount[f] = (fundDistCount[f] || 0) + 1;
  }
  report.push('| Fund | Distributions |');
  report.push('|------|--------------|');
  for (const [f, c] of Object.entries(fundDistCount)) {
    report.push(`| ${f} | ${c} |`);
  }
  report.push('');

  // Write report
  const reportPath = '/tmp/excel-platform-comparison-report.md';
  writeFileSync(reportPath, report.join('\n'));
  console.log(`\nReport written to: ${reportPath}`);
  console.log(`\nVerdict: ${verdict} (Confidence: ${confidence}%)`);
  console.log(`Issues: ${criticalIssues} CRITICAL, ${highIssues} HIGH, ${mediumIssues} MEDIUM`);
  console.log(`Fund yield: ${fundYieldRows.filter(r => r.grossPass === 'PASS').length} PASS, ${fundYieldRows.filter(r => r.grossPass === 'FAIL').length} FAIL`);
  console.log(`Investor balances: ${balancePasses} PASS, ${balanceFails} FAIL`);
  console.log(`Conservation: ${conservationPasses} PASS, ${conservationFailing.length} FAIL`);
  console.log(`Fee audit: ${feeAllocs.length - feeFails} PASS, ${feeFails} FAIL`);
  console.log(`IB audit: ${ibRows.length - ibFails} PASS, ${ibFails} FAIL`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
